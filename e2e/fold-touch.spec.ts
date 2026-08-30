import { expect, test, type Page } from "@playwright/test";

const SAVE = {
  version: 4,
  selectedMower: "backyard",
  selectedVacuum: "brightupright",
  selectedRoom: "living",
  completedYards: [],
  visitedYards: [],
  cleanedRooms: [],
  visitedRooms: [],
  lastActivity: "mow",
  control: "magnet",
  volumes: { master: 0, engine: 0, world: 0 },
  muted: true,
  reducedMotion: true,
  highContrast: false,
  seenTutorial: true,
  seenVacuumTutorial: true,
  safeHome: true,
};

type Snapshot = ReturnType<NonNullable<Window["__MOWERBOY_TEST__"]>["snapshot"]>;

async function prepare(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript((value) => localStorage.setItem("mowerboy-save-v1", JSON.stringify(value)), SAVE);
  return errors;
}

async function state(page: Page): Promise<Snapshot> {
  return page.evaluate(() => {
    if (!window.__MOWERBOY_TEST__) throw new Error("MowerBoy test diagnostics are unavailable");
    return window.__MOWERBOY_TEST__.snapshot();
  });
}

async function waitForScene(page: Page, scene: string): Promise<void> {
  await expect.poll(async () => (await state(page)).activeScenes).toContain(scene);
}

async function touchDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...from, radiusX: 12, radiusY: 12 }] });
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, radiusX: 12, radiusY: 12 }],
    });
    await page.waitForTimeout(70);
  }
  await page.waitForTimeout(500);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

test("canvas tracks the full visual viewport with no browser scroll", async ({ page }) => {
  const errors = await prepare(page);
  await page.goto("/?test=1");
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  const viewport = page.viewportSize()!;
  await expect.poll(async () => canvas.boundingBox()).toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height });
  const documentSize = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    innerWidth,
    innerHeight,
  }));
  expect(documentSize).toEqual({ scrollWidth: viewport.width, scrollHeight: viewport.height, innerWidth: viewport.width, innerHeight: viewport.height });
  expect(errors).toEqual([]);
});

test("activity composition keeps a readable machine and open center strip", async ({ page }) => {
  const errors = await prepare(page);
  for (const route of [
    "/?activity=mow&test=1&level=home&mower=backyard",
    "/?activity=vacuum&test=1&room=living&vacuum=brightupright",
  ]) {
    await page.goto(route);
    await waitForScene(page, route.includes("activity=mow") ? "play" : "vacuum-play");
    const diagnostics = (await state(page)).diagnostics!;
    const machine = diagnostics.machine.screenBounds;
    expect(Math.max(machine.width, machine.height)).toBeGreaterThanOrEqual(88);
    expect(diagnostics.machine.assetMode).toBe("production");
    expect(diagnostics.playableRect.width).toBeGreaterThan(100);
    expect(machine.x + machine.width).toBeGreaterThan(diagnostics.playableRect.x);
    expect(machine.x).toBeLessThan(diagnostics.playableRect.x + diagnostics.playableRect.width);
  }
  expect(errors).toEqual([]);
});

for (const activity of ["mow", "vacuum"] as const) {
  test(`${activity} follows a held finger, makes progress, and stops after release`, async ({ page }) => {
    const errors = await prepare(page);
    const route = activity === "mow"
      ? "/?activity=mow&test=1&level=home&mower=backyard"
      : "/?activity=vacuum&test=1&room=living&vacuum=brightupright";
    await page.goto(route);
    await waitForScene(page, activity === "mow" ? "play" : "vacuum-play");
    const before = await state(page);
    expect(before.machine).not.toBeNull();
    const viewport = page.viewportSize()!;
    await touchDrag(page, { x: viewport.width * 0.62, y: viewport.height * 0.62 }, { x: viewport.width * 0.82, y: viewport.height * 0.72 });
    const moved = await state(page);
    expect(Math.hypot(moved.machine!.x - before.machine!.x, moved.machine!.y - before.machine!.y)).toBeGreaterThan(8);
    expect(moved.progress!).toBeGreaterThanOrEqual(before.progress!);
    await page.waitForTimeout(1300);
    const stopped = await state(page);
    expect(stopped.machine!.throttle).toBe(0);
    expect(stopped.machine!.speed).toBeLessThan(moved.machine!.speed);
    expect(errors).toEqual([]);
  });
}

test("Safe Home ignores one accidental touch and exits on the second", async ({ page }) => {
  const errors = await prepare(page);
  await page.goto("/?activity=mow&test=1&level=home&mower=backyard");
  await waitForScene(page, "play");
  await page.touchscreen.tap(48, 48);
  await expect.poll(async () => (await state(page)).activeScenes).toContain("play");
  await page.touchscreen.tap(48, 48);
  await expect.poll(async () => (await state(page)).activeScenes).toContain("title");
  expect(errors).toEqual([]);
});

test("an open activity survives a live Fold or orientation resize", async ({ page }) => {
  const errors = await prepare(page);
  await page.goto("/?activity=vacuum&test=1&room=living&vacuum=brightupright");
  await waitForScene(page, "vacuum-play");
  const before = await state(page);
  const current = page.viewportSize()!;
  const next = current.width > current.height
    ? { width: Math.min(832, current.height), height: Math.max(749, current.width) }
    : { width: Math.max(844, current.height), height: Math.min(390, current.width) };
  await page.setViewportSize(next);
  await expect.poll(async () => {
    const value = await state(page);
    return { width: Math.round(value.width), height: Math.round(value.height), scenes: value.activeScenes };
  }).toEqual({ width: next.width, height: next.height, scenes: ["vacuum-play"] });
  const after = await state(page);
  expect(after.machine).not.toBeNull();
  expect(after.progress).toBe(before.progress);
  expect(errors).toEqual([]);
});
