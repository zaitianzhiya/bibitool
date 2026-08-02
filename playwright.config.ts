// Playwright configuration
import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3099",
    headless: true,
  },
  webServer: {
    command: "npm start",
    port: 3099,
    reuseExistingServer: true,
    timeout: 30000,
  },
})
