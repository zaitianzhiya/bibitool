// Export API route
// Placeholder — Phase 4 will implement export functionality

import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  // TODO: Phase 4 - Implement export
  return NextResponse.json(
    { message: "Export endpoint — coming in Phase 4" },
    { status: 501 }
  )
}
