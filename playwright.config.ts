import { defineConfig, devices } from "@playwright/test";

const viewports = [
  ["phone-portrait", { width: 390, height: 844 }],
  ["phone-landscape", { width: 844, height: 390 }],
  ["fold-inner-browser", { width: 832, height: 608 }],
  ["fold-inner-fullscreen", { width: 832, height: 749 }],
  ["tablet", { width: 1024, height: 768 }],
] as const;
const e2ePort = Number(process.env.MOWERBOY_E2E_PORT ?? 5176);
const externalBaseUrl = process.env.MOWERBOY_E2E_URL;
const baseURL = externalBaseUrl ?? `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // Phaser boot performs real canvas and production-art work. CI runners use
  // one worker so the full production-art suites cannot starve each other;
  // the dedicated cold-client test still verifies true concurrent play.
  workers: process.env.CI ? 1 : 2,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: [["list"], ["html", { outputFolder: ".gstack/playwright-report", open: "never" }]],
  use: {
    baseURL,
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
  webServer: externalBaseUrl ? undefined : {
    command: "node scripts/gateway.mjs",
    url: `${baseURL}/healthz`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      ...process.env,
      PORT: String(e2ePort),
      MOWERBOY_HOST: "127.0.0.1",
      MOWERBOY_NO_OPEN: "1",
      MOWERBOY_FORCE_BUILD: "1",
    },
  },
});
