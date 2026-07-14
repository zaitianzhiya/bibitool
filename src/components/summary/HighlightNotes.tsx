"use client"

// HighlightNotes — select and save key passages from AI summary
// Stores highlights in localStorage (MVP — no backend needed)

import { useState, useEffect, useCallback } from "react"

interface Highlight {
  id: string
  text: string
  timestamp?: string
  createdAt: number
}

const STORAGE_KEY = "bibitool-highlights"

function loadHighlights(): Highlight[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHighlights(highlights: Highlight[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(highlights))
  } catch {
    // localStorage full or unavailable
  }
}

export function useHighlights() {
  const [highlights, setHighlights] = useState<Highlight[]>([])

  useEffect(() => {
    setHighlights(loadHighlights())
  }, [])

  const addHighlight = useCallback(
    (text: string, timestamp?: string) => {
      const newHighlight: Highlight = {
        id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text: text.trim(),
        timestamp,
        createdAt: Date.now(),
      }
      const updated = [newHighlight, ...highlights]
      setHighlights(updated)
      saveHighlights(updated)
      return newHighlight
    },
    [highlights]
  )

  const removeHighlight = useCallback(
    (id: string) => {
      const updated = highlights.filter((h) => h.id !== id)
      setHighlights(updated)
      saveHighlights(updated)
    },
    [highlights]
  )

  const clearAll = useCallback(() => {
    setHighlights([])
    saveHighlights([])
  }, [])

  return { highlights, addHighlight, removeHighlight, clearAll }
}

export function HighlightPanel({
  highlights,
  onRemove,
  onClearAll,
}: {
  highlights: Highlight[]
  onRemove: (id: string) => void
  onClearAll: () => void
}) {
  if (highlights.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-zinc-200 bg-white text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-center">
          <div className="text-2xl mb-2">💡</div>
          <p>选中总结中的段落，点击高亮按钮添加笔记</p>
        </div>
      </div>
    )
  }

  const handleCopyAll = () => {
    const text = highlights
      .map((h) => `${h.timestamp ? `[${h.timestamp}] ` : ""}${h.text}`)
      .join("\n\n")
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          高光笔记 ({highlights.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleCopyAll}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            复制全部
          </button>
          <button
            onClick={onClearAll}
            className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
          >
            清空
          </button>
        </div>
      </div>
      <div className="divide-y divide-zinc-50 dark:divide-zinc-900 max-h-80 overflow-y-auto">
        {highlights.map((hl) => (
          <div key={hl.id} className="group px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed flex-1">
                {hl.timestamp && (
                  <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-xs font-mono text-blue-600 mr-2 dark:bg-blue-950 dark:text-blue-400">
                    {hl.timestamp}
                  </span>
                )}
                {hl.text}
              </p>
              <button
                onClick={() => onRemove(hl.id)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-xs text-zinc-400 hover:text-red-500 transition-all"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
