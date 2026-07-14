// Multi-model router with 3-tier fallback
// Routes AI requests to the optimal model based on cost and capability
// Primary: GPT-4o-mini 鈫?Fallback1: DeepSeek 鈫?Fallback2: GPT-4o

type Provider = "openai" | "deepseek"

interface ModelRoute {
  model: string
  provider: Provider
  displayName: string
  costTier: "low" | "high"
}

const MODEL_REGISTRY: Record<string, ModelRoute> = {
  "gpt-4o-mini": {
    model: "gpt-4o-mini",
    provider: "openai",
    displayName: "GPT-4o Mini",
    costTier: "low",
  },
  "gpt-4o": {
    model: "gpt-4o",
    provider: "openai",
    displayName: "GPT-4o",
    costTier: "high",
  },
  "deepseek-chat": {
    model: "deepseek-chat",
    provider: "deepseek",
    displayName: "DeepSeek Chat",
    costTier: "low",
  },
  "deepseek-reasoner": {
    model: "deepseek-reasoner",
    provider: "deepseek",
    displayName: "DeepSeek Reasoner",
    costTier: "high",
  },
}

const PRIMARY_MODEL = "gpt-4o-mini"
const FALLBACK_MODEL = "deepseek-chat"
const LAST_RESORT_MODEL = "gpt-4o"

/**
 * Select the best model for a given task
 */
export function routeModel(
  _mode: "brief" | "detailed",
  preferCheap = true
): ModelRoute {
  if (preferCheap) {
    return MODEL_REGISTRY[PRIMARY_MODEL]
  }
  return MODEL_REGISTRY[LAST_RESORT_MODEL]
}

/**
 * Get fallback model in priority order:
 *   GPT-4o-mini 鈫?DeepSeek Chat 鈫?GPT-4o
 */
export function getFallbackModel(current: {
  model: string
  provider: Provider
}): ModelRoute {
  if (current.model === PRIMARY_MODEL) {
    return MODEL_REGISTRY[FALLBACK_MODEL]
  }
  if (current.model === FALLBACK_MODEL) {
    return MODEL_REGISTRY[LAST_RESORT_MODEL]
  }
  // Already at last resort 鈥?cycle back to primary
  return MODEL_REGISTRY[LAST_RESORT_MODEL]
}

/**
 * Get model registry for frontend display
 */
export function getAvailableModels(): { id: string; displayName: string }[] {
  return Object.entries(MODEL_REGISTRY).map(([id, info]) => ({
    id,
    displayName: info.displayName,
  }))
}

