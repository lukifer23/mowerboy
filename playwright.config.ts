import { defineConfig, devices } from "@playwright/test";

const viewports = [
  ["phone-portrait", { width: 390, height: 844 }],
  ["phone-landscape", { width: 844, height: 390 }],
  ["fold-inner-browser", { width: 832, height: 608 }],
  ["fold-inner-fullscreen", { width: 832, height: 749 }],
  ["tablet", { width: 1024, height: 768 }],
] as const;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: [["list"], ["html", { outputFolder: ".gstack/playwright-report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    channel: "chrome",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  projects: viewports.map(([name, viewport]) => ({
    name,
    use: { viewport, hasTouch: true, isMobile: true },
  })),
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
