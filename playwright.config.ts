import { defineConfig, devices } from "@playwright/test";

/**
 * E2E mock rejimida ishlaydi (`NEXT_PUBLIC_API_MOCKING=1`). Serverni o'zingiz
 * ishga tushiring (`npm run dev`), so'ng `npm run test:e2e`.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", trace: "on-first-retry" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
});
