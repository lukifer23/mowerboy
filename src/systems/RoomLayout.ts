import Phaser from "phaser";
import type { FloorType, RoomDef } from "../data/rooms";
import { containsObstaclePoint, type ShapeObstacle } from "./worldGeometry";

export type FurnitureKind = "sofa" | "table" | "chair" | "bed" | "cabinet" | "island" | "bench" | "shelf" | "desk" | "stage" | "plant" | "workbench" | "toybox";

export interface RoomProp extends ShapeObstacle {
  kind: FurnitureKind;
  width: number;
  height: number;
  rotation: number;
}

export interface RoomLayout {
  width: number;
  height: number;
  startX: number;
  startY: number;
  floor: Phaser.GameObjects.Image;
  props: Phaser.GameObjects.Image[];
  obstacles: RoomProp[];
  floorAt: (x: number, y: number) => FloorType;
  destroy: () => void;
}

const COLORS: Record<FloorType, [string, string, string]> = {
  carpet: ["#9ab58e", "#849f79", "#b4c8a9"],
  rug: ["#345f73", "#d7a64a", "#f0e1bd"],
  hardwood: ["#bb7a42", "#92542f", "#d99a5b"],
  tile: ["#d7d9d2", "#aab2ad", "#eef0e8"],
  concrete: ["#898d8b", "#686d6b", "#a7aaa8"],
};

export function buildRoom(scene: Phaser.Scene, room: RoomDef): RoomLayout {
  ensureFurnitureTextures(scene);
  const canvas = document.createElement("canvas");
  canvas.width = room.width;
  canvas.height = room.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  paintFloor(ctx, room);
  const key = `room-floor-${room.id}-${Math.random().toString(36).slice(2, 7)}`;
  const texture = scene.textures.addCanvas(key, canvas)!;
  const floor = scene.add.image(0, 0, key).setOrigin(0).setDepth(0);
  const obstacles = authoredFurniture(room);
  const props = obstacles.map((p) => {
    const image = scene.add.image(p.x, p.y, `furniture-${p.kind}`).setDisplaySize(p.width, p.height).setRotation(p.rotation).setDepth(3);
    image.setData("prop", p);
    return image;
  });
  const rug = room.floors.includes("rug") ? roomRugRect(room) : null;
  return {
    width: room.width,
    height: room.height,
    startX: room.width * 0.16,
    startY: room.height * 0.82,
    floor,
    props,
    obstacles,
    floorAt: (x, y) => rug && x >= rug.x && x <= rug.x + rug.w && y >= rug.y && y <= rug.y + rug.h ? "rug" : room.floors.find((f) => f !== "rug") ?? "carpet",
    destroy: () => {
      floor.destroy();
      for (const prop of props) prop.destroy();
      texture.destroy();
    },
  };
}

export function safeDebrisPoint(obstacles: RoomProp[], x: number, y: number): boolean {
  return obstacles.every((p) => !containsObstaclePoint({ ...p, collisionW: p.width + 70, collisionH: p.height + 70 }, x, y));
}

export function roomRugRect(room: RoomDef) {
  return { x: room.width * 0.28, y: room.height * 0.27, w: room.width * 0.46, h: room.height * 0.48 };
}

