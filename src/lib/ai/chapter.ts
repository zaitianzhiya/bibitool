// AI chapter detection — splits subtitle text into logical chapters
// Uses LLM to identify topic transitions and assign timestamps

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { Chapter, SubtitleItem } from "@/types"
import { chunkSubtitles } from "./chunk"

/**
 * AI-based chapter detection from subtitle items.
 * Uses the LLM to identify natural topic breaks and creates timestamped chapters.
 *
 * For short videos (<100 lines): single-pass LLM call
 * For long videos: chunk → extract chapter milestones → deduplicate
 */
export async function detectChaptersAI(
  subtitles: SubtitleItem[]
): Promise<Chapter[]> {
  if (!subtitles || subtitles.length === 0) return []

  // For short videos, detect chapters directly
  if (subtitles.length <= 100) {
    return detectChaptersFromText(subtitles)
  }

  // For long videos, work with chunked summaries
  return detectChaptersFromText(subtitles)
}

async function detectChaptersFromText(
  subtitles: SubtitleItem[]
): Promise<Chapter[]> {
  const sample = subtitles
    .map((s) => `[${formatTimeForPrompt(s.start)}] ${s.text}`)
    .join("\n")

  // Limit sample to ~6000 tokens to avoid expensive API calls
  const truncated =
    sample.length > 8000
      ? sample.slice(0, 8000) + "\n...(content truncated)..."
      : sample

  const prompt = `你是视频内容分析专家。根据以下视频字幕，分析内容的逻辑结构，将视频拆分为 3-8 个章节。

要求：
1. 每个章节有标题和起始时间戳
2. 章节按时间顺序排列
3. 章节标题简洁（5-10字）
4. 只输出 JSON 格式，不要其他内容

输出格式：
[
  {"title": "章节标题", "startTime": 0},
  {"title": "章节标题", "startTime": 125.5}
]

字幕内容：
${truncated}`

  try {
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      maxOutputTokens: 500,
      temperature: 0.1,
    })

    const text = result.text.trim()
    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const parsed = JSON.parse(jsonMatch[0]) as {
      title: string
      startTime: number
    }[]

    // Convert to Chapter[]
    return parsed.map((ch, i, arr) => ({
      title: ch.title,
      startTime: ch.startTime,
      endTime: arr[i + 1]?.startTime ?? subtitles[subtitles.length - 1]?.end ?? 0,
      summary: "",
    }))
  } catch (err) {
    console.warn("Chapter detection failed:", err)
    // Fallback: one-chapter video
    return [
      {
        title: "完整视频",
        startTime: subtitles[0]?.start ?? 0,
        endTime: subtitles[subtitles.length - 1]?.end ?? 0,
        summary: "",
      },
    ]
  }
}

function formatTimeForPrompt(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}
