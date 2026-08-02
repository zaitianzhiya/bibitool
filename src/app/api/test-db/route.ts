// Database test endpoint
import { NextResponse } from "next/server"

export async function GET() {
  const results: Record<string, unknown> = {}

  // Test 1: Check environment variables
  results.env = {
    DATABASE_URL: process.env.DATABASE_URL ? "SET" : "NOT SET",
    POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING ? "SET" : "NOT SET",
  }

  // Test 2: Try importing prisma and accessing a model
  try {
    const { prisma } = await import("@/lib/db")
    results.imported = "OK"

    // Check if prisma.user exists
    if (typeof prisma.user !== "undefined") {
      results.modelAccess = "user model accessible"

      // Try a count query
      try {
        const count = await prisma.user.count()
        results.queryResult = { count }
      } catch (queryErr) {
        results.queryError = queryErr instanceof Error ? queryErr.message : String(queryErr)
        if (queryErr instanceof Error) results.queryStack = queryErr.stack?.split("\n").slice(0, 5).join("\n")
      }
    } else {
      results.modelAccess = "user model NOT accessible"
    }
  } catch (importErr) {
    results.importError = importErr instanceof Error ? importErr.message : String(importErr)
    if (importErr instanceof Error) results.importStack = importErr.stack?.split("\n").slice(0, 5).join("\n")
  }

  return NextResponse.json(results)
}
