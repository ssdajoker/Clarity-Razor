export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

// GET /api/tiles/[id] - Fetch a single tile
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tile = await prisma.tile.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!tile) {
      return NextResponse.json({ error: 'Tile not found' }, { status: 404 })
    }

    return NextResponse.json(tile)
  } catch (error) {
    console.error('Get tile error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tile' },
      { status: 500 }
    )
  }
}

// PATCH /api/tiles/[id] - Update a tile
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tags } = body

    const tile = await prisma.tile.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!tile) {
      return NextResponse.json({ error: 'Tile not found' }, { status: 404 })
    }

    const updatedTile = await prisma.tile.update({
      where: { id: params.id },
      data: { tags }
    })

    return NextResponse.json(updatedTile)
  } catch (error) {
    console.error('Update tile error:', error)
    return NextResponse.json(
      { error: 'Failed to update tile' },
      { status: 500 }
    )
  }
}

// DELETE /api/tiles/[id] - Delete a tile
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tile = await prisma.tile.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!tile) {
      return NextResponse.json({ error: 'Tile not found' }, { status: 404 })
    }

    await prisma.tile.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Tile deleted successfully' })
  } catch (error) {
    console.error('Delete tile error:', error)
    return NextResponse.json(
      { error: 'Failed to delete tile' },
      { status: 500 }
    )
  }
}
