// AI article rewrite — converts video summary into narrative article
// Uses LLM to generate a well-structured, readable article from subtitles + summary

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { SubtitleItem } from "@/types"

/**
 * Rewrite video subtitles + summary into a narrative article.
 * Suitable for publishing as a blog post, newsletter, or social media.
 *
 * @param subtitleText - Raw subtitle text with timestamps
 * @param summary - AI-generated summary (may be empty for first-pass)
 * @returns Formatted article in Markdown
 */
export async function rewriteAsArticle(
  subtitleText: string,
  summary: string
): Promise<string> {
  const prompt = `你是一位专业的内容编辑。请根据以下视频字幕内容，撰写一篇结构完整的叙事性文章。

要求：
1. 开头：用引人入胜的引言概括视频主题（2-3句）
2. 正文：按逻辑顺序展开核心内容，段落之间有自然过渡
3. 观点提炼：将视频中的散点整理为连贯论述
4. 结尾：简洁总结核心价值或行动建议（2-3句）
5. 使用 Markdown 格式，包含文章标题（# 标题）
6. 字数 800-1500 字
7. 中文输出

${summary ? `AI 总结参考：\n${summary}\n\n` : ""}
视频字幕内容：
${subtitleText}`

  const result = await generateText({
    model: openai("gpt-4o-mini"),
    prompt,
    maxOutputTokens: 2000,
    temperature: 0.5,
  })

  return result.text.trim()
}
