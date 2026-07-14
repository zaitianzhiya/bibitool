"use client"

// Summarize page — full interactive flow
// Phase 2: URL → subtitle extraction → VideoInfoCard
// Phase 3: + mode selection → "开始 AI 总结" → SSE streaming → SummaryView
// Phase 4: + output tabs (总结/文章/思维导图/高光), export toolbar, share card

import { useState, useCallback } from "react"
import { VideoInfo } from "@/types"
import {
  VideoInfoCard,
  VideoInfoCardSkeleton,
} from "@/components/video/VideoInfoCard"
import { SummaryView } from "@/components/summary/SummaryView"
import { MindMapView } from "@/components/summary/MindMapView"
import { HighlightPanel, useHighlights } from "@/components/summary/HighlightNotes"
import { ExportButtons } from "@/components/export/ExportButtons"

interface SubtitleData {
  videoInfo: VideoInfo
  stats: {
    lineCount: number
    totalDuration: number
    language: string
  }
}

type SummaryMode = "brief" | "detailed"
type OutputTab = "summary" | "article" | "mindmap" | "highlights"

const TABS: { id: OutputTab; icon: string; label: string }[] = [
  { id: "summary", icon: "📋", label: "总结" },
  { id: "article", icon: "📰", label: "文章" },
  { id: "mindmap", icon: "🧠", label: "思维导图" },
  { id: "highlights", icon: "💡", label: "高光笔记" },
]

