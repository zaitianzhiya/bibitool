// API key management helpers
// Stores AI provider keys per-user in the Prisma database, encrypted via AUTH_SECRET.
// User keys take precedence over process.env keys for all LLM calls.
//
// Supported providers: openai, deepseek, anthropic

import { prisma } from "@/lib/db"
import { createHmac, randomBytes } from "crypto"

type Provider = "openai" | "deepseek" | "anthropic"

interface ProviderKey {
  provider: Provider
  /** Whether the key is configured (set by user) */
  configured: boolean
  /** Masked preview—eg "sk-...abc123"—never returns the actual key */
  preview?: string
}

const ENV_KEY_MAP: Record<Provider, string> = {
  openai: "OPENAI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
}

// ---- encryption helpers (AES-256-CBC) ----

function getEncryptionKey(): Buffer {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "fallback-dev-key-change-in-production"
  return createHmac("sha256", secret).update("bibitool:keys").digest()
}

/** Derive a deterministic 32-byte key + 16-byte IV from the secret */
function getCipherKeyIv(): { key: Buffer; iv: Buffer } {
  const raw = getEncryptionKey()
  return {
    key: raw,
    iv: raw.subarray(0, 16),
  }
}

export function encryptKey(plaintext: string): string | null {
  try {
    const { key, iv } = getCipherKeyIv()
    const cipher = (null as unknown as typeof import("crypto")).createCipheriv;
    const c = (require("crypto") as typeof import("crypto")).createCipheriv(
      "aes-256-cbc",
      key,
      iv
    )
    let encrypted = c.update(plaintext, "utf8", "hex")
    encrypted += c.final("hex")
    return encrypted
  } catch {
    return null
  }
}

export function decryptKey(encrypted: string): string | null {
  try {
    const { key, iv } = getCipherKeyIv()
    const d = (require("crypto") as typeof import("crypto")).createDecipheriv(
      "aes-256-cbc",
      key,
      iv
    )
    let decrypted = d.update(encrypted, "hex", "utf8")
    decrypted += d.final("utf8")
    return decrypted
  } catch {
    return null
  }
}

// ---- key resolution ----

/**
 * Resolve the best available API key for a given provider.
 * Order: user's personal key (from DB) → env var → null
 */
export async function resolveApiKey(
  userId: string | undefined | null,
  provider: Provider
): Promise<string | null> {
  // 1. User's personal key (stored in a separate table)
  if (userId) {
    try {
      const record = await prisma.aPIKey.findUnique({
        where: { userId_provider: { userId, provider } },
        select: { encryptedKey: true },
      })
      if (record) {
        const decrypted = decryptKey(record.encryptedKey)
        if (decrypted) return decrypted
      }
    } catch {
      // table may not exist yet — ignore
    }
  }

  // 2. Environment variable
  const envKey = process.env[ENV_KEY_MAP[provider]]
  if (envKey) return envKey

  return null
}

/**
 * Check if ANY configured key is available for at least one provider.
 * Used by the summarize route to decide whether LLM calls are possible.
 */
export async function anyApiKeyAvailable(
  userId?: string | null
): Promise<boolean> {
  const providers: Provider[] = ["openai", "deepseek", "anthropic"]
  for (const p of providers) {
    const key = await resolveApiKey(userId, p)
    if (key) return true
  }
  return false
}

// ---- key management CRUD (for the dashboard) ----

export async function setApiKey(
  userId: string,
  provider: Provider,
  plaintextKey: string
): Promise<boolean> {
  const encrypted = encryptKey(plaintextKey)
  if (!encrypted) return false

  try {
    await prisma.aPIKey.upsert({
      where: { userId_provider: { userId, provider } },
      create: { userId, provider, encryptedKey: encrypted },
      update: { encryptedKey: encrypted, updatedAt: new Date() },
    })
    return true
  } catch (err) {
    console.error(`Failed to save ${provider} key for ${userId}:`, err)
    return false
  }
}

export async function deleteApiKey(
  userId: string,
  provider: Provider
): Promise<boolean> {
  try {
    await prisma.aPIKey.delete({
      where: { userId_provider: { userId, provider } },
    })
    return true
  } catch {
    return false
  }
}

export async function listApiKeys(userId: string): Promise<ProviderKey[]> {
  const providers: Provider[] = ["openai", "deepseek", "anthropic"]
  try {
    const rows = await prisma.aPIKey.findMany({
      where: { userId },
      select: { provider: true, encryptedKey: true },
    })
    const map = new Map(rows.map((r) => [r.provider, r.encryptedKey]))

    return providers.map((provider) => {
      const enc = map.get(provider)
      const preview = enc ? maskKey(decryptKey(enc) || "") : undefined
      return { provider, configured: !!enc, preview }
    })
  } catch {
    // table may not exist yet — return all as not-configured
    return providers.map((provider) => ({ provider, configured: false }))
  }
}

function maskKey(key: string): string {
  if (key.length <= 8) return "***"
  return key.slice(0, 4) + "..." + key.slice(-4)
}

// ---- connectivity test ----

export async function testProviderConnection(
  provider: Provider,
  apiKey: string
): Promise<{ ok: boolean; message: string }> {
  try {
    switch (provider) {
      case "openai": {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(8000),
        })
        return res.ok
          ? { ok: true, message: "OpenAI 连接成功" }
          : { ok: false, message: `OpenAI 返回 ${res.status}` }
      }
      case "deepseek": {
        const res = await fetch("https://api.deepseek.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(8000),
        })
        return res.ok
          ? { ok: true, message: "DeepSeek 连接成功" }
          : { ok: false, message: `DeepSeek 返回 ${res.status}` }
      }
      case "anthropic": {
        const res = await fetch("https://api.anthropic.com/v1/models", {
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          signal: AbortSignal.timeout(8000),
        })
        return res.ok
          ? { ok: true, message: "Anthropic 连接成功" }
          : { ok: false, message: `Anthropic 返回 ${res.status}` }
      }
      default:
        return { ok: false, message: "不支持的 provider" }
    }
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "连接超时",
    }
  }
}
