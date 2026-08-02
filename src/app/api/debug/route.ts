// Diagnostic endpoint for env var inspection
import { NextResponse } from "next/server"

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || ""
  const atIdx = dbUrl.indexOf("@")
  const masked = atIdx > 0
    ? dbUrl.substring(0, 25) + "..." + dbUrl.substring(atIdx)
    : dbUrl ? dbUrl.substring(0, 40) + "..." : "NOT SET"

  const canConnect = dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://")

  return NextResponse.json({
    db: {
      DATABASE_URL: process.env.DATABASE_URL ? "SET (" + process.env.DATABASE_URL.length + " chars)" : "NOT SET",
      POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING ? "SET" : "NOT SET",
      resolved: masked,
      looksValid: canConnect,
    },
    auth: {
      AUTH_SECRET: process.env.AUTH_SECRET ? "SET" : "NOT SET",
    },
  })
}