function paintFloor(ctx: CanvasRenderingContext2D, room: RoomDef): void {
  const base = room.floors.find((f) => f !== "rug") ?? room.floors[0];
  const [a, b, c] = COLORS[base];
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, room.width, room.height);
  if (base === "hardwood") {
    for (let y = 0; y < room.height; y += 54) {
      ctx.fillStyle = y % 108 ? a : c;
      ctx.fillRect(0, y, room.width, 52);
      ctx.strokeStyle = b;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(room.width, y); ctx.stroke();
      for (let x = (y / 54 % 2) * 105; x < room.width; x += 210) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 52); ctx.stroke(); }
    }
  } else if (base === "tile") {
    ctx.strokeStyle = b; ctx.lineWidth = 4;
    for (let x = 0; x < room.width; x += 112) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, room.height); ctx.stroke(); }
    for (let y = 0; y < room.height; y += 112) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(room.width, y); ctx.stroke(); }
  } else if (base === "carpet") {
    ctx.strokeStyle = c; ctx.globalAlpha = 0.18; ctx.lineWidth = 2;
    for (let y = 6; y < room.height; y += 12) for (let x = (y % 24); x < room.width; x += 18) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 7, y - 4); ctx.stroke(); }
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = b; ctx.globalAlpha = 0.12;
    for (let i = 0; i < Math.round(room.width * room.height / 8000); i++) { const x = (i * 97) % room.width; const y = (i * 211) % room.height; ctx.fillRect(x, y, 5 + i % 8, 3 + i % 5); }
    ctx.globalAlpha = 1;
  }
  if (room.floors.includes("rug")) {
    const r = roomRugRect(room);
    ctx.fillStyle = COLORS.rug[0]; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = COLORS.rug[1]; ctx.lineWidth = 18; ctx.strokeRect(r.x + 9, r.y + 9, r.w - 18, r.h - 18);
    ctx.strokeStyle = COLORS.rug[2]; ctx.lineWidth = 5;
    for (let x = r.x + 36; x < r.x + r.w - 20; x += 48) { ctx.beginPath(); ctx.moveTo(x, r.y + 22); ctx.lineTo(x + 24, r.y + r.h - 22); ctx.stroke(); }
  }
  // Walls and baseboards give every room a strong, readable boundary.
  ctx.strokeStyle = "#5c4638"; ctx.lineWidth = 42; ctx.strokeRect(21, 21, room.width - 42, room.height - 42);
  ctx.strokeStyle = "#f0e1c7"; ctx.lineWidth = 12; ctx.strokeRect(44, 44, room.width - 88, room.height - 88);
  // Windows, door thresholds, and daylight pools make the room read as a
  // place rather than a bordered texture, without becoming collision traps.
  const daylight = ctx.createLinearGradient(room.width * .62, 44, room.width * .62, room.height * .48);
  daylight.addColorStop(0, "rgba(255,249,214,.22)"); daylight.addColorStop(1, "rgba(255,249,214,0)");
  ctx.fillStyle = daylight; ctx.beginPath(); ctx.moveTo(room.width*.48,50);ctx.lineTo(room.width*.76,50);ctx.lineTo(room.width*.84,room.height*.5);ctx.lineTo(room.width*.4,room.height*.5);ctx.closePath();ctx.fill();
  ctx.fillStyle="#9bd6e8"; for(const x of [room.width*.56,room.width*.68]){ctx.fillRect(x-52,29,104,31);ctx.strokeStyle="#f7efe2";ctx.lineWidth=7;ctx.strokeRect(x-52,29,104,31);}
  ctx.fillStyle="#7a563d";ctx.fillRect(room.width*.1-70,room.height-61,140,24);ctx.fillStyle="#d8bd91";ctx.fillRect(room.width*.1-58,room.height-58,116,18);
}

