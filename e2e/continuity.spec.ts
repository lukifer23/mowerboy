import { expect, test, type CDPSession } from "@playwright/test";

type ControlScheme = "magnet" | "tap" | "cruise" | "pad";

const SAVE = {
  version: 5,
  selectedMower: "backyard",
  selectedVacuum: "brightupright",
  selectedRoom: "library",
  selectedYard: { kind: "authored", id: "home" },
  completedYards: [],
  visitedYards: [],
  cleanedRooms: [],
  visitedRooms: ["living", "library"],
  lastActivity: "vacuum",
  control: "magnet",
  volumes: { master: 0, engine: 0, world: 0 },
  muted: true,
  reducedMotion: true,
  highContrast: false,
  seenTutorial: true,
  seenVacuumTutorial: true,
  safeHome: false,
};

test("choosing a vacuum preserves the room the child picked", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "fold-inner-fullscreen", "Continuity regression runs once at the primary Fold viewport.");
  await page.addInitScript((value) => {
    if (!localStorage.getItem("mowerboy-save-v1")) localStorage.setItem("mowerboy-save-v1", JSON.stringify(value));
  }, SAVE);
  await page.goto("/?test=1&screen=vacuums");
  await expect.poll(async () => page.evaluate(() => window.__MOWERBOY_TEST__?.snapshot().activeScenes ?? [])).toContain("vacuum-garage");

  const viewport = page.viewportSize()!;
  await page.touchscreen.tap(viewport.width / 2, viewport.height / 2);

  await expect.poll(async () => page.evaluate(() => window.__MOWERBOY_TEST__?.snapshot().activeScenes ?? [])).toContain("vacuum-play");
  await expect.poll(async () => page.evaluate(() => window.__MOWERBOY_TEST__?.snapshot().locationId)).toBe("library");
});

test("gameplay canvases do not trigger repeated readback warnings", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "fold-inner-fullscreen", "Canvas warning regression runs once at the primary Fold viewport.");
  const warnings: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "warning" && (
      message.text().includes("willReadFrequently")
      || message.text().includes("AudioContext was not allowed to start")
    )) warnings.push(message.text());
  });
  await page.addInitScript((value) => {
    if (!localStorage.getItem("mowerboy-save-v1")) localStorage.setItem("mowerboy-save-v1", JSON.stringify(value));
  }, SAVE);
  await page.goto("/?test=1&activity=mow&level=tractor-field&mower=fieldgiant");
  await expect.poll(async () => page.evaluate(() => window.__MOWERBOY_TEST__?.snapshot().activeScenes ?? [])).toContain("play");
  await page.goto("/?test=1&activity=vacuum&room=library&vacuum=hallkeeper");
  await expect.poll(async () => page.evaluate(() => window.__MOWERBOY_TEST__?.snapshot().activeScenes ?? [])).toContain("vacuum-play");
  expect(warnings).toEqual([]);
});

test("the visible Play button advances and dismisses both first-run tutorials", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "fold-inner-fullscreen", "First-run tutorial regression runs once at the primary Fold viewport.");
  const firstRun = { ...SAVE, seenTutorial: false, seenVacuumTutorial: false };
  await page.addInitScript((value) => localStorage.setItem("mowerboy-save-v1", JSON.stringify(value)), firstRun);

  for (const activity of [
    { url: "/?test=1&activity=mow&level=home&mower=backyard", saved: "seenTutorial" },
    { url: "/?test=1&activity=vacuum&room=living&vacuum=brightupright", saved: "seenVacuumTutorial" },
  ] as const) {
    await page.goto(activity.url);
    await expect.poll(async () => page.evaluate(() => window.__MOWERBOY_TEST__?.snapshot().flags.tutorial)).toBe(true);
    const viewport = page.viewportSize()!;
    for (let step = 0; step < 3; step++) await page.touchscreen.tap(viewport.width / 2, viewport.height - 88);
    await expect.poll(async () => page.evaluate(() => window.__MOWERBOY_TEST__?.snapshot().flags.tutorial)).toBe(false);
    await expect.poll(async () => page.evaluate((key) => Boolean(JSON.parse(localStorage.getItem("mowerboy-save-v1")!)[key]), activity.saved)).toBe(true);
  }
});

