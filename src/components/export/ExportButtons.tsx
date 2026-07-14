"use client"

// ExportButtons — toolbar for exporting summary content
// Copy Markdown, Export TXT, Export SRT, Export PDF

import { useState } from "react"
import { SubtitleItem } from "@/types"
import {
  subtitlesToSrt,
  markdownToPlainText,
  exportAsPdf,
  downloadFile,
  copyToClipboard,
} from "@/lib/export"

interface ExportButtonsProps {
  content: string
  subtitles?: SubtitleItem[]
  title?: string
}

type ExportAction = "copy-md" | "download-txt" | "download-srt" | "print-pdf"

export function ExportButtons({
  content,
  subtitles,
  title,
}: ExportButtonsProps) {
  const [copied, setCopied] = useState(false)

  const handleExport = async (action: ExportAction) => {
    const baseName =
      title
        ?.replace(/[<>:"/\\|?*]/g, "")
        .slice(0, 50) || "bibitool-summary"

    switch (action) {
      case "copy-md": {
        const ok = await copyToClipboard(content)
        if (ok) {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }
        break
      }
      case "download-txt": {
        downloadFile(
          markdownToPlainText(content),
          `${baseName}.txt`
        )
        break
      }
      case "download-srt": {
        if (subtitles && subtitles.length > 0) {
          downloadFile(
            subtitlesToSrt(subtitles),
            `${baseName}.srt`,
            "text/plain;charset=utf-8"
          )
        }
        break
      }
      case "print-pdf": {
        exportAsPdf()
        break
      }
    }
  }

  const buttons: { action: ExportAction; icon: string; label: string; disabled?: boolean }[] = [
    {
      action: "copy-md",
      icon: copied ? "✅" : "📋",
      label: copied ? "已复制" : "复制",
    },
    { action: "download-txt", icon: "📄", label: "TXT" },
    {
      action: "download-srt",
      icon: "📝",
      label: "SRT",
      disabled: !subtitles || subtitles.length === 0,
    },
    { action: "print-pdf", icon: "🖨️", label: "PDF" },
  ]

  return (
    <div className="flex items-center gap-1">
      {buttons.map((btn) => (
        <button
          key={btn.action}
          onClick={() => handleExport(btn.action)}
          disabled={btn.disabled}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
          title={btn.disabled ? "No subtitles available for SRT export" : `Export ${btn.label}`}
        >
          <span className="text-sm">{btn.icon}</span>
          <span>{btn.label}</span>
        </button>
      ))}
    </div>
  )
}
