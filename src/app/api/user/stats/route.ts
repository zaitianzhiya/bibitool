// User stats API — dashboard data
// GET /api/user/stats → { credits, totalSummaries, usedToday }

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDailyUsage } from "@/lib/quota"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "请先登录" } },
      { status: 401 }
    )
  }

  try {
    const stats = await getDailyUsage(session.user.id)
    return NextResponse.json(stats)
  } catch (err) {
    console.error("User stats error:", err)
    return NextResponse.json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "获取用户数据失败",
        },
      },
      { status: 500 }
    )
  }
}
