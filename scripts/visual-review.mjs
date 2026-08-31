#!/usr/bin/env node
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const baseUrl = process.env.MOWERBOY_URL ?? "http://127.0.0.1:5173";
const output = resolve(process.env.MOWERBOY_VISUAL_OUTPUT ?? ".gstack/visual-review/latest");
const mowers = ["sprout","backyard","zipturn","yardking","wideboy","farmhand","storm","nightowl","sidekick","meadowranger","gardenscout","utilitymate","fieldgiant","pivotranger"];
const levels = ["home","flowers","park","soccer","meadow","farm","neighborhood","hillside","orchard","autumn","community","estate","creekside","school","fairgrounds","moonlight","big-acreage","tractor-field","lakeside-park","forest-clearing"];
const vacuums = ["brightupright","cyclone","quickstick","trailercan","workhorse","roundabout","hallkeeper","floorrider"];
const rooms = ["living","kitchen","playroom","bedroom","hallway","dining","sunroom","mudroom","workshop","classroom","library","community"];
const save = { version:5, selectedMower:"backyard", selectedVacuum:"brightupright", selectedRoom:"living", selectedYard:{kind:"authored",id:"home"}, completedYards:[], visitedYards:[], cleanedRooms:[], visitedRooms:[], lastActivity:"mow", control:"magnet", volumes:{master:0,engine:0,world:0}, muted:true, reducedMotion:true, highContrast:false, seenTutorial:true, seenVacuumTutorial:true, safeHome:false };

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 832, height: 749 }, hasTouch: true, isMobile: true });
await context.addInitScript((value) => localStorage.setItem("mowerboy-save-v1", JSON.stringify(value)), save);
const page = await context.newPage();
const evidence = [];
try {
  for (const id of mowers) await capture(`mower-${id}`, `/?test=1&activity=mow&level=home&mower=${id}`, "play", `mower-world-${id}`);
  for (const id of levels) await capture(`yard-${id}`, `/?test=1&activity=mow&level=${id}&mower=backyard`, "play", "mower-world-backyard");
  for (const id of vacuums) await capture(`vacuum-${id}`, `/?test=1&activity=vacuum&room=living&vacuum=${id}`, "vacuum-play", `vacuum-world-${id}`);
  for (const id of rooms) await capture(`room-${id}`, `/?test=1&activity=vacuum&room=${id}&vacuum=brightupright`, "vacuum-play", "vacuum-world-brightupright");
  await writeFile(resolve(output, "evidence.json"), `${JSON.stringify({ timestamp:new Date().toISOString(), viewport:{width:832,height:749}, captures:evidence }, null, 2)}\n`);
  console.log(`Visual review capture complete: ${evidence.length} gameplay-scale scenes in ${output}`);
} finally {
  await browser.close();
}

async function capture(name, path, scene, expectedTexture) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "load" });
  await page.waitForFunction((key) => window.__MOWERBOY_TEST__?.snapshot().activeScenes.includes(key), scene);
  const snapshot = await page.evaluate(() => window.__MOWERBOY_TEST__.snapshot());
  if (snapshot.render.machineTexture !== expectedTexture) throw new Error(`${name}: expected ${expectedTexture}, found ${snapshot.render.machineTexture}`);
  if (!snapshot.machine || snapshot.progress < 0 || snapshot.progress >= .03) throw new Error(`${name}: invalid fresh gameplay state`);
  await page.screenshot({ path: resolve(output, `${name}.png`) });
  evidence.push({ name, scene, texture: snapshot.render.machineTexture, machine: snapshot.machine, progress: snapshot.progress });
}