export function authoredFurniture(room: RoomDef): RoomProp[] {
  const w = room.width, h = room.height;
  const add = (kind: FurnitureKind, x: number, y: number, width: number, height: number, rotation = 0): RoomProp => ({ kind, x, y, width, height, collisionW: width * 0.88, collisionH: height * 0.82, r: Math.min(width, height) * 0.42, rotation, shape: kind === "plant" ? "circle" : kind === "table" ? "ellipse" : "rect" });
  switch (room.id) {
    case "living": return [add("sofa", w*.5,h*.13,430,150), add("chair",w*.82,h*.32,150,170,.32), add("table",w*.5,h*.52,250,145), add("plant",w*.12,h*.18,105,105), add("cabinet",w*.88,h*.79,210,105)];
    case "kitchen": return [add("cabinet",w*.5,h*.09,700,115), add("island",w*.52,h*.48,390,185), add("cabinet",w*.92,h*.5,115,500), add("table",w*.23,h*.31,220,150)];
    case "playroom": return [add("toybox",w*.17,h*.16,220,120), add("sofa",w*.57,h*.11,380,140), add("table",w*.53,h*.51,230,160), add("shelf",w*.9,h*.48,120,390)];
    case "bedroom": return [add("bed",w*.54,h*.2,400,255), add("cabinet",w*.88,h*.27,130,260), add("desk",w*.2,h*.18,250,130), add("chair",w*.2,h*.36,110,120)];
    case "hallway": return [add("bench",w*.28,h*.16,270,95), add("cabinet",w*.68,h*.14,240,95), add("plant",w*.88,h*.22,95,95)];
    case "dining": return [add("table",w*.52,h*.48,430,250), ...[-1,1].flatMap(s => [add("chair",w*.52+s*285,h*.48,105,115), add("chair",w*.52+s*150,h*.48-190,105,115,Math.PI/2), add("chair",w*.52+s*150,h*.48+190,105,115,Math.PI/2)]), add("cabinet",w*.5,h*.1,360,105)];
    case "sunroom": return [add("sofa",w*.5,h*.12,390,135), add("plant",w*.12,h*.18,120,120), add("plant",w*.88,h*.18,120,120), add("table",w*.5,h*.54,250,155)];
    case "mudroom": return [add("bench",w*.5,h*.13,420,110), add("cabinet",w*.9,h*.42,120,360), add("shelf",w*.18,h*.12,220,100)];
    case "workshop": return [add("workbench",w*.5,h*.1,680,130), add("shelf",w*.92,h*.38,130,400), add("workbench",w*.22,h*.56,330,150), add("cabinet",w*.72,h*.72,230,150)];
    case "classroom": return [add("desk",w*.5,h*.1,430,120), ...[-1,0,1].flatMap((_column,i)=>[add("table",w*(.3+i*.2),h*.42,200,120),add("table",w*(.3+i*.2),h*.68,200,120)]), add("shelf",w*.92,h*.5,120,410)];
    case "library": return [add("shelf",w*.5,h*.09,760,110), add("shelf",w*.91,h*.45,115,480), add("table",w*.52,h*.52,300,180), add("chair",w*.3,h*.52,120,130), add("chair",w*.74,h*.52,120,130)];
    default: return [add("stage",w*.5,h*.1,720,150), add("table",w*.33,h*.48,280,160), add("table",w*.67,h*.48,280,160), add("bench",w*.5,h*.78,480,105), add("plant",w*.1,h*.18,115,115), add("plant",w*.9,h*.18,115,115)];
  }
}

function ensureFurnitureTextures(scene: Phaser.Scene): void {
  const kinds: FurnitureKind[] = ["sofa","table","chair","bed","cabinet","island","bench","shelf","desk","stage","plant","workbench","toybox"];
  for (const kind of kinds) {
    const key = `furniture-${kind}`;
    if (scene.textures.exists(key)) continue;
    const c = document.createElement("canvas"); c.width = 256; c.height = 160;
    const g = c.getContext("2d", { willReadFrequently: true })!; g.clearRect(0,0,256,160); drawFurniture(g,kind);
    scene.textures.addCanvas(key,c);
  }
}

