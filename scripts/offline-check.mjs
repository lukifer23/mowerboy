#!/usr/bin/env node
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = 5174;
const origin = `http://127.0.0.1:${port}`;
const vite = spawn("node", [resolve(root, "node_modules/vite/bin/vite.js"), "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
vite.stdout.on("data", (chunk) => { serverLog += chunk; });
vite.stderr.on("data", (chunk) => { serverLog += chunk; });

let browser;
try {
  await waitForServer();
  console.log("Offline check: production preview ready.");
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 832, height: 749 }, hasTouch: true, isMobile: true, serviceWorkers: "allow" });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}/?test=1`, { waitUntil: "load" });
  console.log("Offline check: online shell loaded.");
  let workerState;
  for (let attempt = 0; attempt < 80; attempt++) {
    workerState = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      const cacheNames = await caches.keys();
      const counts = Object.fromEntries(await Promise.all(cacheNames.map(async (name) => [name, (await (await caches.open(name)).keys()).length])));
      return {
        installing: registration?.installing?.state ?? null,
        waiting: registration?.waiting?.state ?? null,
        active: registration?.active?.state ?? null,
        counts,
      };
    });
    if (workerState.active === "activated") break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (workerState?.active !== "activated") throw new Error(`service worker did not activate: ${JSON.stringify(workerState)}`);
  // A reload after ready removes the controllerchange timing race and proves
  // the installed worker owns a normal navigation before networking is cut.
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  console.log("Offline check: service worker controls navigation.");
  await page.waitForFunction(async () => {
    const names = await caches.keys();
    const name = names.find((item) => item.startsWith("mowerboy-release-"));
    if (!name) return false;
    return (await (await caches.open(name)).keys()).length >= 52;
  });
  console.log("Offline check: shell and production packs cached.");
  await page.evaluate(() => localStorage.setItem("mowerboy-save-v1", JSON.stringify({
    version: 5, selectedMower: "fieldgiant", selectedVacuum: "floorrider", selectedRoom: "community", selectedYard: { kind: "authored", id: "tractor-field" },
    completedYards: [], visitedYards: [], cleanedRooms: [], visitedRooms: [], lastActivity: "mow", control: "magnet",
    volumes: { master: 0, engine: 0, world: 0 }, muted: true, reducedMotion: true, highContrast: false,
    seenTutorial: true, seenVacuumTutorial: true, safeHome: true,
  })));
  await context.setOffline(true);
  console.log("Offline check: network disabled.");
  await page.goto(`${origin}/?test=1&activity=mow&level=tractor-field&mower=fieldgiant`);
  await page.waitForFunction(() => window.__MOWERBOY_TEST__?.snapshot().activeScenes.includes("play"));
  const mow = await page.evaluate(() => window.__MOWERBOY_TEST__.snapshot());
  if (mow.render.machineTexture !== "mower-world-fieldgiant") throw new Error(`offline mower art missing: ${mow.render.machineTexture}`);
  console.log("Offline check: mowing scene and Field Giant art loaded.");
  await page.goto(`${origin}/?test=1&activity=vacuum&room=community&vacuum=floorrider`);
  await page.waitForFunction(() => window.__MOWERBOY_TEST__?.snapshot().activeScenes.includes("vacuum-play"));
  const vacuum = await page.evaluate(() => window.__MOWERBOY_TEST__.snapshot());
  if (vacuum.render.machineTexture !== "vacuum-world-floorrider") throw new Error(`offline vacuum art missing: ${vacuum.render.machineTexture}`);
  console.log("Offline check: vacuum scene and Floor Rider art loaded.");
  if (errors.length) throw new Error(`offline console errors:\n${errors.join("\n")}`);
  console.log("Offline production check passed: cached shell + all 59 assets, Mow and Vacuum production art loaded.");
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
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Preview did not start on ${origin}`);
}
