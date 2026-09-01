import { expect, test, type Browser, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const MOWERS = ["sprout","backyard","zipturn","yardking","wideboy","farmhand","storm","nightowl","sidekick","meadowranger","gardenscout","utilitymate","fieldgiant","pivotranger"];
const LEVELS = ["home","flowers","park","soccer","meadow","farm","neighborhood","hillside","orchard","autumn","community","estate","creekside","school","fairgrounds","moonlight","big-acreage","tractor-field","lakeside-park","forest-clearing"];
const VACUUMS = ["brightupright","cyclone","quickstick","trailercan","workhorse","roundabout","hallkeeper","floorrider"];
const ROOMS = ["living","kitchen","playroom","bedroom","hallway","dining","sunroom","mudroom","workshop","classroom","library","community"];
const SAVE = { version:5, selectedMower:"backyard", selectedVacuum:"brightupright", selectedRoom:"living", selectedYard:{kind:"authored",id:"home"}, completedYards:[], visitedYards:[], cleanedRooms:[], visitedRooms:[], lastActivity:"mow", control:"magnet", volumes:{master:0,engine:0,world:0}, muted:true, reducedMotion:true, highContrast:false, seenTutorial:true, seenVacuumTutorial:true, safeHome:false };

async function boot(page:Page,url:string,scene:string){
  await page.goto(url);
  await expect.poll(async()=>page.evaluate(()=>window.__MOWERBOY_TEST__?.snapshot().activeScenes??[])).toContain(scene);
  return page.evaluate(()=>window.__MOWERBOY_TEST__!.snapshot());
}

async function saveAndBoot(page:Page,patch:Partial<typeof SAVE>,url:string,scene:string){
  await page.goto("/?test=1&screen=title");
  await page.evaluate(value=>sessionStorage.setItem("mowerboy-e2e-save",JSON.stringify(value)),{...SAVE,...patch});
  return boot(page,url,scene);
}

test.beforeEach(async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="fold-inner-fullscreen","Full content matrix runs once at the primary Fold viewport.");
  await page.addInitScript(value=>{
    const override=sessionStorage.getItem("mowerboy-e2e-save");
    localStorage.setItem("mowerboy-save-v1",override??JSON.stringify(value));
  },SAVE);
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
  test.setTimeout(30_000);
  const initial=await boot(page,"/?test=1&activity=mow&level=home&mower=backyard","play");
  const hud=initial.diagnostics!.hud;
  await page.touchscreen.tap(hud.pauseX,hud.secondaryY);expect((await page.evaluate(()=>window.__MOWERBOY_TEST__!.snapshot())).flags.paused).toBe(true);
  const v=page.viewportSize()!;
  await page.touchscreen.tap(v.width/2,v.height/2+20);expect((await page.evaluate(()=>window.__MOWERBOY_TEST__!.snapshot())).flags.paused).toBe(false);
  await page.touchscreen.tap(hud.muteX,hud.y);await expect.poll(async()=>page.evaluate(()=>JSON.parse(localStorage.getItem("mowerboy-save-v1")!).muted)).toBe(false);
  await page.touchscreen.tap(hud.finishX,hud.secondaryY);
  await expect.poll(async()=>page.evaluate(()=>{const flags=window.__MOWERBOY_TEST__!.snapshot().flags;return flags.helperOn||flags.celebrated;})).toBe(true);
  await expect.poll(async()=>page.evaluate(()=>window.__MOWERBOY_TEST__!.snapshot().flags.celebrated),{timeout:12_000}).toBe(true);
});

test("two cold clients reach playable scenes together",async({browser}: { browser: Browser })=>{
  const contexts=await Promise.all([0,1].map(()=>browser.newContext({viewport:{width:832,height:749},hasTouch:true,isMobile:true})));
  try{
    const pages=await Promise.all(contexts.map(async context=>{await context.addInitScript(value=>localStorage.setItem("mowerboy-save-v1",JSON.stringify(value)),SAVE);return context.newPage();}));
    await Promise.all([
      boot(pages[0],"/?test=1&activity=mow&level=home&mower=backyard","play"),
      boot(pages[1],"/?test=1&activity=vacuum&room=living&vacuum=brightupright","vacuum-play"),
    ]);
    for(const page of pages)expect((await page.evaluate(()=>window.__MOWERBOY_TEST__!.snapshot())).diagnostics?.lifecycle.cameras).toBe(2);
  }finally{await Promise.all(contexts.map(context=>context.close()));}
});

test("canvas controls have keyboard and screen-reader mirrors",async({page})=>{
  await boot(page,"/?test=1&screen=title","title");
  await expect(page.getByRole("button",{name:COPY_NAME("Mowers")})).toBeAttached();
  await expect(page.getByRole("button",{name:COPY_NAME("Settings")})).toBeAttached();
  await page.getByRole("button",{name:COPY_NAME("Settings")}).focus();
  await expect(page.getByRole("button",{name:COPY_NAME("Settings")})).toBeFocused();
});

