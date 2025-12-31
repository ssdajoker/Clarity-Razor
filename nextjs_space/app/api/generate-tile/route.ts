export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import { getFileUrl, deleteFile } from '@/lib/s3'
import { decryptFileBuffer } from '@/lib/crypto-utils'

const SYSTEM_MESSAGE = `You are Lead Falchion. Your task is to transform messy user input into a structured Clarity Tile.

Output ONLY valid JSON matching this exact schema:
{
  "objective": "string (clear, concise statement)",
  "constraints": ["string", "string", ...],
  "deletion_pass": ["string (what to eliminate)", ...],
  "five_step_flow": ["step 1", "step 2", "step 3", "step 4", "step 5"],
  "single_next_action": "string (must be doable in <30 minutes)",
  "metrics": ["metric 1", "metric 2", ...],
  "feedback_loop": "string (how to measure progress)",
  "assumptions": ["assumption 1", ...],
  "followup_questions": ["question 1", "question 2"]
}

RULES:
- Be concise and actionable
- five_step_flow must have EXACTLY 5 items, no more, no less
- metrics must have 2-5 items
- followup_questions must have at most 2 items
- single_next_action must be completable in under 30 minutes
- Output ONLY the JSON, no additional prose or markdown
- Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { objective, constraints, context_dump, mode, fileIds = [], encryptionPassword = null } = body

    if (!objective) {
      return NextResponse.json(
        { error: 'Objective is required' },
        { status: 400 }
      )
    }

    // Process uploaded files if any
    let filesContext = ''
    const messages: any[] = [{ role: 'system', content: SYSTEM_MESSAGE }]
    const filesToDelete: string[] = []
    
    if (fileIds.length > 0) {
      const files = await prisma.file.findMany({
        where: { id: { in: fileIds } }
      })

      for (const file of files) {
        // Track files for deletion if needed
        if (file.deleteAfterUse) {
          filesToDelete.push(file.id)
        }

        // Update access tracking
        await prisma.file.update({
          where: { id: file.id },
          data: {
            accessCount: { increment: 1 },
            lastAccessedAt: new Date(),
          },
        })

        // Create audit log
        await prisma.fileAuditLog.create({
          data: {
            fileId: file.id,
            userId: session.user.id || '',
            action: 'ACCESS',
            metadata: { context: 'tile_generation' },
            ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
            userAgent: request.headers.get("user-agent") || "unknown",
          },
        })

        const fileUrl = await getFileUrl(file.cloud_storage_path, file.isPublic)
        let fileBuffer: ArrayBuffer | null = null
        
        try {
          const fileResponse = await fetch(fileUrl)
          let fetchedBuffer = await fileResponse.arrayBuffer()

          // Decrypt if encrypted
          if (file.encrypted && encryptionPassword && file.encryptionKey) {
            try {
              const encryptionMetadata = JSON.parse(file.encryptionKey)
              fetchedBuffer = await decryptFileBuffer(
                fetchedBuffer,
                encryptionPassword,
                encryptionMetadata.salt,
                encryptionMetadata.iv
              )
              filesContext += `\n\n🔓 File: ${file.originalName} (Decrypted)`
            } catch (decryptError) {
              console.error(`Decryption failed for ${file.originalName}:`, decryptError)
              filesContext += `\n\n❌ File: ${file.originalName} (Decryption failed - wrong password?)`
              continue
            }
          }

          fileBuffer = fetchedBuffer

          // Handle PDFs - send as base64 to LLM
          if (file.mimeType === 'application/pdf') {
            const base64 = Buffer.from(fileBuffer).toString('base64')
            filesContext += `\n\nFile: ${file.originalName} (PDF)`
            messages.push({
              role: 'user',
              content: [
                {
                  type: 'file',
                  content_type: 'application/pdf',
                  data: base64
                }
              ]
            })
          }
          // Handle images - send to LLM
          else if (file.mimeType.startsWith('image/')) {
            filesContext += `\n\nFile: ${file.originalName} (Image)`
            // For encrypted images, we'd need to convert buffer to base64
            if (file.encrypted) {
              const base64 = Buffer.from(fileBuffer).toString('base64')
              messages.push({
                role: 'user',
                content: [
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${file.mimeType};base64,${base64}`
                    }
                  }
                ]
              })
            } else {
              messages.push({
                role: 'user',
                content: [
                  {
                    type: 'image_url',
                    image_url: {
                      url: fileUrl
                    }
                  }
                ]
              })
            }
          }
          // Handle text files - download and include content
          else if (file.mimeType.startsWith('text/') || 
                   file.mimeType.includes('json') || 
                   file.mimeType.includes('javascript') ||
                   file.mimeType.includes('typescript') ||
                   file.mimeType.includes('python') ||
                   file.mimeType.includes('xml') ||
                   file.mimeType.includes('html')) {
            const textContent = new TextDecoder().decode(fileBuffer)
            filesContext += `\n\nFile: ${file.originalName}\nContent:\n${textContent.slice(0, 10000)}\n`
          }
          // For other file types, just include metadata
          else {
            filesContext += `\n\nFile: ${file.originalName} (${file.mimeType}) - ${(file.fileSize / 1024).toFixed(2)} KB`
          }
        } catch (error) {
          console.error(`Error processing file ${file.originalName}:`, error)
          filesContext += `\n\n❌ File: ${file.originalName} (Processing failed)`
        }
      }
    }

    // Construct user message
    const userMessage = `Mode: ${mode || 'Razor'}

Objective: ${objective}

Constraints:
${constraints || 'None specified'}

Context:
${context_dump || 'None specified'}
${filesContext}

Please analyze this and create a structured Clarity Tile following the JSON schema provided.`
    
    messages.push({ role: 'user', content: userMessage })

    // Call LLM API with streaming
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: messages,
        response_format: { type: 'json_object' },
        stream: true,
        max_tokens: 3000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`)
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        const encoder = new TextEncoder()
        let buffer = ''
        let partialRead = ''

        try {
          while (true) {
            const { done, value } = await reader!.read()
            if (done) break

            partialRead += decoder.decode(value, { stream: true })
            let lines = partialRead.split('\n')
            partialRead = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  // Parse the final JSON
                  try {
                    const finalResult = JSON.parse(buffer)
                    
                    // Validate the structure
                    if (!finalResult?.objective || !finalResult?.single_next_action) {
                      throw new Error('Invalid JSON structure')
                    }
                    
                    // Ensure five_step_flow has exactly 5 items
                    if (!Array.isArray(finalResult?.five_step_flow) || finalResult.five_step_flow.length !== 5) {
                      // Try to fix it
                      if (Array.isArray(finalResult?.five_step_flow)) {
                        if (finalResult.five_step_flow.length > 5) {
                          finalResult.five_step_flow = finalResult.five_step_flow.slice(0, 5)
                        } else {
                          while (finalResult.five_step_flow.length < 5) {
                            finalResult.five_step_flow.push(`Step ${finalResult.five_step_flow.length + 1}`)
                          }
                        }
                      } else {
                        finalResult.five_step_flow = ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5']
                      }
                    }
                    
                    // Ensure metrics has 2-5 items
                    if (!Array.isArray(finalResult?.metrics) || finalResult.metrics.length < 2 || finalResult.metrics.length > 5) {
                      if (Array.isArray(finalResult?.metrics)) {
                        if (finalResult.metrics.length > 5) {
                          finalResult.metrics = finalResult.metrics.slice(0, 5)
                        } else if (finalResult.metrics.length < 2) {
                          finalResult.metrics = [...(finalResult.metrics || []), 'Progress', 'Quality']
                        }
                      } else {
                        finalResult.metrics = ['Progress', 'Quality']
                      }
                    }
                    
                    // Ensure followup_questions has at most 2 items
                    if (Array.isArray(finalResult?.followup_questions) && finalResult.followup_questions.length > 2) {
                      finalResult.followup_questions = finalResult.followup_questions.slice(0, 2)
                    }

                    const finalData = JSON.stringify({
                      status: 'completed',
                      result: finalResult
                    })
                    controller.enqueue(encoder.encode(`data: ${finalData}\n\n`))
                    
                    // Delete files marked for ephemeral deletion
                    if (filesToDelete.length > 0) {
                      try {
                        for (const fileId of filesToDelete) {
                          const file = await prisma.file.findUnique({ where: { id: fileId } })
                          if (file) {
                            // Delete from S3
                            await deleteFile(file.cloud_storage_path)
                            
                            // Create audit log
                            await prisma.fileAuditLog.create({
                              data: {
                                fileId: file.id,
                                userId: session.user?.id || '',
                                action: 'DELETE',
                                metadata: { reason: 'ephemeral_deletion_after_processing' },
                                ipAddress: request.headers.get("x-forwarded-for") || "unknown",
                                userAgent: request.headers.get("user-agent") || "unknown",
                              },
                            })
                            
                            // Delete from database
                            await prisma.file.delete({ where: { id: fileId } })
                          }
                        }
                        console.log(`Deleted ${filesToDelete.length} ephemeral file(s)`)
                      } catch (deleteError) {
                        console.error('Error deleting ephemeral files:', deleteError)
                      }
                    }
                  } catch (parseError) {
                    console.error('JSON parse error:', parseError)
                    const errorData = JSON.stringify({
                      status: 'error',
                      message: 'Failed to parse LLM response'
                    })
                    controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
                  }
                  return
                }

                try {
                  const parsed = JSON.parse(data)
                  buffer += parsed.choices?.[0]?.delta?.content || ''
                  
                  // Send progress update
                  const progressData = JSON.stringify({
                    status: 'processing',
                    message: 'Generating clarity tile...'
                  })
                  controller.enqueue(encoder.encode(`data: ${progressData}\n\n`))
                } catch (e) {
                  // Skip invalid JSON chunks
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error)
          const errorData = JSON.stringify({
            status: 'error',
            message: 'Stream processing failed'
          })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          controller.error(error)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Generate tile error:', error)
    return NextResponse.json(
      { error: 'Failed to generate tile' },
      { status: 500 }
    )
  }
}
