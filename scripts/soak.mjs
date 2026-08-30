import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const durationSeconds = Number.parseInt(process.env.SOAK_SECONDS ?? "300", 10);
const baseUrl = process.env.MOWERBOY_URL ?? "http://127.0.0.1:5173";
const save = {
  version: 5,
  selectedMower: "backyard",
  selectedVacuum: "brightupright",
  selectedRoom: "living",
  selectedYard: { kind: "authored", id: "home" },
  completedYards: [], visitedYards: [], cleanedRooms: [], visitedRooms: [],
  lastActivity: "mow", control: "magnet",
  volumes: { master: 0, engine: 0, world: 0 }, muted: true,
  reducedMotion: false, highContrast: false,
  seenTutorial: true, seenVacuumTutorial: true, safeHome: true,
};

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 832, height: 749 }, hasTouch: true, isMobile: true });
const page = await context.newPage();
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
await page.addInitScript((value) => localStorage.setItem("mowerboy-save-v1", JSON.stringify(value)), save);
await page.goto(`${baseUrl}/?test=1`);
await page.locator("canvas").waitFor({ state: "visible" });
const cdp = await context.newCDPSession(page);

const snapshot = () => page.evaluate(() => window.__MOWERBOY_TEST__?.snapshot());
const waitForScene = async (key) => {
  for (let attempt = 0; attempt < 80; attempt++) {
    const current = await snapshot();
    if (current?.activeScenes.includes(key)) return current;
    await page.waitForTimeout(100);
  }
  throw new Error(`Timed out waiting for ${key}`);
};
const tap = (x, y) => page.touchscreen.tap(x, y);
const drive = async (direction) => {
  const from = { x: direction > 0 ? 500 : 330, y: 560 };
  const to = { x: direction > 0 ? 700 : 130, y: 500 };
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...from, radiusX: 12, radiusY: 12 }] });
  for (let i = 1; i <= 18; i++) {
    const t = i / 18;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, radiusX: 12, radiusY: 12 }],
    });
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(350);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(400);
};
const home = async () => {
  await tap(50, 52);
  await page.waitForTimeout(180);
  await tap(50, 52);
  await waitForScene("title");
};

const startedAt = await page.evaluate(() => performance.now());
const activeElapsedSeconds = () => page.evaluate((started) => (performance.now() - started) / 1000, startedAt);
const heaps = [];
let cycles = 0;
let activityStarts = 0;
while (await activeElapsedSeconds() < durationSeconds) {
  await tap(258, 340);
  const mowBefore = await waitForScene("play");
  await drive(cycles % 2 === 0 ? 1 : -1);
  const mowAfter = await snapshot();
  if (!mowAfter?.machine || !mowBefore.machine || Math.hypot(mowAfter.machine.x - mowBefore.machine.x, mowAfter.machine.y - mowBefore.machine.y) < 5) {
    throw new Error("Mower did not move during soak");
  }
  activityStarts++;
  await home();

  await tap(574, 340);
  const vacuumBefore = await waitForScene("vacuum-play");
  await drive(cycles % 2 === 0 ? -1 : 1);
  const vacuumAfter = await snapshot();
  if (!vacuumAfter?.machine || !vacuumBefore.machine || Math.hypot(vacuumAfter.machine.x - vacuumBefore.machine.x, vacuumAfter.machine.y - vacuumBefore.machine.y) < 5) {
    throw new Error("Vacuum did not move during soak");
  }
  activityStarts++;
  await home();

  const heap = await cdp.send("Runtime.getHeapUsage");
  heaps.push(heap.usedSize);
  cycles++;
  process.stdout.write(`cycle ${cycles}: ${(heap.usedSize / 1024 / 1024).toFixed(1)} MiB heap, ${errors.length} errors\n`);
}

const report = {
  timestamp: new Date().toISOString(),
  requestedSeconds: durationSeconds,
  elapsedSeconds: Math.round(await activeElapsedSeconds() * 10) / 10,
  viewport: { width: 832, height: 749 },
  cycles,
  activityStarts,
  heapMiB: {
    first: Math.round((heaps[0] ?? 0) / 1024 / 1024 * 10) / 10,
    last: Math.round((heaps.at(-1) ?? 0) / 1024 / 1024 * 10) / 10,
    min: Math.round(Math.min(...heaps) / 1024 / 1024 * 10) / 10,
    max: Math.round(Math.max(...heaps) / 1024 / 1024 * 10) / 10,
  },
  consoleErrors: errors,
  passed: errors.length === 0 && cycles > 0,
};
await mkdir(".gstack/soak", { recursive: true });
await writeFile(".gstack/soak/latest.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
await cdp.detach();
await browser.close();
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
