// Prompt templates for AI summarization
// Separate system/user prompts for better control

import { SummaryMode } from "@/types"

/**
 * System prompt — defines the assistant's role and behavior
 */
export function buildSystemPrompt(mode: SummaryMode): string {
  const common = [
    "你是一个专业的视频内容总结助手。",
    "你的任务是根据视频的字幕/文稿生成高质量的内容总结。",
    "始终使用中文输出。",
    "尊重原始内容，不编造视频中没有提到的信息。",
  ]

  switch (mode) {
    case "brief":
      return [
        ...common,
        "生成简洁的总结（不超过500字）。",
        "聚焦于核心观点和关键结论。",
      ].join("\n")

    case "detailed":
      return [
        ...common,
        "生成详细的章节式总结。",
        "按主题拆分章节，每章包含时间戳和摘要。",
        "使用 Markdown 格式输出，包含目录。",
        "标注重要数据、引用和关键概念。",
      ].join("\n")

    default:
      return common.join("\n")
  }
}

/**
 * User prompt — contains the actual subtitle content to summarize
 */
export function buildUserPrompt(text: string, mode: SummaryMode): string {
  switch (mode) {
    case "brief":
      return buildBriefUserPrompt(text)
    case "detailed":
      return buildDetailedUserPrompt(text)
    default:
      return buildBriefUserPrompt(text)
  }
}

function buildBriefUserPrompt(text: string): string {
  return `请根据以下视频字幕内容，生成一份简洁的总结：\n\n${text}`
}

function buildDetailedUserPrompt(text: string): string {
  return `请根据以下视频字幕内容，生成一份详细的章节式总结：\n\n${text}`
}

/**
 * Prompt for local summary of a single chunk (parallel Map phase)
 */
export function buildLocalSummaryPrompt(chunkText: string): string {
  return `请用 2-3 句话总结以下视频片段的核心内容，保留关键数据和观点。使用中文。

片段内容：
${chunkText}`
}

/**
 * Prompt for merging local summaries into final output (Reduce phase)
 */
export function buildGlobalMergePrompt(
  localSummaries: string[],
  mode: SummaryMode
): string {
  const numbered = localSummaries
    .map((s, i) => `第${i + 1}段：${s}`)
    .join("\n\n")

  const format =
    mode === "brief"
      ? "生成一份简洁的整体总结（不超过500字），提炼出 3-5 个关键要点。"
      : "生成一份详细的章节式总结，使用 Markdown 格式，包含目录、章节时间标注和核心要点。"

  return `以下是视频不同片段的摘要，请将它们整合为一份连贯的整体总结。${format}

片段摘要：
${numbered}`
}
