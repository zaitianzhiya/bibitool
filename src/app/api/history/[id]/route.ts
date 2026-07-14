// History detail API — get single summary by ID
// GET /api/history/:id

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "请先登录" } },
      { status: 401 }
    )
  }

  const { id } = await params

  try {
    const summary = await prisma.summary.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        url: true,
        platform: true,
        coverUrl: true,
        duration: true,
        subtitle: true,
        summary: true,
        mode: true,
        model: true,
        status: true,
        createdAt: true,
        userId: true,
      },
    })

    if (!summary || summary.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "记录不存在" } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...summary,
      subtitle: summary.subtitle
        ? JSON.parse(summary.subtitle)
        : null,
    })
  } catch (err) {
    console.error("History detail error:", err)
    return NextResponse.json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "获取记录详情失败",
        },
      },
      { status: 500 }
    )
  }
}
