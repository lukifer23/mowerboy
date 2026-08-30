import { expect, test, type Page } from "@playwright/test";

const MOWERS = ["sprout","backyard","zipturn","yardking","wideboy","farmhand","storm","nightowl","sidekick","meadowranger","gardenscout","utilitymate","fieldgiant","pivotranger"];
const LEVELS = ["home","flowers","park","soccer","meadow","farm","neighborhood","hillside","orchard","autumn","community","estate","creekside","school","fairgrounds","moonlight","big-acreage","tractor-field","lakeside-park","forest-clearing"];
const VACUUMS = ["brightupright","cyclone","quickstick","trailercan","workhorse","roundabout","hallkeeper","floorrider"];
const ROOMS = ["living","kitchen","playroom","bedroom","hallway","dining","sunroom","mudroom","workshop","classroom","library","community"];
const SAVE = { version:4, selectedMower:"backyard", selectedVacuum:"brightupright", selectedRoom:"living", completedYards:[], visitedYards:[], cleanedRooms:[], visitedRooms:[], lastActivity:"mow", control:"magnet", volumes:{master:0,engine:0,world:0}, muted:true, reducedMotion:true, highContrast:false, seenTutorial:true, seenVacuumTutorial:true, safeHome:false };

async function boot(page:Page,url:string,scene:string){
  await page.goto(url);
  await expect.poll(async()=>page.evaluate(()=>window.__MOWERBOY_TEST__?.snapshot().activeScenes??[])).toContain(scene);
  return page.evaluate(()=>window.__MOWERBOY_TEST__!.snapshot());
}

test.beforeEach(async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="fold-inner-fullscreen","Full content matrix runs once at the primary Fold viewport.");
  await page.addInitScript(value=>localStorage.setItem("mowerboy-save-v1",JSON.stringify(value)),SAVE);
});

test("every gallery and Settings screen boots without console errors",async({page})=>{
  const errors:string[]=[];page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});page.on("pageerror",e=>errors.push(e.message));
  for(const [screen,scene] of [["mowers","garage"],["yards","map"],["vacuums","vacuum-garage"],["rooms","room-map"],["settings","settings"]] as const) await boot(page,`/?test=1&screen=${screen}`,scene);
  expect(errors).toEqual([]);
});

test("all 14 mowers and all 8 vacuums use their production world art",async({page})=>{
  test.setTimeout(90_000);
  const errors:string[]=[];page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});page.on("pageerror",e=>errors.push(e.message));
  for(const id of MOWERS){const state=await boot(page,`/?test=1&activity=mow&level=home&mower=${id}`,"play");expect(state.render.machineTexture).toBe(`mower-world-${id}`);}
  for(const id of VACUUMS){const state=await boot(page,`/?test=1&activity=vacuum&room=living&vacuum=${id}`,"vacuum-play");expect(state.render.machineTexture).toBe(`vacuum-world-${id}`);}
  expect(errors).toEqual([]);
});

test("every authored yard and room creates a real playable scene",async({page})=>{
  test.setTimeout(120_000);
  const errors:string[]=[];page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});page.on("pageerror",e=>errors.push(e.message));
  for(const id of LEVELS){const state=await boot(page,`/?test=1&activity=mow&level=${id}&mower=backyard`,"play");expect(state.machine).not.toBeNull();expect(state.progress).toBeGreaterThanOrEqual(0);expect(state.progress).toBeLessThan(.03);}
  for(const id of ROOMS){const state=await boot(page,`/?test=1&activity=vacuum&room=${id}&vacuum=brightupright`,"vacuum-play");expect(state.machine).not.toBeNull();expect(state.progress).toBeGreaterThanOrEqual(0);expect(state.progress).toBeLessThan(.03);}
  expect(errors).toEqual([]);
});

test("Pause, Quiet, and Finish are live child-safe controls",async({page})=>{
  test.setTimeout(20_000);
  const initial=await boot(page,"/?test=1&activity=mow&level=home&mower=backyard","play");
  const hud=initial.diagnostics!.hud;
  await page.touchscreen.tap(hud.pauseX,hud.secondaryY);expect((await page.evaluate(()=>window.__MOWERBOY_TEST__!.snapshot())).flags.paused).toBe(true);
  const v=page.viewportSize()!;
  await page.touchscreen.tap(v.width/2,v.height/2+20);expect((await page.evaluate(()=>window.__MOWERBOY_TEST__!.snapshot())).flags.paused).toBe(false);
  await page.touchscreen.tap(hud.muteX,hud.y);await expect.poll(async()=>page.evaluate(()=>JSON.parse(localStorage.getItem("mowerboy-save-v1")!).muted)).toBe(false);
  await page.touchscreen.tap(hud.finishX,hud.secondaryY);await expect.poll(async()=>page.evaluate(()=>window.__MOWERBOY_TEST__!.snapshot().flags.celebrated),{timeout:12_000}).toBe(true);
});
