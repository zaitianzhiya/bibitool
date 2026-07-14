// Export utilities — SRT, TXT, Markdown stripping, PDF helpers

import { SubtitleItem } from "@/types"

/**
 * Format seconds to SRT timestamp: HH:MM:SS,mmm
 */
function toSrtTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  return `${pad(h)}:${pad(m)}:${pad(s)},${ms.toString().padStart(3, "0")}`
}

function pad(n: number): string {
  return n.toString().padStart(2, "0")
}

/**
 * Convert subtitle items to SRT format string
 */
export function subtitlesToSrt(subtitles: SubtitleItem[]): string {
  return subtitles
    .map((item, i) => {
      return `${i + 1}\n${toSrtTimestamp(item.start)} --> ${toSrtTimestamp(item.end)}\n${item.text}\n`
    })
    .join("\n")
}

/**
 * Strip Markdown formatting to plain text
 */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")       // Remove headings
    .replace(/\*\*(.+?)\*\*/g, "$1")   // Bold → plain
    .replace(/\*(.+?)\*/g, "$1")       // Italic → plain
    .replace(/`(.+?)`/g, "$1")         // Inline code → plain
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Links → text
    .replace(/^[-*•]\s+/gm, "")        // List markers
    .replace(/^\d+[.)]\s+/gm, "")      // Numbered list markers
    .replace(/\n{3,}/g, "\n\n")        // Collapse excessive blank lines
    .trim()
}

/**
 * Trigger browser print dialog for PDF export
 * Dispatches beforeprint/afterprint events and opens native print dialog
 */
export function exportAsPdf(): void {
  window.print()
}

/**
 * Download content as a file
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType = "text/plain"
): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
