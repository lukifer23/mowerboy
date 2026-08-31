import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const durationSeconds = Number.parseInt(process.env.SOAK_SECONDS ?? "300", 10);
const warmupSeconds = Number.parseInt(process.env.SOAK_WARMUP_SECONDS ?? "10", 10);
const maxHeapGrowthMiB = Number(process.env.SOAK_MAX_HEAP_GROWTH_MIB ?? "24");
const maxP95FrameMs = Number(process.env.SOAK_MAX_P95_FRAME_MS ?? "40");
const maxWorstFrameMs = Number(process.env.SOAK_MAX_WORST_FRAME_MS ?? "180");
const baseUrl = process.env.MOWERBOY_URL ?? "http://127.0.0.1:5173";
const save = {
  version: 5, selectedMower: "backyard", selectedVacuum: "brightupright", selectedRoom: "living",
  selectedYard: { kind: "authored", id: "home" }, completedYards: [], visitedYards: [], cleanedRooms: [], visitedRooms: [],
  lastActivity: "mow", control: "magnet", volumes: { master: 0, engine: 0, world: 0 }, muted: true,
  reducedMotion: false, highContrast: false, seenTutorial: true, seenVacuumTutorial: true, safeHome: true,
};

let browser;
let context;
let page;
let cdp;
const errors = [];
const heaps = [];
const samples = [];
let cycles = 0;
let activityStarts = 0;
let startedAt = 0;
let failure = null;

