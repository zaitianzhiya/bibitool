// AI summarization engine - Map-Reduce pipeline
// Short videos (<3000 tokens): single-pass LLM streaming
// Long videos: chunk -> parallel local summaries -> global merge streaming
// Phase 4: DeepSeek multi-provider support with 3-tier fallback

import { streamText, generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { deepseek } from "@ai-sdk/deepseek"
import { SummarizeOptions, SubtitleItem } from "@/types"
import { chunkSubtitles } from "./chunk"
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildLocalSummaryPrompt,
  buildGlobalMergePrompt,
} from "./prompt"
import { routeModel, getFallbackModel } from "./router"

function getModel(provider: string, modelId: string) {
  switch (provider) {
    case "deepseek":
      return deepseek(modelId)
    case "openai":
    default:
      return openai(modelId)
  }
}

function formatTimeForPrompt(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

function subtitlesToPromptText(subtitles: SubtitleItem[]): string {
  return subtitles.map((s) => `[${formatTimeForPrompt(s.start)}] ${s.text}`).join("\n")
}

const SHORT_VIDEO_TOKEN_THRESHOLD = 3000

export async function* summarizeStream(options: SummarizeOptions) {
  const { subtitles, mode, model: modelId } = options

  if (!subtitles || subtitles.length === 0) {
    yield "[no-subtitles] No subtitles available for summary."
    return
  }

  const fullText = subtitlesToPromptText(subtitles)
  const chunks = chunkSubtitles(subtitles, { maxTokens: SHORT_VIDEO_TOKEN_THRESHOLD, overlap: 300 })

  const route = modelId ? { model: modelId, provider: "openai" as const } : routeModel(mode)
  let currentRoute = route
  let aiModel = getModel(currentRoute.provider, currentRoute.model)

  while (true) {
    try {
      if (chunks.length <= 1) {
        const result = streamText({
          model: aiModel,
          system: buildSystemPrompt(mode),
          prompt: buildUserPrompt(fullText, mode),
          temperature: mode === "brief" ? 0.3 : 0.5,
          maxOutputTokens: mode === "brief" ? 1000 : 4000,
        })
        for await (const chunk of result.textStream) { yield chunk }
      } else {
        const localResults = await Promise.all(
          chunks.map((chunk, i) => generateLocalSummary(chunk, aiModel, i))
        )
        const validLocals = localResults.filter((r): r is string => r !== null)
        if (validLocals.length === 0) {
          yield "[all-failed] All AI summary chunks failed."
          return
        }
        const mergedPrompt = buildGlobalMergePrompt(validLocals, mode)
        const globalResult = streamText({
          model: aiModel,
          system: buildSystemPrompt(mode),
          prompt: mergedPrompt,
          temperature: mode === "brief" ? 0.3 : 0.5,
          maxOutputTokens: mode === "brief" ? 1000 : 4000,
        })
        for await (const chunk of globalResult.textStream) { yield chunk }
      }
      return
    } catch (err) {
      console.warn(`Model ${currentRoute.provider}/${currentRoute.model} failed, trying fallback...`, err)
      const next = getFallbackModel(currentRoute)
      if (next.model === currentRoute.model) { throw err }
      currentRoute = next
      aiModel = getModel(currentRoute.provider, currentRoute.model)
    }
  }
}

async function generateLocalSummary(chunkText: string, model: any, _index: number): Promise<string | null> {
  try {
    const result = await generateText({ model, prompt: buildLocalSummaryPrompt(chunkText), maxOutputTokens: 300, temperature: 0.3 })
    return result.text.trim()
  } catch (err) {
    console.warn(`Local summary failed for chunk ${_index + 1}:`, err)
    return null
  }
}