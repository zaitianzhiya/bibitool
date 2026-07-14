// Tests for src/lib/ai/router.ts
import { describe, it, expect } from "vitest"
import {
  routeModel,
  getFallbackModel,
  getAvailableModels,
} from "../ai/router"

describe("routeModel", () => {
  it("returns gpt-4o-mini by default with preferCheap=true", () => {
    const result = routeModel("brief", true)
    expect(result.model).toBe("gpt-4o-mini")
    expect(result.provider).toBe("openai")
    expect(result.costTier).toBe("low")
  })

  it("returns gpt-4o when preferCheap=false", () => {
    const result = routeModel("detailed", false)
    expect(result.model).toBe("gpt-4o")
    expect(result.provider).toBe("openai")
    expect(result.costTier).toBe("high")
  })

  it("prefers cheap by default", () => {
    const result = routeModel("detailed")
    expect(result.model).toBe("gpt-4o-mini")
  })
})

describe("getFallbackModel", () => {
  it("falls back from gpt-4o-mini to deepseek-chat", () => {
    const current = { model: "gpt-4o-mini", provider: "openai" as const }
    const fallback = getFallbackModel(current)
    expect(fallback.model).toBe("deepseek-chat")
    expect(fallback.provider).toBe("deepseek")
  })

  it("falls back from deepseek-chat to gpt-4o", () => {
    const current = { model: "deepseek-chat", provider: "deepseek" as const }
    const fallback = getFallbackModel(current)
    expect(fallback.model).toBe("gpt-4o")
    expect(fallback.provider).toBe("openai")
  })

  it("cycles back to primary from last resort", () => {
    const current = { model: "gpt-4o", provider: "openai" as const }
    const fallback = getFallbackModel(current)
    expect(fallback.model).toBe("gpt-4o") // Last resort stays on itself
  })
})

describe("getAvailableModels", () => {
  it("returns all 4 registered models", () => {
    const models = getAvailableModels()
    expect(models.length).toBe(4)
    expect(models.map((m) => m.id)).toContain("gpt-4o-mini")
    expect(models.map((m) => m.id)).toContain("gpt-4o")
    expect(models.map((m) => m.id)).toContain("deepseek-chat")
    expect(models.map((m) => m.id)).toContain("deepseek-reasoner")
  })

  it("includes display names in Chinese/English", () => {
    const models = getAvailableModels()
    const mini = models.find((m) => m.id === "gpt-4o-mini")
    expect(mini?.displayName).toBe("GPT-4o Mini")
  })
})