try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  context = await browser.newContext({ viewport: { width: 832, height: 749 }, hasTouch: true, isMobile: true });
  page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript((value) => localStorage.setItem("mowerboy-save-v1", JSON.stringify(value)), save);
  await page.goto(`${baseUrl}/?test=1`, { waitUntil: "load" });
  await page.locator("canvas").waitFor({ state: "visible" });
  cdp = await context.newCDPSession(page);
  await page.waitForTimeout(warmupSeconds * 1000);
  // Load both activity-specific packs and create/destroy both simulations before
  // taking resource baselines. Lazy production assets make a title-only wait an
  // invalid warm-up for texture stability.
  await runActivity({ cardX: 258, scene: "play", direction: 1, label: "Warm-up mower" });
  await safeHome();
  await runActivity({ cardX: 574, scene: "vacuum-play", direction: -1, label: "Warm-up vacuum" });
  await safeHome();
  samples.length = 0;
  activityStarts = 0;
  await cdp.send("HeapProfiler.collectGarbage");
  startedAt = await page.evaluate(() => performance.now());

  while (await elapsedSeconds() < durationSeconds) {
    await runActivity({ cardX: 258, scene: "play", direction: cycles % 2 === 0 ? 1 : -1, label: "Mower" });
    await safeHome();
    await runActivity({ cardX: 574, scene: "vacuum-play", direction: cycles % 2 === 0 ? -1 : 1, label: "Vacuum" });
    await safeHome();

    await cdp.send("HeapProfiler.collectGarbage");
    const heap = await cdp.send("Runtime.getHeapUsage");
    heaps.push(heap.usedSize);
    cycles++;
    process.stdout.write(`cycle ${cycles}: ${(heap.usedSize / 1048576).toFixed(1)} MiB post-GC heap, ${errors.length} errors\n`);
  }
} catch (error) {
  failure = error instanceof Error ? error : new Error(String(error));
} finally {
  const heapGrowthMiB = ((heaps.at(-1) ?? 0) - (heaps[0] ?? 0)) / 1048576;
  const p95Frames = samples.map((sample) => sample.lifecycle.frameMs.p95);
  const worstFrames = samples.map((sample) => sample.lifecycle.frameMs.worst);
  const textureCounts = samples.map((sample) => sample.lifecycle.textures);
  const listenerCounts = samples.map((sample) => sample.lifecycle.inputListeners);
  const cameraCounts = samples.map((sample) => sample.lifecycle.cameras);
  const sceneResources = Object.fromEntries(["play", "vacuum-play"].map((scene) => {
    const sceneSamples = samples.filter((sample) => sample.scene === scene).map((sample) => sample.lifecycle);
    return [scene, {
      textures: range(sceneSamples.map((sample) => sample.textures)),
      inputListeners: range(sceneSamples.map((sample) => sample.inputListeners)),
      cameras: range(sceneSamples.map((sample) => sample.cameras)),
    }];
  }));
  const assertions = {
    completedCycle: cycles > 0,
    noConsoleErrors: errors.length === 0,
    heapGrowthWithinBudget: heapGrowthMiB <= maxHeapGrowthMiB,
    framesWithinBudget: Math.max(0, ...p95Frames) <= maxP95FrameMs && Math.max(0, ...worstFrames) <= maxWorstFrameMs,
    stableResources: Object.values(sceneResources).every((resource) => resource.cameras.min === 2
      && resource.cameras.max === 2
      && resource.textures.max - resource.textures.min <= 2
      && resource.inputListeners.max - resource.inputListeners.min <= 4),
  };
  const passed = !failure && Object.values(assertions).every(Boolean);
  const report = {
    timestamp: new Date().toISOString(), requestedSeconds: durationSeconds, warmupSeconds,
    elapsedSeconds: startedAt && page ? Math.round(await elapsedSeconds().catch(() => 0) * 10) / 10 : 0,
    viewport: { width: 832, height: 749 }, cycles, activityStarts,
    budgets: { maxHeapGrowthMiB, maxP95FrameMs, maxWorstFrameMs },
    heapMiB: {
      first: roundedMiB(heaps[0]), last: roundedMiB(heaps.at(-1)), min: roundedMiB(heaps.length ? Math.min(...heaps) : 0),
      max: roundedMiB(heaps.length ? Math.max(...heaps) : 0), growth: Math.round(heapGrowthMiB * 10) / 10,
    },
    runtime: {
      maxP95FrameMs: maximum(p95Frames), maxWorstFrameMs: maximum(worstFrames),
      textures: range(textureCounts), inputListeners: range(listenerCounts), cameras: range(cameraCounts),
      byScene: sceneResources,
    },
    assertions, consoleErrors: errors, failure: failure?.stack ?? null, passed,
  };
  await mkdir(".gstack/soak", { recursive: true });
  await writeFile(".gstack/soak/latest.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
  try { await cdp?.detach(); } catch { /* Browser may already be gone. */ }
  await browser?.close();
  console.log(JSON.stringify(report, null, 2));
  if (!passed) process.exitCode = 1;
}

async function runActivity({ cardX, scene, direction, label }) {
  await page.touchscreen.tap(cardX, 340);
  const before = await waitForScene(scene);
  const beforeProgress = before.progress ?? 0;
  const movement = await drive(direction);
  const after = await snapshot();
  const distance = Math.hypot((after.machine?.x ?? 0) - (before.machine?.x ?? 0), (after.machine?.y ?? 0) - (before.machine?.y ?? 0));
  if (distance < 5) throw new Error(`${label} did not move during soak.`);
  if ((after.progress ?? 0) <= beforeProgress) throw new Error(`${label} moved but did not transform the surface.`);
  if (!movement.during?.machine || !movement.stopped?.machine || movement.stopped.machine.throttle > 0.02 || movement.stopped.machine.speed >= movement.during.machine.speed) {
    throw new Error(`${label} did not release to a gentle stop.`);
  }
  const lifecycle = after.diagnostics?.lifecycle;
  if (!lifecycle) throw new Error(`${label} lifecycle diagnostics are missing.`);
  samples.push({ scene, lifecycle });
  activityStarts++;
}

async function drive(direction) {
  const from = { x: direction > 0 ? 500 : 330, y: 560 };
  const to = { x: direction > 0 ? 700 : 130, y: 500 };
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...from, radiusX: 12, radiusY: 12 }] });
  for (let index = 1; index <= 18; index++) {
    const ratio = index / 18;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio, radiusX: 12, radiusY: 12 }] });
    await page.waitForTimeout(120);
  }
  const during = await snapshot();
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(1_200);
  return { during, stopped: await snapshot() };
}

async function safeHome() {
  await page.touchscreen.tap(50, 52);
  await page.waitForTimeout(180);
  await page.touchscreen.tap(50, 52);
  await waitForScene("title");
}

function snapshot() { return page.evaluate(() => window.__MOWERBOY_TEST__?.snapshot()); }
async function waitForScene(key) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const current = await snapshot();
    if (current?.activeScenes.includes(key)) return current;
    await page.waitForTimeout(100);
  }
  throw new Error(`Timed out waiting for ${key}.`);
}
function elapsedSeconds() { return page.evaluate((started) => (performance.now() - started) / 1000, startedAt); }
function roundedMiB(bytes = 0) { return Math.round(bytes / 1048576 * 10) / 10; }
function minimum(values) { return values.length ? Math.min(...values) : 0; }
function maximum(values) { return values.length ? Math.max(...values) : 0; }
function range(values) { return { min: minimum(values), max: maximum(values) }; }