function drawFurniture(g:CanvasRenderingContext2D,kind:FurnitureKind):void{
  g.save();g.shadowColor="rgba(0,0,0,.34)";g.shadowBlur=12;g.shadowOffsetY=7;
  const rr=(x:number,y:number,w:number,h:number,r:number,color:string)=>{g.fillStyle=color;g.beginPath();g.roundRect(x,y,w,h,r);g.fill();};
  if(kind==="plant"){
    g.fillStyle="#2e6e3c";for(let i=0;i<9;i++){g.save();g.translate(128,84);g.rotate(i*Math.PI/4.5);g.beginPath();g.ellipse(30,0,38,13,0,0,Math.PI*2);g.fill();g.restore();}rr(98,103,60,39,17,"#9a5f38");rr(106,109,44,8,4,"#5a3825");
  }else if(kind==="sofa"||kind==="chair"){
    const x=kind==="chair"?63:16,w=kind==="chair"?130:224;rr(x,25,w,112,22,kind==="sofa"?"#4f7896":"#8a654d");g.shadowColor="transparent";rr(x+13,41,w-26,67,14,kind==="sofa"?"#7097b0":"#aa8061");g.strokeStyle="rgba(30,38,42,.32)";g.lineWidth=5;g.beginPath();g.moveTo(128,43);g.lineTo(128,107);g.stroke();rr(x+5,26,13,108,7,"#38576d");rr(x+w-18,26,13,108,7,"#38576d");
  }else if(kind==="bed"){
    rr(15,21,226,120,16,"#7d503a");g.shadowColor="transparent";rr(28,29,200,103,12,"#f3d9dc");rr(39,38,70,35,10,"#fff8f2");rr(147,38,70,35,10,"#fff8f2");g.fillStyle="#d48696";g.fillRect(28,82,200,50);g.strokeStyle="rgba(255,255,255,.5)";g.lineWidth=5;for(let x=45;x<225;x+=28){g.beginPath();g.moveTo(x,86);g.lineTo(x-18,129);g.stroke();}
  }else if(kind==="table"||kind==="island"){
    rr(16,24,224,112,kind==="table"?44:18,kind==="island"?"#71848a":"#835535");g.shadowColor="transparent";g.strokeStyle="rgba(255,255,255,.38)";g.lineWidth=6;g.stroke();if(kind==="island"){rr(46,44,76,71,8,"#d7d5cb");g.fillStyle="#2d383c";for(const x of [157,188]){g.beginPath();g.arc(x,79,15,0,Math.PI*2);g.fill();}}
  }else if(kind==="cabinet"||kind==="shelf"){
    rr(18,20,220,120,13,kind==="cabinet"?"#835535":"#62442f");g.shadowColor="transparent";g.strokeStyle="#3d291f";g.lineWidth=5;if(kind==="cabinet"){g.strokeRect(35,34,86,92);g.strokeRect(135,34,86,92);g.fillStyle="#d6b16d";g.beginPath();g.arc(109,80,5,0,Math.PI*2);g.arc(147,80,5,0,Math.PI*2);g.fill();}else{for(let y=43;y<133;y+=30){g.beginPath();g.moveTo(28,y);g.lineTo(228,y);g.stroke();for(let x=34;x<220;x+=18){g.fillStyle=["#ba4a42","#d6a63e","#3f6f96","#558353"][((x+y)/6)%4|0];g.fillRect(x,y-22,13,21);}}}
  }else if(kind==="desk"||kind==="workbench"){
    rr(13,25,230,110,12,kind==="workbench"?"#68513d":"#84583a");g.shadowColor="transparent";rr(29,40,198,14,5,"#bb8a58");if(kind==="desk"){rr(49,66,82,51,7,"#d7e4e8");g.strokeStyle="#607d8b";g.lineWidth=4;g.stroke();rr(157,69,44,38,6,"#34464d");}else{g.strokeStyle="#d6c7a7";g.lineWidth=5;for(let x=44;x<217;x+=29){g.beginPath();g.moveTo(x,69);g.lineTo(x+17,104);g.stroke();}rr(44,112,67,10,4,"#b33f32");rr(146,111,56,12,4,"#4b7795");}
  }else if(kind==="toybox"){
    rr(18,31,220,105,14,"#c45a3c");g.shadowColor="transparent";rr(25,20,206,29,9,"#e17b48");g.fillStyle="#ffd54f";g.beginPath();g.arc(72,83,22,0,Math.PI*2);g.fill();g.fillStyle="#4fc3f7";g.fillRect(111,60,38,43);g.fillStyle="#81c784";g.beginPath();g.moveTo(190,56);g.lineTo(216,105);g.lineTo(164,105);g.closePath();g.fill();
  }else{
    rr(16,25,224,110,kind==="stage"?8:18,kind==="stage"?"#6f4631":"#8a5c3d");g.shadowColor="transparent";g.strokeStyle="rgba(255,255,255,.35)";g.lineWidth=6;g.stroke();if(kind==="bench"){g.fillStyle="#533726";for(const y of [56,83,110])g.fillRect(30,y,196,9);}
  }
  g.restore();
}
