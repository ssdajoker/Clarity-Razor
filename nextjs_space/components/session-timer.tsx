'use client'

import { useState, useEffect } from 'react'
import { Clock, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface SessionTimerProps {
  isRunning: boolean
  onStop: () => void
}

export function SessionTimer({ isRunning, onStop }: SessionTimerProps) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!isRunning) {
      setSeconds(0)
      return
    }

    const interval = setInterval(() => {
      setSeconds((s) => s + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning])

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  if (!isRunning) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 right-4 bg-blue-700 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50"
      >
        <Clock className="h-5 w-5 animate-pulse" />
        <span className="text-lg font-mono font-semibold">{formatTime(seconds)}</span>
        <button
          onClick={onStop}
          className="ml-2 hover:bg-blue-600 p-1 rounded transition-colors"
          aria-label="Stop timer"
        >
          <X className="h-5 w-5" />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
