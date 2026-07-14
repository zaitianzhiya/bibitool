"use client"

// VideoInfoCard — displays video metadata and subtitle preview
// Shown after successful URL submission on the summarize page

import { VideoInfo, SubtitleItem, Platform } from "@/types"

interface VideoInfoCardProps {
  videoInfo: VideoInfo
  stats: {
    lineCount: number
    totalDuration: number
    language: string
  }
  subLoading?: boolean
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "—"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${m}:${pad(s)}`
}

function pad(n: number): string {
  return n.toString().padStart(2, "0")
}

function platformLabel(platform: Platform): string {
  switch (platform) {
    case Platform.Bilibili:
      return "B站"
    case Platform.YouTube:
      return "YouTube"
    case Platform.LocalFile:
      return "本地文件"
    default:
      return platform
  }
}

function platformColor(platform: Platform): string {
  switch (platform) {
    case Platform.Bilibili:
      return "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300"
    case Platform.YouTube:
      return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
    default:
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
  }
}

function subtitlePreviewLines(subtitles: SubtitleItem[]): SubtitleItem[] {
  if (!subtitles || subtitles.length === 0) return []
  // Show first 5 lines as preview
  return subtitles.slice(0, 5)
}

export function VideoInfoCard({
  videoInfo,
  stats,
  subLoading,
}: VideoInfoCardProps) {
  return (
    <div className="mt-10 rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-950">
      {/* Header with thumbnail and title */}
      <div className="flex flex-col sm:flex-row gap-4 p-6">
        {videoInfo.coverUrl && (
          <div className="relative h-32 w-56 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={videoInfo.coverUrl}
              alt={videoInfo.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        <div className="flex flex-col justify-between flex-1 min-w-0">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${platformColor(videoInfo.platform)}`}
              >
                {platformLabel(videoInfo.platform)}
              </span>
              {videoInfo.duration > 0 && (
                <span className="text-xs text-zinc-400">
                  {formatDuration(videoInfo.duration)}
                </span>
              )}
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 leading-snug dark:text-white line-clamp-2">
              {videoInfo.title}
            </h2>
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs text-zinc-400">
            <span>{stats.lineCount} 行字幕</span>
            <span>语言: {stats.language === "zh" ? "中文" : stats.language === "en" ? "English" : stats.language}</span>
          </div>
        </div>
      </div>

      {/* Subtitle preview */}
      <div className="border-t border-zinc-100 dark:border-zinc-800">
        <div className="px-6 py-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            字幕预览
            {subLoading && (
              <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
            )}
          </h3>
          {stats.lineCount > 0 ? (
            <div className="mt-3 space-y-2">
              {subtitlePreviewLines(videoInfo.subtitles || []).map((line, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="flex-shrink-0 font-mono text-xs tabular-nums text-zinc-400 mt-0.5">
                    {formatDuration(line.start)}
                  </span>
                  <span className="text-zinc-700 dark:text-zinc-300 line-clamp-1">
                    {line.text}
                  </span>
                </div>
              ))}
              {stats.lineCount > 5 && (
                <p className="text-xs text-zinc-400 pt-1">
                  ... 还有 {stats.lineCount - 5} 行字幕
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
              ⚠️ 该视频没有字幕。总结功能将使用 AI 语音识别转写文字。
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function VideoInfoCardSkeleton() {
  return (
    <div className="mt-10 rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col sm:flex-row gap-4 p-6">
        <div className="h-32 w-56 flex-shrink-0 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex flex-col justify-between flex-1 gap-3">
          <div className="h-4 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-6 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
      <div className="border-t border-zinc-100 dark:border-zinc-800 px-6 py-4">
        <div className="h-3 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-4 w-12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className={`h-4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800 ${i === 1 ? "w-3/4" : i === 2 ? "w-1/2" : "w-2/3"}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
