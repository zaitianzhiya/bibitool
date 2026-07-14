// Tests for src/lib/platforms/bilibili-cookie.ts
// Pure function tests: does NOT mock env vars, tests only module-level behavior
import { describe, it, expect } from "vitest"
import {
  getNextUserAgent,
  buildBilibiliHeaders,
} from "../platforms/bilibili-cookie"

describe("getNextUserAgent", () => {
  it("returns a non-empty user-agent string", () => {
    const ua = getNextUserAgent()
    expect(ua).toBeTruthy()
    expect(ua.length).toBeGreaterThan(50)
  })

  it("rotates through available user-agents", () => {
    const uas = new Set<string>()
    for (let i = 0; i < 10; i++) {
      uas.add(getNextUserAgent())
    }
    // After 10 calls with 5 UAs, we should have seen all 5 options
    expect(uas.size).toBe(5)
  })

  it("includes common browser identifiers", () => {
    const ua = getNextUserAgent()
    expect(ua).toMatch(/Mozilla|Chrome|Firefox/)
  })
})

describe("buildBilibiliHeaders", () => {
  it("includes required common headers", () => {
    const headers = buildBilibiliHeaders()
    expect(headers["Accept"]).toBe("application/json, text/plain, */*")
    expect(headers["Accept-Language"]).toBe("zh-CN,zh;q=0.9,en;q=0.8")
    expect(headers["Referer"]).toBe("https://www.bilibili.com")
  })

  it("includes a valid user-agent", () => {
    const headers = buildBilibiliHeaders()
    expect(headers["User-Agent"]).toBeTruthy()
    expect(headers["User-Agent"].length).toBeGreaterThan(50)
  })

  it("adds cookie header when cookie is provided", () => {
    const headers = buildBilibiliHeaders("test-cookie-value")
    expect(headers["Cookie"]).toBe("test-cookie-value")
  })

  it("omits cookie header when cookie is null", () => {
    const headers = buildBilibiliHeaders(null)
    expect(headers["Cookie"]).toBeUndefined()
  })

  it("omits cookie header when cookie is undefined", () => {
    const headers = buildBilibiliHeaders()
    expect(headers["Cookie"]).toBeUndefined()
  })
})
