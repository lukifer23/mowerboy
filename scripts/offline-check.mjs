#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const manifest = JSON.parse(await readFile(resolve(root, "dist/release-manifest.json"), "utf8"));
if (manifest.schema !== 2) throw new Error(`Offline check requires ReleaseManifestV2, found schema ${manifest.schema}.`);
const port = await availablePort();
const origin = `http://127.0.0.1:${port}`;
const vite = spawn(process.execPath, [resolve(root, "node_modules/vite/bin/vite.js"), "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
vite.stdout.on("data", (chunk) => { serverLog += chunk; });
vite.stderr.on("data", (chunk) => { serverLog += chunk; });

let browser;
try {
  await waitForServer();
  console.log(`Offline check: production release ${manifest.releaseId} ready.`);
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 832, height: 749 }, hasTouch: true, isMobile: true, serviceWorkers: "allow" });
  const page = await context.newPage();
  const errors = [];
  const failedRequests = [];
  let pageCrashed = false;
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfailed", (request) => failedRequests.push({
    url: request.url(),
    resourceType: request.resourceType(),
    error: request.failure()?.errorText ?? "unknown request failure",
  }));
  page.on("crash", () => { pageCrashed = true; });
  await page.goto(`${origin}/?test=1`, { waitUntil: "load" });

  await page.waitForFunction(async (expectedRelease) => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.active?.state !== "activated") return false;
    const meta = await caches.open("mowerboy-release-meta-v2");
    const response = await meta.match(new URL("./release-state.json", registration.scope));
    const state = await response?.json();
    return state?.activeReleaseId === expectedRelease;
  }, manifest.releaseId, { timeout: 30_000 });
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));

  const inventory = await page.evaluate(async (releaseManifest) => {
    const registration = await navigator.serviceWorker.getRegistration();
    const meta = await caches.open("mowerboy-release-meta-v2");
    const state = await (await meta.match(new URL("./release-state.json", registration.scope)))?.json();
    const failures = [];
    for (const pack of ["core", "mow", "vacuum"]) {
      if (!state.activePacks.includes(pack)) {
        failures.push(`${pack} pack was not promoted`);
        continue;
      }
      const cache = await caches.open(`mowerboy-release-${releaseManifest.releaseId}-${pack}`);
      for (const entry of releaseManifest.packs[pack]) {
        const response = await cache.match(new URL(entry.path, registration.scope));
        if (!response) { failures.push(`${entry.path} is absent`); continue; }
        const bytes = await response.arrayBuffer();
        const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
          .map((value) => value.toString(16).padStart(2, "0")).join("");
        if (bytes.byteLength !== entry.bytes) failures.push(`${entry.path} byte length differs`);
        if (digest !== entry.sha256) failures.push(`${entry.path} SHA-256 differs`);
        if (response.headers.get("x-mowerboy-sha256") !== entry.sha256) failures.push(`${entry.path} integrity header differs`);
      }
    }
    return { state, failures, cacheNames: await caches.keys() };
  }, manifest);
  if (inventory.failures.length) throw new Error(`Cached release inventory failed:\n${inventory.failures.join("\n")}`);
  if (inventory.state.previousReleaseId !== null && typeof inventory.state.previousReleaseId !== "string") throw new Error("Invalid previous release metadata.");
  console.log(`Offline check: ${manifest.files.length} files match byte lengths and SHA-256 hashes.`);

  await page.evaluate(() => localStorage.setItem("mowerboy-save-v1", JSON.stringify({
    version: 5, selectedMower: "fieldgiant", selectedVacuum: "floorrider", selectedRoom: "community", selectedYard: { kind: "authored", id: "tractor-field" },
    completedYards: [], visitedYards: [], cleanedRooms: [], visitedRooms: [], lastActivity: "mow", control: "magnet",
    volumes: { master: 0, engine: 0, world: 0 }, muted: true, reducedMotion: true, highContrast: false,
    seenTutorial: true, seenVacuumTutorial: true, safeHome: true,
  })));
  await context.setOffline(true);
  await page.waitForFunction(() => navigator.onLine === false, undefined, { timeout: 5_000 });
  const offlineState = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    const meta = await caches.open("mowerboy-release-meta-v2");
    const state = await (await meta.match(new URL("./release-state.json", registration.scope)))?.json();
    return {
      online: navigator.onLine,
      controlled: Boolean(navigator.serviceWorker.controller),
      activeWorkerState: registration?.active?.state ?? null,
      activeReleaseId: state?.activeReleaseId ?? null,
      activePacks: state?.activePacks ?? [],
    };
  });
  if (offlineState.online || !offlineState.controlled || offlineState.activeWorkerState !== "activated" || offlineState.activeReleaseId !== manifest.releaseId) {
    throw new Error(`Browser was not ready for an exact offline release: ${JSON.stringify(offlineState)}`);
  }
  failedRequests.length = 0;
  const mow = await openOfflineActivity({
    page,
    url: `${origin}/?test=1&activity=mow&level=tractor-field&mower=fieldgiant`,
    scene: "play",
    label: "Mow",
    manifest,
    errors,
    failedRequests,
    crashed: () => pageCrashed,
  });
  if (mow.render.machineTexture !== "mower-world-fieldgiant") throw new Error(`offline mower art missing: ${mow.render.machineTexture}`);
  failedRequests.length = 0;
  const vacuum = await openOfflineActivity({
    page,
    url: `${origin}/?test=1&activity=vacuum&room=community&vacuum=floorrider`,
    scene: "vacuum-play",
    label: "Vacuum",
    manifest,
    errors,
    failedRequests,
    crashed: () => pageCrashed,
  });
  if (vacuum.render.machineTexture !== "vacuum-world-floorrider") throw new Error(`offline vacuum art missing: ${vacuum.render.machineTexture}`);
  if (errors.length) throw new Error(`offline console errors:\n${errors.join("\n")}`);
  console.log("Offline production check passed: exact active release, Mow, and Vacuum all reopened without network.");
  await context.close();
} catch (error) {
  console.error(error instanceof Error ? error.stack : error);
  if (serverLog.trim()) console.error(serverLog.trim());
  process.exitCode = 1;
} finally {
  await browser?.close();
  vite.kill("SIGTERM");
}

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(origin)).ok) return; } catch { /* Preview is starting. */ }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`Preview did not start on ${origin}`);
}

