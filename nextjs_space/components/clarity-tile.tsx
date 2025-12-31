'use client'

import { Clock, Target, ListChecks, TrendingUp, RefreshCw, HelpCircle, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { ClarityTile as ClarityTileType } from '@/lib/export-utils'

interface ClarityTileProps {
  tile: ClarityTileType | null
  onStartAction?: () => void
  loading?: boolean
}

export function ClarityTile({ tile, onStartAction, loading }: ClarityTileProps) {
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-700 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating Clarity Tile...</p>
        </div>
      </div>
    )
  }

  if (!tile) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center max-w-md">
          <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-2">No tile generated yet</p>
          <p className="text-gray-500 text-sm">Fill in the form and click Generate to create your Clarity Tile</p>
        </div>
      </div>
    )
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="h-full overflow-y-auto p-6 bg-white rounded-lg shadow-sm space-y-6"
    >
      {/* Objective */}
      <motion.div variants={itemVariants} className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <Target className="h-6 w-6 text-blue-700 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Objective</h3>
            <p className="text-gray-800">{tile?.objective || 'No objective specified'}</p>
          </div>
        </div>
      </motion.div>

      {/* Constraints */}
      {tile?.constraints && tile.constraints.length > 0 && (
        <motion.div variants={itemVariants} className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-gray-700 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Constraints</h3>
              <ul className="space-y-1">
                {tile.constraints.map((constraint: string, i: number) => (
                  <li key={i} className="text-gray-700 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{constraint}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Deletion Pass */}
      {tile?.deletion_pass && tile.deletion_pass.length > 0 && (
        <motion.div variants={itemVariants} className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <ListChecks className="h-6 w-6 text-red-700 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Deletion Pass</h3>
              <ul className="space-y-1">
                {tile.deletion_pass.map((item: string, i: number) => (
                  <li key={i} className="text-gray-700 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* 5-Step Flow */}
      <motion.div variants={itemVariants} className="bg-green-50 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <ListChecks className="h-6 w-6 text-green-700 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-green-900 mb-2">5-Step Flow</h3>
            <ol className="space-y-2">
              {tile?.five_step_flow?.map((step: string, i: number) => (
                <li key={i} className="text-gray-700 flex items-start">
                  <span className="font-semibold mr-2 text-green-700">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              )) || <li className="text-gray-500">No steps defined</li>}
            </ol>
          </div>
        </div>
      </motion.div>

      {/* Single Next Action - Prominent */}
      <motion.div variants={itemVariants} className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-lg shadow-lg">
        <div className="text-white">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="h-7 w-7" />
            <h3 className="text-xl font-bold">Single Next Action</h3>
          </div>
          <p className="text-lg mb-4 text-blue-50">{tile?.single_next_action || 'No action specified'}</p>
          <button
            onClick={onStartAction}
            className="bg-white text-blue-700 font-semibold px-6 py-3 rounded-md hover:bg-blue-50 transition-colors"
          >
            Start Timer
          </button>
        </div>
      </motion.div>

      {/* Metrics */}
      {tile?.metrics && tile.metrics.length > 0 && (
        <motion.div variants={itemVariants} className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-6 w-6 text-purple-700 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-purple-900 mb-2">Metrics</h3>
              <ul className="space-y-1">
                {tile.metrics.map((metric: string, i: number) => (
                  <li key={i} className="text-gray-700 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{metric}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Feedback Loop */}
      {tile?.feedback_loop && (
        <motion.div variants={itemVariants} className="bg-amber-50 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <RefreshCw className="h-6 w-6 text-amber-700 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-amber-900 mb-2">Feedback Loop</h3>
              <p className="text-gray-700">{tile.feedback_loop}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Assumptions */}
      {tile?.assumptions && tile.assumptions.length > 0 && (
        <motion.div variants={itemVariants} className="bg-slate-50 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-slate-700 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Assumptions</h3>
              <ul className="space-y-1">
                {tile.assumptions.map((assumption: string, i: number) => (
                  <li key={i} className="text-gray-700 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{assumption}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Follow-up Questions */}
      {tile?.followup_questions && tile.followup_questions.length > 0 && (
        <motion.div variants={itemVariants} className="bg-indigo-50 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-6 w-6 text-indigo-700 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-indigo-900 mb-2">Follow-up Questions</h3>
              <ul className="space-y-1">
                {tile.followup_questions.map((question: string, i: number) => (
                  <li key={i} className="text-gray-700 flex items-start">
                    <span className="mr-2">{i + 1}.</span>
                    <span>{question}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
