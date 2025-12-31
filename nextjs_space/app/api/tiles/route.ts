export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

// GET /api/tiles - Fetch all tiles for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)

    const tiles = await prisma.tile.findMany({
      where: {
        userId: session.user.id,
        ...(search ? {
          OR: [
            { rawInput: { path: ['objective'], string_contains: search } },
            { tileJson: { path: ['objective'], string_contains: search } },
          ]
        } : {}),
        ...(tags && tags.length > 0 ? {
          tags: { hasSome: tags }
        } : {})
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(tiles)
  } catch (error) {
    console.error('Get tiles error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tiles' },
      { status: 500 }
    )
  }
}

// POST /api/tiles - Create a new tile
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { mode, rawInput, tileJson, tags } = body

    if (!mode || !rawInput || !tileJson) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const tile = await prisma.tile.create({
      data: {
        userId: session.user.id,
        mode,
        rawInput,
        tileJson,
        tags: tags || []
      }
    })

    return NextResponse.json(tile, { status: 201 })
  } catch (error) {
    console.error('Create tile error:', error)
    return NextResponse.json(
      { error: 'Failed to create tile' },
      { status: 500 }
    )
  }
}
