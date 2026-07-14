// Subtitle normalization
// Standardizes subtitle output across platforms to SubtitleItem[]

import { SubtitleItem, Platform } from "@/types"

/**
 * Normalize subtitles from any platform to standard format
 * - Removes HTML tags
 * - Normalizes whitespace
 * - Merges overlapping/adjacent lines
 * - Sorts by start time
 */
export function normalizeSubtitles(
  items: SubtitleItem[],
  _platform?: Platform
): SubtitleItem[] {
  if (!items || items.length === 0) return []

  // 1. Clean each subtitle item
  const cleaned = items
    .map((item) => ({
      start: Math.max(0, item.start),
      end: Math.max(item.start + 0.1, item.end), // Ensure end > start
      text: cleanSubtitleText(item.text),
    }))
    .filter((item) => item.text.length > 0) // Remove empty text
    .sort((a, b) => a.start - b.start)

  // 2. Merge consecutive lines with same text or very close timing
  const merged: SubtitleItem[] = []
  for (const item of cleaned) {
    const last = merged[merged.length - 1]
    if (last && last.end >= item.start - 0.2) {
      // Extend previous item instead of creating new one
      last.end = Math.max(last.end, item.end)
      last.text = last.text + " " + item.text
    } else {
      merged.push({ ...item })
    }
  }

  // 3. Trim whitespace in merged text
  return merged.map((item) => ({
    ...item,
    text: item.text.trim(),
  }))
}

/**
 * Clean subtitle text
 */
function cleanSubtitleText(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")     // Remove HTML tags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")        // Collapse whitespace
    .trim()
}

/**
 * Extract the dominant subtitle language from the subtitle list
 * Simple heuristic based on character frequency
 */
export function detectSubtitleLanguage(subtitles: SubtitleItem[]): string {
  if (subtitles.length === 0) return "unknown"

  const sampleText = subtitles
    .slice(0, 10)
    .map((s) => s.text)
    .join(" ")

  const chineseChars = (sampleText.match(/[一-鿿㐀-䶿]/g) || []).length
  const japaneseChars = (sampleText.match(/[぀-ゟ゠-ヿ]/g) || []).length
  const koreanChars = (sampleText.match(/[가-힯]/g) || []).length
  const totalChars = sampleText.replace(/\s/g, "").length

  if (totalChars === 0) return "unknown"
  if (chineseChars / totalChars > 0.3) return "zh"
  if (japaneseChars / totalChars > 0.2) return "ja"
  if (koreanChars / totalChars > 0.2) return "ko"

  return "en"
}

/**
 * Estimate subtitle count (for display purposes)
 */
export function getSubtitleStats(subtitles: SubtitleItem[]): {
  lineCount: number
  totalDuration: number
  language: string
} {
  return {
    lineCount: subtitles.length,
    totalDuration:
      subtitles.length > 0
        ? subtitles[subtitles.length - 1].end - subtitles[0].start
        : 0,
    language: detectSubtitleLanguage(subtitles),
  }
}
