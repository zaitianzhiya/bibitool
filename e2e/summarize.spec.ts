// E2E test — full user flow: navigate → paste B站 URL → extract subtitles → view result
// Run with: npx playwright test

import { test, expect } from "@playwright/test"

const BASE = "http://localhost:3099"

test.describe("BibiTool — summarize flow", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto(BASE)
    await expect(page.locator("h1")).toContainText("AI 一键总结")
    await expect(page).toHaveTitle(/BibiTool/)
  })

  test("navigates to summarize page", async ({ page }) => {
    await page.goto(BASE)
    await page.click("text=开始总结")
    await expect(page).toHaveURL(/\/summarize/)
    await expect(page.locator("#video-url")).toBeVisible()
  })

  test("shows error for invalid URL", async ({ page }) => {
    await page.goto(`${BASE}/summarize`)
    await page.fill("#video-url", "not-a-valid-url")
    await page.click("button:has-text('提取字幕')")
    await expect(page.locator("text=Please enter a valid URL").or(page.locator("text=URL"))).toBeVisible({ timeout: 5000 })
  })

  test("shows error for unsupported platform", async ({ page }) => {
    await page.goto(`${BASE}/summarize`)
    await page.fill("#video-url", "https://www.example.com/video")
    await page.click("button:has-text('提取字幕')")
    await expect(page.locator("text=不支持").or(page.locator("text=Unsupported"))).toBeVisible({ timeout: 10000 })
  })

  test("extracts subtitles from B站 video", async ({ page }) => {
    test.setTimeout(30000)
    await page.goto(`${BASE}/summarize`)
    await page.fill("#video-url", "https://www.bilibili.com/video/BV1GJ411x7h7")
    await page.click("button:has-text('提取字幕')")

    // Should show video info card with title
    await expect(page.locator("text=官方 MV")).toBeVisible({ timeout: 15000 })

    // Should show subtitle section
    await expect(page.locator("text=字幕内容")).toBeVisible({ timeout: 5000 })
  })

  test("login page loads", async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await expect(page.locator("h1")).toContainText("登录")
    await expect(page.locator("#login-email")).toBeVisible()
    await expect(page.locator("#login-password")).toBeVisible()
  })

  test("register page loads", async ({ page }) => {
    await page.goto(`${BASE}/register`)
    await expect(page.locator("h1")).toContainText("注册")
    await expect(page.locator("#reg-name")).toBeVisible()
    await expect(page.locator("#reg-email")).toBeVisible()
    await expect(page.locator("#reg-password")).toBeVisible()
  })

  test("dashboard redirects to login when unauthenticated", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    // Middleware redirects to /login
    await expect(page).toHaveURL(/\/login/)
  })

  test("history redirects to login when unauthenticated", async ({ page }) => {
    await page.goto(`${BASE}/history`)
    await expect(page).toHaveURL(/\/login/)
  })

  test("OG image API returns image", async ({ request }) => {
    const response = await request.get(`${BASE}/api/og?title=Test&platform=bilibili&duration=300`)
    expect(response.status()).toBe(200)
    expect(response.headers()["content-type"]).toContain("image/png")
  })
})
