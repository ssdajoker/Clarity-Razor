'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Tag, FileText, Download, Trash2, Calendar } from 'lucide-react'
import { exportAsMarkdown, exportAsJSON, downloadFile, ClarityTile } from '@/lib/export-utils'

interface TileData {
  id: string
  createdAt: string
  mode: string
  rawInput: any
  tileJson: any
  tags: string[]
}

interface TileVaultProps {
  tiles: TileData[]
  onSelectTile: (tile: TileData) => void
  onDeleteTile: (id: string) => void
  onRefresh: () => void
}

export function TileVault({ tiles, onSelectTile, onDeleteTile, onRefresh }: TileVaultProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Get all unique tags
  const allTags = Array.from(
    new Set(tiles?.flatMap((t) => t?.tags || []) || [])
  )

  // Filter tiles
  const filteredTiles = tiles?.filter((tile) => {
    const matchesSearch = searchTerm
      ? tile?.tileJson?.objective?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
        tile?.rawInput?.objective?.toLowerCase()?.includes(searchTerm.toLowerCase())
      : true

    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some((tag) => tile?.tags?.includes(tag))

    return matchesSearch && matchesTags
  }) || []

  const handleExportMarkdown = (tile: TileData, e: React.MouseEvent) => {
    e.stopPropagation()
    const markdown = exportAsMarkdown(tile?.tileJson, tile?.mode)
    downloadFile(
      markdown,
      `clarity-tile-${new Date(tile?.createdAt).toISOString().split('T')[0]}.md`,
      'text/markdown'
    )
  }

  const handleExportJSON = (tile: TileData, e: React.MouseEvent) => {
    e.stopPropagation()
    const json = exportAsJSON(tile?.tileJson)
    downloadFile(
      json,
      `clarity-tile-${new Date(tile?.createdAt).toISOString().split('T')[0]}.json`,
      'application/json'
    )
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this tile?')) {
      onDeleteTile(id)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <FileText className="h-6 w-6 text-blue-700" />
        Tile Vault
      </h2>

      {/* Search and Filter */}
      <div className="space-y-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tiles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Tag className="h-5 w-5 text-gray-400" />
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  if (selectedTags.includes(tag)) {
                    setSelectedTags(selectedTags.filter((t) => t !== tag))
                  } else {
                    setSelectedTags([...selectedTags, tag])
                  }
                }}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-700 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tiles List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredTiles.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {tiles?.length === 0 ? 'No tiles yet. Create your first one!' : 'No tiles match your search.'}
          </p>
        ) : (
          filteredTiles.map((tile, index) => (
            <motion.div
              key={tile?.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelectTile(tile)}
              className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors border border-gray-200 hover:border-blue-300 group"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                    {tile?.tileJson?.objective || 'Untitled Tile'}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(tile?.createdAt).toLocaleDateString()}
                    </span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium">
                      {tile?.mode}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleExportMarkdown(tile, e)}
                    className="p-2 hover:bg-blue-100 rounded transition-colors"
                    title="Export as Markdown"
                  >
                    <FileText className="h-4 w-4 text-blue-700" />
                  </button>
                  <button
                    onClick={(e) => handleExportJSON(tile, e)}
                    className="p-2 hover:bg-green-100 rounded transition-colors"
                    title="Export as JSON"
                  >
                    <Download className="h-4 w-4 text-green-700" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(tile?.id, e)}
                    className="p-2 hover:bg-red-100 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-red-700" />
                  </button>
                </div>
              </div>

              {/* Tags */}
              {tile?.tags && tile.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tile.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
