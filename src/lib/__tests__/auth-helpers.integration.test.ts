// Integration tests for src/lib/auth-helpers.ts
// Mocks next-auth/jwt to test session extraction

import { describe, it, expect, vi, beforeEach } from "vitest"

const mockGetToken = vi.hoisted(() => vi.fn())

vi.mock("next-auth/jwt", () => ({
  getToken: mockGetToken,
}))

import { getSession } from "../auth-helpers"

beforeEach(() => {
  vi.clearAllMocks()
  process.env.AUTH_SECRET = "test-secret"
})

describe("getSession", () => {
  it("returns session data when token is valid", async () => {
    mockGetToken.mockResolvedValue({ sub: "user-123", email: "test@example.com", name: "Test" })
    const result = await getSession(new Request("https://example.com/dashboard"))
    expect(result?.id).toBe("user-123")
    expect(result?.email).toBe("test@example.com")
  })

  it("returns null when no token found", async () => {
    mockGetToken.mockResolvedValue(null)
    expect(await getSession(new Request("https://example.com/"))).toBeNull()
  })

  it("returns null when token has no sub field", async () => {
    mockGetToken.mockResolvedValue({ email: "orphan@example.com" })
    expect(await getSession(new Request("https://example.com/"))).toBeNull()
  })

  it("handles optional fields", async () => {
    mockGetToken.mockResolvedValue({ sub: "user-no-email" })
    const result = await getSession(new Request("https://example.com/"))
    expect(result?.id).toBe("user-no-email")
    expect(result?.email).toBeUndefined()
  })

  it("returns null when getToken throws", async () => {
    mockGetToken.mockRejectedValue(new Error("JWT error"))
    expect(await getSession(new Request("https://example.com/"))).toBeNull()
  })
})

