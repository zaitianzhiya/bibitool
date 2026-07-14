// API Key connectivity test endpoint
// POST /api/keys/test { provider: "openai"|"deepseek"|"anthropic", key?: string }
// If "key" is omitted, the user's own stored key is used.
// Returns { ok: boolean, message: string }

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  resolveApiKey,
  testProviderConnection,
} from "@/lib/api-keys"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "请先登录" } },
      { status: 401 }
    )
  }

  const { provider, key: providedKey } = await request.json()
  if (
    !provider ||
    !["openai", "deepseek", "anthropic"].includes(provider)
  ) {
    return NextResponse.json(
      { error: { code: "INVALID_PROVIDER", message: "不支持的 AI 服务商" } },
      { status: 400 }
    )
  }

  // If the user provided a key directly, test that. Otherwise use stored key.
  const apiKey =
    providedKey && typeof providedKey === "string" && providedKey.length >= 8
      ? providedKey
      : await resolveApiKey(session.user.id, provider)

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        message: `未配置 ${provider} API Key，请在下方输入框粘贴你的 Key`,
      },
      { status: 200 } // 200 even on failure — this is a test result, not a server error
    )
  }

  const result = await testProviderConnection(provider, apiKey)
  return NextResponse.json(result)
}
