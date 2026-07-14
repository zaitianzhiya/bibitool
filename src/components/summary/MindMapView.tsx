"use client"

// MindMapView — interactive mindmap from Markdown headings
// Uses markmap to render hierarchical mind maps from summary markdown
// Auto-layout, zoom, drag, expand/collapse nodes

import { useEffect, useRef, useMemo } from "react"
import { Transformer } from "markmap-lib"
import { Markmap } from "markmap-view"

interface MindMapViewProps {
  content: string
}

/**
 * Extract heading hierarchy from Markdown content
 * Parses #, ##, ### headings into nested tree structure
 */
function extractTree(markdown: string) {
  const lines = markdown.split("\n")
  const root: { content: string; children: typeof root[] } = {
    content: "视频内容总结",
    children: [],
  }
  const stack = [{ level: 0, node: root }]

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)/)
    if (!match) continue

    const level = match[1].length
    const title = match[2]
      .replace(/\[.*?\]/, "")   // Remove timecode
      .replace(/\*\*(.+?)\*\*/g, "$1") // Remove bold markers
      .trim()

    if (!title) continue

    const node = { content: title, children: [] as typeof root["children"] }

    // Find the right parent
    while (stack.length > 1 && stack[stack.length - 1].level >= level) {
      stack.pop()
    }
    stack[stack.length - 1].node.children.push(node as never)
    stack.push({ level, node })
  }

  return root
}

export function MindMapView({ content }: MindMapViewProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const markmapRef = useRef<Markmap | null>(null)

  const tree = useMemo(() => {
    if (!content) return null
    try {
      const raw = extractTree(content)
      const transformer = new Transformer()
      const { root: data } = transformer.transform(
        JSON.stringify(raw)
      )
      return data
    } catch {
      return null
    }
  }, [content])

  useEffect(() => {
    if (!tree || !svgRef.current) return

    // Clean up previous instance
    if (markmapRef.current) {
      const el = svgRef.current
      while (el.firstChild) el.removeChild(el.firstChild)
    }

    try {
      markmapRef.current = Markmap.create(svgRef.current, {
        autoFit: true,
        fitRatio: 0.9,
        duration: 500,
      }, tree)
    } catch {
      // markmap initialization can fail in some environments
    }
  }, [tree])

  const handleExportPng = async () => {
    if (!svgRef.current) return
    const svg = svgRef.current
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    const rect = svg.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2

    const img = new Image()
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(blob)

    img.onload = () => {
      if (ctx) {
        ctx.scale(2, 2)
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
      }
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => {
        if (blob) {
          const pngUrl = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = pngUrl
          a.download = "mindmap.png"
          a.click()
          URL.revokeObjectURL(pngUrl)
        }
      }, "image/png")
    }
    img.src = url
  }

  if (!content) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-zinc-200 bg-white text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950">
        暂无内容，请先生成 AI 总结
      </div>
    )
  }

  return (
    <div className="relative rounded-xl border border-zinc-200 bg-white overflow-hidden dark:border-zinc-800 dark:bg-zinc-950">
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <button
          onClick={handleExportPng}
          className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
          title="导出 PNG"
        >
          📸 导出 PNG
        </button>
      </div>
      <svg
        ref={svgRef}
        className="h-[500px] w-full"
        style={{ background: "transparent" }}
      />
    </div>
  )
}
