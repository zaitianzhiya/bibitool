// API Key management endpoint
// GET  /api/keys     — list keys (without secrets)
// POST /api/keys     — set a key for a provider
// DELETE /api/keys?provider=X — remove a key

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { listApiKeys, setApiKey, deleteApiKey } from "@/lib/api-keys"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "请先登录" } },
      { status: 401 }
    )
  }

  const keys = await listApiKeys(session.user.id)
  return NextResponse.json(keys)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "请先登录" } },
      { status: 401 }
    )
  }

  const { provider, key } = await request.json()
  if (
    !provider ||
    !["openai", "deepseek", "anthropic"].includes(provider)
  ) {
    return NextResponse.json(
      { error: { code: "INVALID_PROVIDER", message: "不支持的 AI 服务商" } },
      { status: 400 }
    )
  }
  if (!key || typeof key !== "string" || key.length < 8) {
    return NextResponse.json(
      { error: { code: "INVALID_KEY", message: "API Key 格式无效" } },
      { status: 400 }
    )
  }

  const ok = await setApiKey(session.user.id, provider, key)
  return NextResponse.json({ ok })
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "请先登录" } },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const provider = searchParams.get("provider")
  if (
    !provider ||
    !["openai", "deepseek", "anthropic"].includes(provider)
  ) {
    return NextResponse.json(
      { error: { code: "INVALID_PROVIDER", message: "不支持的 AI 服务商" } },
      { status: 400 }
    )
  }

  const ok = await deleteApiKey(session.user.id, provider as "openai" | "deepseek" | "anthropic")
  return NextResponse.json({ ok })
}