test("all four touch control schemes move both real activities", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "fold-inner-fullscreen", "Control matrix runs once at the primary Fold viewport.");
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript((value) => {
    if (!localStorage.getItem("mowerboy-save-v1")) localStorage.setItem("mowerboy-save-v1", JSON.stringify(value));
  }, SAVE);
  await page.goto("/?test=1");
  const cdp = await page.context().newCDPSession(page);
  const schemes: ControlScheme[] = ["magnet", "tap", "cruise", "pad"];
  const activities = [
    { scene: "play", url: "/?test=1&activity=mow&level=home&mower=backyard" },
    { scene: "vacuum-play", url: "/?test=1&activity=vacuum&room=living&vacuum=brightupright" },
  ];

  for (const activity of activities) {
    for (const control of schemes) {
      await page.evaluate((value) => {
        const current = JSON.parse(localStorage.getItem("mowerboy-save-v1")!);
        localStorage.setItem("mowerboy-save-v1", JSON.stringify({ ...current, control: value }));
      }, control);
      await page.goto(activity.url);
      await expect.poll(async () => page.evaluate(() => window.__MOWERBOY_TEST__?.snapshot().activeScenes ?? [])).toContain(activity.scene);
      const before = await page.evaluate(() => window.__MOWERBOY_TEST__!.snapshot().machine!);
      const viewport = page.viewportSize()!;
      if (control === "magnet") {
        await holdTouch(cdp, viewport.width * .76, viewport.height * .66, 850);
      } else if (control === "tap") {
        await page.touchscreen.tap(viewport.width * .76, viewport.height * .66);
        await page.waitForTimeout(1_000);
      } else if (control === "cruise") {
        await page.waitForTimeout(1_000);
      } else {
        await holdTouch(cdp, 132, viewport.height - 194, 850);
      }
      const after = await page.evaluate(() => window.__MOWERBOY_TEST__!.snapshot().machine!);
      expect(Math.hypot(after.x - before.x, after.y - before.y), `${activity.scene} ${control}`).toBeGreaterThan(3);
    }
  }
  await cdp.detach();
  expect(errors).toEqual([]);
});

test("touch cancellation clears pointer and pad ownership in both activities", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "fold-inner-fullscreen", "Interruption regression runs once at the primary Fold viewport.");
  await page.addInitScript((value) => {
    if (!localStorage.getItem("mowerboy-save-v1")) localStorage.setItem("mowerboy-save-v1", JSON.stringify(value));
  }, SAVE);
  const cdp = await page.context().newCDPSession(page);
  const activities = [
    { scene: "play", url: "/?test=1&activity=mow&level=home&mower=backyard" },
    { scene: "vacuum-play", url: "/?test=1&activity=vacuum&room=living&vacuum=brightupright" },
  ];

  for (const activity of activities) {
    for (const control of ["magnet", "pad"] as const) {
      await page.goto(activity.url);
      await expect.poll(
        async () => page.evaluate(() => window.__MOWERBOY_TEST__?.snapshot().activeScenes ?? []),
        { timeout: 20_000 },
      ).toContain(activity.scene);
      await page.evaluate((value) => {
        const current = JSON.parse(localStorage.getItem("mowerboy-save-v1")!);
        localStorage.setItem("mowerboy-save-v1", JSON.stringify({ ...current, control: value }));
      }, control);
      await page.reload();
      await expect.poll(async () => page.evaluate(() => window.__MOWERBOY_TEST__?.snapshot().activeScenes ?? [])).toContain(activity.scene);
      await expect.poll(async () => page.evaluate(() => window.__MOWERBOY_TEST__!.snapshot().diagnostics!.input.scheme)).toBe(control);
      const viewport = page.viewportSize()!;
      const point = control === "pad"
        ? { x: 132, y: viewport.height - 194 }
        : { x: viewport.width * .62, y: viewport.height * .62 };
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...point, radiusX: 12, radiusY: 12 }] });
      await expect.poll(async () => page.evaluate(() => window.__MOWERBOY_TEST__!.snapshot().diagnostics!.input.owner)).toBe(control === "pad" ? "pad" : "pointer");
      await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
      await expect.poll(async () => page.evaluate(() => {
        const snapshot = window.__MOWERBOY_TEST__!.snapshot();
        return { owner: snapshot.diagnostics!.input.owner, throttle: snapshot.machine!.throttle };
      })).toEqual({ owner: "none", throttle: 0 });
    }
  }
  await cdp.detach();
});