async function openOfflineActivity({ page, url, scene, label, manifest, errors, failedRequests, crashed }) {
  const started = performance.now();
  try {
    await page.goto(url, { waitUntil: "load", timeout: 30_000 });
    await page.waitForFunction(
      (expectedScene) => window.__MOWERBOY_TEST__?.snapshot().activeScenes.includes(expectedScene),
      scene,
      { timeout: 30_000 },
    );
    const snapshot = await page.evaluate(() => window.__MOWERBOY_TEST__.snapshot());
    console.log(`Offline check: ${label} reached ${scene} in ${Math.round(performance.now() - started)} ms.`);
    return snapshot;
  } catch (error) {
    const diagnostics = await captureOfflineDiagnostics(page, manifest.releaseId, crashed());
    throw new Error([
      `${label} did not reach ${scene} from the exact offline release.`,
      `Cause: ${error instanceof Error ? error.message : String(error)}`,
      `Console errors: ${JSON.stringify(errors.slice(-12))}`,
      `Failed requests: ${JSON.stringify(failedRequests.slice(-20))}`,
      `Browser state: ${JSON.stringify(diagnostics)}`,
    ].join("\n"));
  }
}

async function captureOfflineDiagnostics(page, expectedReleaseId, crashed) {
  if (crashed || page.isClosed()) return { crashed, pageClosed: page.isClosed(), expectedReleaseId };
  try {
    return await page.evaluate(async (releaseId) => {
      const registration = await navigator.serviceWorker.getRegistration();
      const meta = await caches.open("mowerboy-release-meta-v2");
      const state = await (await meta.match(new URL("./release-state.json", registration.scope)))?.json();
      return {
        expectedReleaseId: releaseId,
        href: location.href,
        online: navigator.onLine,
        controlled: Boolean(navigator.serviceWorker.controller),
        activeWorkerState: registration?.active?.state ?? null,
        releaseState: state ?? null,
        snapshot: window.__MOWERBOY_TEST__?.snapshot() ?? null,
        resources: performance.getEntriesByType("resource").slice(-20).map((entry) => ({
          name: entry.name,
          duration: Math.round(entry.duration),
          transferSize: "transferSize" in entry ? entry.transferSize : null,
        })),
      };
    }, expectedReleaseId);
  } catch (error) {
    return { crashed, pageClosed: page.isClosed(), expectedReleaseId, evaluationError: error instanceof Error ? error.message : String(error) };
  }
}

function availablePort() {
  return new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close(() => typeof address === "object" && address ? resolvePort(address.port) : reject(new Error("No preview port.")));
    });
  });
}
