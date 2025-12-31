'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Sword, LogOut, Loader2, Send, FileText, Download } from 'lucide-react'
import { ClarityTile } from '@/components/clarity-tile'
import { SessionTimer } from '@/components/session-timer'
import { TileVault } from '@/components/tile-vault'
import { FileUploader } from '@/components/file-uploader'
import { exportAsMarkdown, exportAsJSON, downloadFile } from '@/lib/export-utils'
import { UploadedFile } from '@/lib/types'

interface TileData {
  id: string
  createdAt: string
  mode: string
  rawInput: any
  tileJson: any
  tags: string[]
}

export default function DashboardPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()

  const [objective, setObjective] = useState('')
  const [constraints, setConstraints] = useState('')
  const [contextDump, setContextDump] = useState('')
  const [mode, setMode] = useState('Razor')
  const [currentTile, setCurrentTile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [timerRunning, setTimerRunning] = useState(false)
  const [tiles, setTiles] = useState<TileData[]>([])
  const [tilesLoading, setTilesLoading] = useState(true)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Fetch tiles
  const fetchTiles = async () => {
    try {
      setTilesLoading(true)
      const response = await fetch('/api/tiles')
      if (response.ok) {
        const data = await response.json()
        setTiles(data)
      }
    } catch (error) {
      console.error('Failed to fetch tiles:', error)
    } finally {
      setTilesLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTiles()
    }
  }, [status])

  const handleFilesUploaded = (newFiles: UploadedFile[]) => {
    setUploadedFiles((prev) => [...prev, ...newFiles])
  }

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setCurrentTile(null)

    try {
      const response = await fetch('/api/generate-tile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective,
          constraints,
          context_dump: contextDump,
          mode,
          fileIds: uploadedFiles.map((f) => f.id),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate tile')
      }

      // Stream the response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let partialRead = ''

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
              return
            }

            try {
              const parsed = JSON.parse(data)

              if (parsed?.status === 'completed') {
                setCurrentTile(parsed?.result)
                setLoading(false)

                // Save to database
                await fetch('/api/tiles', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    mode,
                    rawInput: { objective, constraints, context_dump: contextDump },
                    tileJson: parsed?.result,
                    tags: [],
                  }),
                })

                // Refresh tiles list
                fetchTiles()
                return
              } else if (parsed?.status === 'error') {
                throw new Error(parsed?.message || 'Generation failed')
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (err) {
      console.error('Generation error:', err)
      setError('Failed to generate tile. Please try again.')
      setLoading(false)
    }
  }

  const handleSelectTile = (tile: TileData) => {
    setCurrentTile(tile?.tileJson)
    setObjective(tile?.rawInput?.objective || '')
    setConstraints(tile?.rawInput?.constraints || '')
    setContextDump(tile?.rawInput?.context_dump || '')
    setMode(tile?.mode || 'Razor')
  }

  const handleDeleteTile = async (id: string) => {
    try {
      const response = await fetch(`/api/tiles/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchTiles()
        if (currentTile?.id === id) {
          setCurrentTile(null)
        }
      }
    } catch (error) {
      console.error('Failed to delete tile:', error)
    }
  }

  const handleExportCurrentMarkdown = () => {
    if (!currentTile) return
    const markdown = exportAsMarkdown(currentTile, mode)
    downloadFile(markdown, `clarity-tile-${Date.now()}.md`, 'text/markdown')
  }

  const handleExportCurrentJSON = () => {
    if (!currentTile) return
    const json = exportAsJSON(currentTile)
    downloadFile(json, `clarity-tile-${Date.now()}.json`, 'application/json')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Timer */}
      <SessionTimer isRunning={timerRunning} onStop={() => setTimerRunning(false)} />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sword className="h-8 w-8 text-blue-700" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Falchion Forge</h1>
              <p className="text-sm text-gray-600">Falchion-Clarity Tile</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, {session?.user?.name || session?.user?.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Left Panel - Input Form */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Clarity Tile</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label htmlFor="objective" className="block text-sm font-medium text-gray-700 mb-1">
                  Objective *
                </label>
                <input
                  id="objective"
                  type="text"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What do you want to accomplish?"
                />
              </div>

              <div>
                <label htmlFor="constraints" className="block text-sm font-medium text-gray-700 mb-1">
                  Constraints
                </label>
                <textarea
                  id="constraints"
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What are the limitations or boundaries?"
                />
              </div>

              <div>
                <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-1">
                  Context Dump
                </label>
                <textarea
                  id="context"
                  value={contextDump}
                  onChange={(e) => setContextDump(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any additional context or information..."
                />
              </div>

              <div>
                <label htmlFor="mode" className="block text-sm font-medium text-gray-700 mb-1">
                  Mode
                </label>
                <select
                  id="mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Razor">Razor</option>
                  <option value="Backcast">Backcast</option>
                  <option value="Drill">Drill</option>
                  <option value="Connection Hunt">Connection Hunt</option>
                  <option value="DeepAgent Task Spec">DeepAgent Task Spec</option>
                </select>
              </div>

              {/* File Uploader */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Files (Optional)
                </label>
                <FileUploader
                  onFilesUploaded={handleFilesUploaded}
                  uploadedFiles={uploadedFiles}
                  onRemoveFile={handleRemoveFile}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Generate Tile
                  </>
                )}
              </button>
            </form>

            {/* Export Buttons */}
            {currentTile && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Export Current Tile</h3>
                <div className="flex gap-3">
                  <button
                    onClick={handleExportCurrentMarkdown}
                    className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors flex items-center justify-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Markdown
                  </button>
                  <button
                    onClick={handleExportCurrentJSON}
                    className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    JSON
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Clarity Tile */}
          <div>
            <ClarityTile
              tile={currentTile}
              loading={loading}
              onStartAction={() => setTimerRunning(true)}
            />
          </div>
        </div>

        {/* Tile Vault */}
        <TileVault
          tiles={tiles}
          onSelectTile={handleSelectTile}
          onDeleteTile={handleDeleteTile}
          onRefresh={fetchTiles}
        />
      </main>
    </div>
  )
}