test("responsive redraw keeps exactly one accessibility mirror per title control",async({page})=>{
  await boot(page,"/?test=1&screen=title","title");
  const labels=async()=>page.locator("#mowerboy-a11y button").evaluateAll(buttons=>buttons.map(button=>button.getAttribute("aria-label")));
  expect(await labels()).toEqual(["Full screen","Settings","Mow","Vacuum","Mowers","Yards","Vacuums","Rooms"]);
  await page.setViewportSize({width:844,height:390});
  await expect.poll(async()=>(await labels()).length).toBe(8);
  await page.setViewportSize({width:390,height:844});
  await expect.poll(async()=>labels()).toEqual(["Full screen","Settings","Mow","Vacuum","Mowers","Yards","Vacuums","Rooms"]);
});

test("every room and all four pad directions have accessible activation",async({page})=>{
  await boot(page,"/?test=1&screen=rooms","room-map");
  for(const room of ["Living Room","Kitchen","Playroom","Bedroom","Hallway","Dining Room","Sunroom","Mudroom","Workshop","Classroom","Library","Community Hall"]){
    await expect(page.getByRole("button",{name:new RegExp(`^${room},`)})).toBeAttached();
  }
  await saveAndBoot(page,{control:"pad"},"/?test=1&activity=mow&level=home&mower=backyard","play");
  for(const direction of ["up","down","left","right"]){
    await expect(page.getByRole("button",{name:`Drive ${direction}`})).toBeAttached();
  }
  await page.getByRole("button",{name:"Drive right"}).focus();
  await page.getByRole("button",{name:"Drive right"}).press("Enter");
  await expect.poll(async()=>page.evaluate(()=>window.__MOWERBOY_TEST__!.snapshot().diagnostics?.input.pad.right)).toBe(true);
  await expect.poll(async()=>page.evaluate(()=>window.__MOWERBOY_TEST__!.snapshot().diagnostics?.input.pad.right),{timeout:2_000}).toBe(false);
});

test("Safe Home announces confirmation and works from the keyboard in both activities",async({page})=>{
  for(const [url,scene] of [["/?test=1&activity=mow&level=home&mower=backyard","play"],["/?test=1&activity=vacuum&room=living&vacuum=brightupright","vacuum-play"]] as const){
    await saveAndBoot(page,{safeHome:true},url,scene);
    const home=page.getByRole("button",{name:"Home",exact:true});
    await home.focus();await home.press("Enter");
    await expect(page.locator(".mowerboy-live-region")).toHaveText("Tap Home again");
    expect((await page.evaluate(()=>window.__MOWERBOY_TEST__!.snapshot())).activeScenes).toContain(scene);
    await expect(home).toBeFocused();
    await home.press("Enter");
    await expect.poll(async()=>page.evaluate(()=>window.__MOWERBOY_TEST__!.snapshot().activeScenes)).toContain("title");
  }
});

test("both tutorials survive live orientation changes and keep Play reachable",async({page})=>{
  for(const [url,scene,patch] of [
    ["/?test=1&activity=mow&level=home&mower=backyard","play",{seenTutorial:false}],
    ["/?test=1&activity=vacuum&room=living&vacuum=brightupright","vacuum-play",{seenVacuumTutorial:false}],
  ] as const){
    await saveAndBoot(page,patch,url,scene);
    expect((await page.evaluate(()=>window.__MOWERBOY_TEST__!.snapshot())).flags.tutorial).toBe(true);
    await page.setViewportSize({width:844,height:390});
    const play=page.getByRole("button",{name:"Play",exact:true});
    const box=await play.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x+box!.width).toBeLessThanOrEqual(844);expect(box!.y+box!.height).toBeLessThanOrEqual(390);
    await play.press("Enter");await play.press("Enter");await play.press("Enter");
    await expect.poll(async()=>page.evaluate(()=>window.__MOWERBOY_TEST__!.snapshot().flags.tutorial)).toBe(false);
  }
});

test("normal motion and Calm Motion are both exercised",async({page})=>{
  const animated=await saveAndBoot(page,{reducedMotion:false},"/?test=1&activity=mow&level=home&mower=backyard","play");
  expect(animated.diagnostics!.lifecycle.tweens).toBeGreaterThan(0);
  const calm=await saveAndBoot(page,{reducedMotion:true},"/?test=1&activity=mow&level=home&mower=backyard","play");
  expect(calm.diagnostics!.lifecycle.tweens).toBe(0);
  await saveAndBoot(page,{reducedMotion:false},"/?test=1&activity=vacuum&room=living&vacuum=brightupright","vacuum-play");
});

function COPY_NAME(value:string){return new RegExp(`^${value}`);}