export default function SummarizePage() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SubtitleData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Phase 3 state
  const [mode, setMode] = useState<SummaryMode>("brief")
  const [summaryContent, setSummaryContent] = useState("")
  const [summaryStreaming, setSummaryStreaming] = useState(false)
  const [summaryDone, setSummaryDone] = useState(false)

  // Phase 4 state
  const [activeTab, setActiveTab] = useState<OutputTab>("summary")
  const [articleContent, setArticleContent] = useState("")
  const [articleLoading, setArticleLoading] = useState(false)
  const high = useHighlights()

  // Step 1: Extract subtitles
  const handleExtract = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = url.trim()
      if (!trimmed) return

      setLoading(true)
      setError(null)
      setData(null)
      setSummaryContent("")
      setSummaryDone(false)
      setArticleContent("")
      setActiveTab("summary")

      try {
        const res = await fetch("/api/subtitle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        })
        const json = await res.json()
        if (!res.ok) {
          throw new Error(
            json.error?.message || "Failed to extract subtitles"
          )
        }
        setData(json)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred"
        )
      } finally {
        setLoading(false)
      }
    },
    [url]
  )

  // Step 2: Start AI summary
  const handleSummarize = useCallback(async () => {
    if (!url.trim() || !data) return

    setSummaryStreaming(true)
    setSummaryContent("")
    setSummaryDone(false)
    setActiveTab("summary")

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), mode }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error?.message || "Summary generation failed")
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response stream")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split("\n\n")
        buffer = parts.pop() || ""

        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith("data: ")) continue

          const payload = line.slice(6)
          if (payload === "[DONE]") {
            setSummaryStreaming(false)
            setSummaryDone(true)
            return
          }

          try {
            const parsed = JSON.parse(payload)
            if (parsed.error) throw new Error(parsed.error)
            setSummaryContent((prev) => prev + payload)
          } catch {
            setSummaryContent((prev) => prev + payload)
          }
        }
      }

      setSummaryStreaming(false)
      setSummaryDone(true)
    } catch (err) {
      setSummaryStreaming(false)
      setSummaryContent(
        (prev) =>
          prev +
          `\n\n❌ 总结生成失败：${
            err instanceof Error ? err.message : "未知错误"
          }`
      )
    }
  }, [url, data, mode])

  // Step 3: AI Article rewrite
  const handleRewriteArticle = useCallback(async () => {
    if (!url.trim() || !data) return

    setArticleLoading(true)
    setArticleContent("")
    setActiveTab("article")

    try {
      const res = await fetch("/api/export/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), summary: summaryContent }),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error?.message || "Article generation failed")
      }

      setArticleContent(json.article)
    } catch (err) {
      setArticleContent(
        `❌ 文章生成失败：${err instanceof Error ? err.message : "未知错误"}`
      )
    } finally {
      setArticleLoading(false)
    }
  }, [url, data, summaryContent])

  // Handle adding highlight from SummaryView selection
  const handleAddHighlight = useCallback(
    (text: string) => {
      high.addHighlight(text)
    },
    [high]
  )

  const ogUrl =
    summaryDone && data
      ? `/api/og?title=${encodeURIComponent(data.videoInfo.title)}&platform=${data.videoInfo.platform}&duration=${encodeURIComponent(String(data.videoInfo.duration))}`
      : null

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl flex-col px-4 py-12 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
          开始 AI 视频总结
        </h1>
        <p className="mt-3 text-zinc-500">
          粘贴视频链接，一键获取 AI 总结
        </p>
      </div>

      {/* URL Input */}
      <div className="mt-10">
        <form onSubmit={handleExtract}>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <label
              htmlFor="video-url"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              视频链接
            </label>
            <div className="mt-2 flex gap-3">
              <input
                id="video-url"
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setError(null)
                }}
                placeholder="粘贴 B站 / YouTube 视频链接..."
                className="flex-1 rounded-xl border border-zinc-300 px-4 py-3 text-sm shadow-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-600"
                required
              />
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
              >
                {loading ? "提取中..." : "提取字幕"}
              </button>
            </div>
            <p className="mt-3 text-xs text-zinc-400">
              支持 B站 (bilibili.com, b23.tv) · YouTube (youtube.com,
              youtu.be)
            </p>
            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                {error}
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Loading skeleton */}
      {loading && <VideoInfoCardSkeleton />}

      {/* Video info card + summary flow */}
      {data && !loading && (
        <>
          <VideoInfoCard videoInfo={data.videoInfo} stats={data.stats} />

          {data.stats.lineCount > 0 && (
            <div className="mt-6">
              {/* Mode selector + action buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    模式：
                  </span>
                  <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-900">
                    <button
                      onClick={() => {
                        setMode("brief")
                        setSummaryContent("")
                        setSummaryDone(false)
                      }}
                      className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                        mode === "brief"
                          ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                          : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                      }`}
                    >
                      🎯 省流
                    </button>
                    <button
                      onClick={() => {
                        setMode("detailed")
                        setSummaryContent("")
                        setSummaryDone(false)
                      }}
                      className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                        mode === "detailed"
                          ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                          : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                      }`}
                    >
                      📋 详细
                    </button>
                  </div>
                </div>

                {!summaryContent && !summaryStreaming && (
                  <button
                    onClick={handleSummarize}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                  >
                    <span>🤖</span>
                    开始 AI 总结
                  </button>
                )}
              </div>

              {/* Output area */}
              {(summaryContent || summaryStreaming) && (
                <div className="mt-6 space-y-4">
                  {/* Export & action toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Tab switcher */}
                    <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-900">
                      {TABS.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id)
                            if (
                              tab.id === "article" &&
                              !articleContent &&
                              !articleLoading
                            ) {
                              handleRewriteArticle()
                            }
                          }}
                          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                            activeTab === tab.id
                              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                          }`}
                        >
                          {tab.icon} {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Export buttons */}
                    {(summaryContent || articleContent) && (
                      <ExportButtons
                        content={
                          activeTab === "article"
                            ? articleContent
                            : summaryContent
                        }
                        subtitles={data.videoInfo.subtitles}
                        title={data.videoInfo.title}
                      />
                    )}
                  </div>

                  {/* Tab content */}
                  {activeTab === "summary" && (
                    <SummaryView
                      content={summaryContent}
                      streaming={summaryStreaming}
                      videoInfo={data.videoInfo}
                    />
                  )}

                  {activeTab === "article" && (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 min-h-[300px]">
                      {articleLoading ? (
                        <div className="flex items-center justify-center py-20">
                          <div className="text-center">
                            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
                            <p className="text-sm text-zinc-400">
                              AI 正在改写文章...
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <SummaryView
                            content={articleContent}
                            streaming={false}
                            videoInfo={data.videoInfo}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "mindmap" && (
                    <MindMapView content={summaryContent} />
                  )}

                  {activeTab === "highlights" && (
                    <HighlightPanel
                      highlights={high.highlights}
                      onRemove={high.removeHighlight}
                      onClearAll={high.clearAll}
                    />
                  )}

                  {/* Done state: regenerate + share */}
                  {summaryDone && activeTab === "summary" && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSummarize}
                        className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 transition-colors"
                      >
                        🔄 重新生成
                      </button>
                      {ogUrl && (
                        <a
                          href={ogUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 transition-colors inline-flex items-center gap-1"
                        >
                          🖼️ 分享卡片
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Feature highlights — shown when nothing submitted yet */}
      {!data && !loading && (
        <div className="mt-16 rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            🚧 Phase 4 进行中：思维导图、文章改写、多格式导出已上线。粘贴链接即可体验完整流程。
          </p>
        </div>
      )}
    </div>
  )
}
