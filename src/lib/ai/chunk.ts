// AI text chunking module
// Splits long subtitle text into manageable chunks for LLM processing

import { SubtitleItem } from "@/types"
import { estimateTokens, formatTime } from "@/lib/utils"

interface ChunkOptions {
  maxTokens?: number
  overlap?: number
}

/**
 * Split subtitle items into chunks respecting token limits
 * with overlap between adjacent chunks for context continuity
 */
export function chunkSubtitles(
  subtitles: SubtitleItem[],
  options: ChunkOptions = {}
): string[] {
  const { maxTokens = 3000, overlap = 300 } = options

  const chunks: string[] = []
  let current = ""
  let currentTokens = 0

  for (const item of subtitles) {
    const line = `[${formatTime(item.start)}] ${item.text}\n`
    const lineTokens = estimateTokens(line)

    if (currentTokens + lineTokens > maxTokens && current.length > 0) {
      chunks.push(current)
      // Keep last `overlap` characters for context
      const overlapText = current.slice(-overlap)
      current = overlapText + line
      currentTokens = estimateTokens(current)
    } else {
      current += line
      currentTokens += lineTokens
    }
  }

  if (current.length > 0) {
    chunks.push(current)
  }

  return chunks
}

/**
 * Convert chunked text back to a flat subtitle text blob (for single-pass prompts)
 */
export function flattenChunks(chunks: string[]): string {
  return chunks.join("\n")
}
