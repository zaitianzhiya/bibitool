"use client"

// SummaryView — renders AI summary with Markdown, chapter navigation, and typewriter effect
// Props: content text, streaming flag, videoInfo for timestamp links

import { useMemo, useRef, useEffect, createElement as h } from "react"
import { VideoInfo, Platform } from "@/types"

interface SummaryViewProps {
  content: string
  streaming: boolean
  videoInfo: VideoInfo
}

interface Chapter {
  title: string
  time?: number
  elementId: string
}

/**
 * Get base video URL for timestamp links
 */
function getVideoUrl(videoInfo: VideoInfo): string {
  switch (videoInfo.platform) {
    case Platform.Bilibili:
      return `https://www.bilibili.com/video/${videoInfo.videoId}`
    case Platform.YouTube:
      return `https://www.youtube.com/watch?v=${videoInfo.videoId}`
    default:
      return "#"
  }
}

/**
 * Parse Markdown-like text into JSX
 * Handles: headings, bold, lists, timecodes, links, paragraphs
 */
function parseMarkdownToJSX(
  text: string,
  videoUrl: string
): React.ReactNode[] {
  const lines = text.split("\n")
  const elements: React.ReactNode[] = []
  let listItems: React.ReactNode[] = []
  let key = 0

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${key++}`} className="list-disc space-y-1 pl-5 mb-4">
          {listItems}
        </ul>
      )
      listItems = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Empty line
    if (!trimmed) {
      flushList()
      elements.push(<div key={`br-${key++}`} className="h-3" />)
      continue
    }

    // Heading ## or ###
    const h2Match = trimmed.match(/^##\s+(.+)/)
    const h3Match = trimmed.match(/^###\s+(.+)/)
    if (h2Match || h3Match) {
      flushList()
      const headingText = (h2Match || h3Match)![1]
      const isH2 = !!h2Match
      const Tag = isH2 ? "h2" : "h3"
      const id = `chapter-${key}`
      elements.push(
        h(
          Tag,
          {
            key: `h-${key++}`,
            id,
            className: isH2
              ? "text-lg font-semibold text-zinc-900 dark:text-white mt-8 mb-3 scroll-mt-20"
              : "text-base font-medium text-zinc-800 dark:text-zinc-200 mt-5 mb-2 scroll-mt-20",
          },
          renderInlineMarkdown(headingText, videoUrl)
        )
      )
      continue
    }

    // List item
    const liMatch = trimmed.match(/^[-*•]\s+(.+)/)
    if (liMatch) {
      listItems.push(
        <li key={`li-${key++}`} className="text-sm text-zinc-700 dark:text-zinc-300 mb-1">
          {renderInlineMarkdown(liMatch[1], videoUrl)}
        </li>
      )
      continue
    }

    // Numbered list
    const numLiMatch = trimmed.match(/^\d+[.)]\s+(.+)/)
    if (numLiMatch) {
      listItems.push(
        <li key={`li-${key++}`} className="text-sm text-zinc-700 dark:text-zinc-300 mb-1">
          {renderInlineMarkdown(numLiMatch[1], videoUrl)}
        </li>
      )
      continue
    }

    // Horizontal rule
    if (trimmed === "---" || trimmed === "***") {
      flushList()
      elements.push(
        <hr key={`hr-${key++}`} className="my-4 border-zinc-200 dark:border-zinc-800" />
      )
      continue
    }

    // Regular paragraph
    flushList()
    elements.push(
      <p key={`p-${key++}`} className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 mb-3">
        {renderInlineMarkdown(trimmed, videoUrl)}
      </p>
    )
  }

  flushList()
  return elements
}

/**
 * Render inline Markdown: bold, italic, timecodes, links
 */
function renderInlineMarkdown(
  text: string,
  videoUrl: string
): React.ReactNode[] {
  // Tokenize by: bold, italic, timecode [HH:MM:SS] or [MM:SS]
  const pattern = /(\*\*(.+?)\*\*|\[(\d{1,2}:\d{2}(:\d{2})?)\]|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`)/g

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  while ((match = pattern.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    if (match[2]) {
      // Bold **text**
      parts.push(
        <strong key={`b-${match.index}`} className="font-semibold text-zinc-900 dark:text-white">
          {match[2]}
        </strong>
      )
    } else if (match[3]) {
      // Timecode [HH:MM:SS] or [MM:SS]
      const tc = match[3]
      const timeUrl = `${videoUrl}${videoUrl.includes("?") ? "&" : "?"}t=${timeToSeconds(tc)}`
      parts.push(
        <a
          key={`tc-${match.index}`}
          href={timeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-400 dark:hover:bg-blue-900 transition-colors"
        >
          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
          {tc}
        </a>
      )
    } else if (match[5]) {
      // Link [text](url)
      parts.push(
        <a
          key={`link-${match.index}`}
          href={match[6]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          {match[5]}
        </a>
      )
    } else if (match[7]) {
      // Inline code `text`
      parts.push(
        <code key={`code-${match.index}`} className="rounded bg-zinc-100 px-1 py-0.5 text-xs font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
          {match[7]}
        </code>
      )
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

function timeToSeconds(tc: string): number {
  const parts = tc.split(":").map(Number)
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  return parts[0] * 60 + parts[1]
}

/**
 * Extract chapters from markdown content (## headings)
 */
function extractChapters(text: string): Chapter[] {
  const chapters: Chapter[] = []
  const regex = /^##\s+(.+)/gm
  let match

  while ((match = regex.exec(text)) !== null) {
    const title = match[1]
    const timeMatch = title.match(/\[(\d{1,2}:\d{2}(:\d{2})?)\]/)
    const time = timeMatch ? timeToSeconds(timeMatch[1]) : undefined
    const index = chapters.length
    chapters.push({
      title,
      time,
      elementId: `chapter-${index * 2}`, // Matches the key pattern in parser
    })
  }

  return chapters
}

export function SummaryView({
  content,
  streaming,
  videoInfo,
}: SummaryViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoUrl = useMemo(() => getVideoUrl(videoInfo), [videoInfo])
  const chapters = useMemo(() => extractChapters(content), [content])
  const rendered = useMemo(
    () => parseMarkdownToJSX(content, videoUrl),
    [content, videoUrl]
  )

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    if (streaming && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [content, streaming])

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
    } catch {
      // Fallback
    }
  }

  if (!content) {
    return (
      <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-4xl">🤖</div>
        <h3 className="mt-4 font-semibold text-zinc-900 dark:text-white">
          准备生成总结
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          点击「开始 AI 总结」按钮
        </p>
      </div>
    )
  }

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          AI 总结
          {streaming && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-zinc-400">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-500" />
              生成中...
            </span>
          )}
        </h2>
        {!streaming && (
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 transition-colors"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
              <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
            </svg>
            复制
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_200px]">
        {/* Main content */}
        <div
          ref={containerRef}
          className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 max-h-[70vh] overflow-y-auto"
        >
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {rendered}
          </div>

          {/* Streaming cursor */}
          {streaming && (
            <span className="inline-block w-0.5 h-5 bg-zinc-900 dark:bg-white animate-pulse align-text-bottom ml-0.5" />
          )}
        </div>

        {/* Chapter navigation sidebar */}
        {chapters.length > 1 && !streaming && (
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                章节导航
              </h3>
              <nav className="space-y-0.5">
                {chapters.map((ch, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const el = document.getElementById(ch.elementId)
                      if (el) {
                        el.scrollIntoView({ behavior: "smooth" })
                      }
                    }}
                    className="block w-full text-left text-xs py-1.5 px-2 rounded-md text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors truncate"
                  >
                    {ch.time && (
                      <span className="font-mono text-zinc-400 mr-1 tabular-nums">
                        {formatSecondsSimple(ch.time)}
                      </span>
                    )}
                    {ch.title.replace(/\[.*?\]/, "").trim()}
                  </button>
                ))}
              </nav>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

function formatSecondsSimple(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, "0")}`
}