test("gallery swipes and long selection screens scroll without accidental selection", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "fold-inner-fullscreen", "Gesture regression runs once at the primary Fold viewport.");
  await page.addInitScript((value) => {
    if (!localStorage.getItem("mowerboy-save-v1")) localStorage.setItem("mowerboy-save-v1", JSON.stringify(value));
  }, SAVE);
  const cdp = await page.context().newCDPSession(page);

  for (const screen of ["mowers", "vacuums"]) {
    await page.goto(`/?test=1&screen=${screen}`);
    await expect.poll(async () => page.evaluate(() => window.__MOWERBOY_TEST__?.snapshot().ui.galleryIndex ?? null)).not.toBeNull();
    const before = await page.evaluate(() => window.__MOWERBOY_TEST__!.snapshot().ui.galleryIndex);
    await dragTouch(cdp, 650, 380, 200, 380);
    const after = await page.evaluate(() => window.__MOWERBOY_TEST__!.snapshot().ui.galleryIndex);
    expect(after).toBe((before ?? 0) + 1);
  }
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("mowerboy-save-v1")!));
  expect(saved.selectedMower).toBe("backyard");
  expect(saved.selectedVacuum).toBe("brightupright");

  for (const screen of ["yards", "rooms", "settings"]) {
    await page.goto(`/?test=1&screen=${screen}`);
    await dragTouch(cdp, 410, 680, 410, 220);
    const scroll = await page.evaluate(() => window.__MOWERBOY_TEST__!.snapshot().ui.scrollOffset);
    expect(scroll, screen).toBeLessThan(-40);
    if (screen === "settings") {
      await page.touchscreen.tap(212, 566);
      const tips = await page.evaluate(() => JSON.parse(localStorage.getItem("mowerboy-save-v1")!));
      expect(tips.seenTutorial).toBe(false);
      expect(tips.seenVacuumTutorial).toBe(false);
      await page.touchscreen.tap(620, 566);
      await expect.poll(async () => page.evaluate(() => Boolean(JSON.parse(localStorage.getItem("mowerboy-save-v1")!).safeHome))).toBe(true);
      const afterToggle = await page.evaluate(() => window.__MOWERBOY_TEST__!.snapshot().ui.scrollOffset);
      expect(afterToggle).toBe(scroll);
    }
  }

  await page.goto("/?test=1&activity=mow&level=tractor-field&mower=fieldgiant");
  await expect.poll(async () => page.evaluate(() => window.__MOWERBOY_TEST__?.snapshot().locationId)).toBe("tractor-field");
  await page.goto("/?test=1&screen=yards");
  for (let i = 0; i < 3; i++) await dragTouch(cdp, 410, 680, 410, 220);
  await page.touchscreen.tap(416, 684);
  await expect.poll(async () => page.evaluate(() => window.__MOWERBOY_TEST__?.snapshot().locationId)).toBe("tractor-field");
  await cdp.detach();
});

async function holdTouch(cdp: CDPSession, x: number, y: number, ms: number) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, radiusX: 12, radiusY: 12 }] });
  await new Promise((resolve) => setTimeout(resolve, ms));
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await new Promise((resolve) => setTimeout(resolve, 250));
}

async function dragTouch(cdp: CDPSession, x1: number, y1: number, x2: number, y2: number) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x1, y: y1, radiusX: 12, radiusY: 12 }] });
  for (let step = 1; step <= 8; step++) {
    const t = step / 8;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t, radiusX: 12, radiusY: 12 }] });
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await new Promise((resolve) => setTimeout(resolve, 350));
}
