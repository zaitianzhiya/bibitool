"use client"

// History page — interactive list of saved AI summaries
// Phase 5: real data from API, search, filter, pagination

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

interface HistoryItem {
  id: string
  title: string
  url: string
  platform: string
  coverUrl?: string
  duration?: number
  mode: string
  model?: string
  status: string
  createdAt: string
}

interface HistoryResponse {
  data: HistoryItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

function platformLabel(p: string): string {
  switch (p) {
    case "bilibili": return "B站"
    case "youtube": return "YouTube"
    case "local": return "本地"
    default: return p
  }
}

function platformColor(p: string): string {
  switch (p) {
    case "bilibili": return "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300"
    case "youtube": return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
    default: return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatMinutes(seconds?: number): string {
  if (!seconds || seconds <= 0) return ""
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState("")
  const [platform, setPlatform] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: String(p),
        pageSize: "20",
      })
      if (search) params.set("search", search)
      if (platform && platform !== "all") params.set("platform", platform)

      const res = await fetch(`/api/history?${params}`)
      const json: HistoryResponse = await res.json()

      if (!res.ok) {
        throw new Error(
          (json as unknown as { error: { message: string } }).error?.message ||
          "Failed to load history"
        )
      }

      setItems(json.data)
      setTotal(json.total)
      setTotalPages(json.totalPages)
      setPage(json.page)
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [search, platform])

  useEffect(() => {
    fetchHistory(1)
  }, [fetchHistory])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchHistory(1)
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/history/${id}`, { method: "DELETE" })
      fetchHistory(page)
    } catch {
      // silently fail deletion
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            历史记录
          </h1>
          <p className="mt-2 text-zinc-500">
            {total > 0
              ? `共 ${total} 条 AI 视频总结`
              : "查看你所有的 AI 视频总结记录"}
          </p>
        </div>
        <Link
          href="/summarize"
          className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
        >
          新建总结
        </Link>
      </div>

      {/* Search & filter */}
      <div className="mt-8 flex gap-3">
        <form onSubmit={handleSearch} className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索视频标题..."
            className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-600"
          />
        </form>
        <select
          value={platform}
          onChange={(e) => {
            setPlatform(e.target.value)
            fetchHistory(1)
          }}
          className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <option value="all">全部平台</option>
          <option value="bilibili">B站</option>
          <option value="youtube">YouTube</option>
        </select>
      </div>

      {/* Content */}
      <div className="mt-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
            <button
              onClick={() => fetchHistory(page)}
              className="ml-3 underline"
            >
              重试
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
            <div className="text-4xl">📝</div>
            <h3 className="mt-4 font-semibold text-zinc-900 dark:text-white">
              还没有总结记录
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              粘贴一个视频链接开始你的第一次 AI 总结吧
            </p>
            <Link
              href="/summarize"
              className="mt-6 inline-block rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
            >
              开始总结
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group rounded-xl border border-zinc-200 bg-white p-5 hover:shadow-sm transition-shadow dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${platformColor(item.platform)}`}
                        >
                          {platformLabel(item.platform)}
                        </span>
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          {item.mode === "brief" ? "省流" : "详细"}
                        </span>
                        {item.duration ? (
                          <span className="text-xs text-zinc-400">
                            {formatMinutes(item.duration)}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white line-clamp-2">
                        {item.title || "未命名视频"}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-400">
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded-md p-1.5 text-xs text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                        title="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => fetchHistory(page - 1)}
                  className="rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-900"
                >
                  上一页
                </button>
                <span className="text-sm text-zinc-500">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => fetchHistory(page + 1)}
                  className="rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-900"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
