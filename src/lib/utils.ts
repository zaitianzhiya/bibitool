// Shared utility functions

/**
 * Format seconds to HH:MM:SS or MM:SS timestamp
 */
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`
  }
  return `${pad(m)}:${pad(s)}`
}

function pad(n: number): string {
  return n.toString().padStart(2, "0")
}

/**
 * Estimate token count from text (rough heuristic: 1 token ≈ 4 characters for English, 2 for Chinese)
 */
export function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[一-鿿]/g) || []).length
  const otherChars = text.length - chineseChars
  return Math.ceil(chineseChars / 2 + otherChars / 4)
}

/**
 * Extract video ID from B站 URL
 */
export function extractBilibiliVideoId(url: string): string | null {
  // bv号: BV1xx411c7mD
  const bvMatch = url.match(/BV[a-zA-Z0-9]{10}/)
  if (bvMatch) return bvMatch[0]

  // av号: av12345678
  const avMatch = url.match(/av(\d+)/i)
  if (avMatch) return avMatch[0]

  // b23.tv短链需要重定向提取，先返回null
  if (url.includes("b23.tv")) return null

  return null
}

/**
 * Extract video ID from YouTube URL
 */
export function extractYouTubeVideoId(url: string): string | null {
  // Standard watch URL
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  if (watchMatch) return watchMatch[1]

  // Short URL
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (shortMatch) return shortMatch[1]

  // Embed URL
  const embedMatch = url.match(/\/embed\/([a-zA-Z0-9_-]{11})/)
  if (embedMatch) return embedMatch[1]

  return null
}

/**
 * Sleep helper for retry delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
