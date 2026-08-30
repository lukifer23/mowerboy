import type { MowerDef } from "../data/mowers";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function wheel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  spin: number,
  hub: string,
  steer = 0
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(steer);
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0d0d0d";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.rotate(spin);
  ctx.strokeStyle = "#4a4a4a";
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos((i * Math.PI) / 2) * rx * 0.7, Math.sin((i * Math.PI) / 2) * ry * 0.7);
    ctx.stroke();
  }
  ctx.fillStyle = hub;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.32, ry * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawMowerFrame(ctx: CanvasRenderingContext2D, def: MowerDef, time: number, throttle: number, steering = 0): void {
  const spin = time * throttle * 14;
  ctx.save();
  ctx.translate(128, 128);
  ctx.scale(1.15, 1.15);

  if (def.kind === "push") drawPush(ctx, def, spin);
  else if (def.kind === "zeroturn" || def.kind === "standon") drawZero(ctx, def, spin);
  else if (def.id === "farmhand") drawFarm(ctx, def, spin);
  else if (def.id === "gardenscout") drawCompactTractor(ctx, def, spin, steering);
  else if (def.id === "utilitymate") drawUtilityTractor(ctx, def, spin, steering);
  else if (def.id === "fieldgiant") drawFieldGiant(ctx, def, spin, steering);
  else if (def.id === "pivotranger") drawPivotRanger(ctx, def, spin, steering);
  else if (def.kind === "frontmount") drawFrontMount(ctx, def, spin, steering);
  else drawRider(ctx, def, spin, def.kind === "commercial", steering);

  ctx.restore();
}

function drawCompactTractor(ctx: CanvasRenderingContext2D, def: MowerDef, spin: number, steering: number): void {
  drawDeck(ctx, 78, 44, def.deck);
  wheel(ctx,-28,-27,16,13,spin,def.accent); wheel(ctx,-28,27,16,13,spin,def.accent);
  wheel(ctx,34,-20,10,7,spin,def.accent,steering*.55); wheel(ctx,34,20,10,7,spin,def.accent,steering*.55);
  ctx.fillStyle=def.body;roundRect(ctx,-42,-19,88,38,11);ctx.fill();ctx.fillStyle=shade(def.body,1.2);roundRect(ctx,12,-16,40,32,9);ctx.fill();
  ctx.fillStyle=def.seat;roundRect(ctx,-28,-13,22,26,6);ctx.fill();ctx.strokeStyle=def.accent;ctx.lineWidth=4;ctx.strokeRect(-38,-30,32,60);
  ctx.fillStyle="#fff9c4";ctx.fillRect(43,-12,8,8);ctx.fillRect(43,4,8,8);
}

function drawUtilityTractor(ctx: CanvasRenderingContext2D, def: MowerDef, spin: number, steering: number): void {
  ctx.fillStyle=def.deck;roundRect(ctx,-82,-32,43,64,10);ctx.fill();ctx.strokeStyle="#101010";ctx.lineWidth=3;ctx.stroke();
  wheel(ctx,-15,-36,23,19,spin,def.accent);wheel(ctx,-15,36,23,19,spin,def.accent);wheel(ctx,43,-24,13,10,spin,def.accent,steering*.45);wheel(ctx,43,24,13,10,spin,def.accent,steering*.45);
  ctx.fillStyle=def.body;roundRect(ctx,-28,-21,84,42,9);ctx.fill();ctx.fillStyle=shade(def.body,1.18);roundRect(ctx,15,-18,45,36,8);ctx.fill();
  ctx.fillStyle=def.seat;roundRect(ctx,-17,-14,21,28,5);ctx.fill();ctx.strokeStyle="#263238";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-24,-21);ctx.lineTo(-24,-45);ctx.lineTo(8,-45);ctx.lineTo(8,-21);ctx.stroke();
  ctx.fillStyle="#90a4ae";ctx.fillRect(48,-5,7,27);
}

function drawFieldGiant(ctx: CanvasRenderingContext2D, def: MowerDef, spin: number, steering: number): void {
  ctx.fillStyle=def.deck;roundRect(ctx,-96,-39,55,78,12);ctx.fill();ctx.strokeStyle="#160d09";ctx.lineWidth=4;ctx.stroke();
  wheel(ctx,-20,-43,28,23,spin,def.accent);wheel(ctx,-20,43,28,23,spin,def.accent);wheel(ctx,48,-28,16,12,spin,def.accent,steering*.4);wheel(ctx,48,28,16,12,spin,def.accent,steering*.4);
  ctx.fillStyle=def.body;roundRect(ctx,-34,-25,98,50,10);ctx.fill();ctx.fillStyle=shade(def.body,1.22);roundRect(ctx,17,-21,51,42,8);ctx.fill();
  ctx.fillStyle="#b0bec5";roundRect(ctx,-25,-18,31,36,4);ctx.fill();ctx.fillStyle=def.seat;roundRect(ctx,-20,-14,21,28,4);ctx.fill();
  ctx.strokeStyle="#263238";ctx.lineWidth=6;ctx.strokeRect(-31,-47,45,94);ctx.fillStyle="#90a4ae";ctx.fillRect(55,-8,8,34);ctx.fillStyle="#fff59d";ctx.fillRect(59,-17,9,10);ctx.fillRect(59,7,9,10);
}

function drawPivotRanger(ctx: CanvasRenderingContext2D, def: MowerDef, spin: number, steering: number): void {
  ctx.save();ctx.translate(55,0);drawDeck(ctx,126,66,def.deck);ctx.restore();
  wheel(ctx,-35,-37,21,18,spin,def.accent);wheel(ctx,-35,37,21,18,spin,def.accent);wheel(ctx,12,-28,14,10,spin,def.accent,steering*.65);wheel(ctx,12,28,14,10,spin,def.accent,steering*.65);
  ctx.fillStyle=def.body;roundRect(ctx,-50,-25,72,50,14);ctx.fill();ctx.save();ctx.translate(22,0);ctx.rotate(steering*.14);ctx.fillStyle=shade(def.body,1.18);roundRect(ctx,-8,-21,48,42,10);ctx.fill();ctx.restore();
  ctx.fillStyle=def.seat;roundRect(ctx,-42,-16,26,32,7);ctx.fill();ctx.fillStyle="#b2dfdb";ctx.beginPath();ctx.arc(11,0,8,0,Math.PI*2);ctx.fill();
}

function drawDeck(ctx: CanvasRenderingContext2D, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.45);
  ctx.fill();
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = "rgba(210,230,230,0.24)";
  ctx.lineWidth = 2;
  for (const x of [-w * 0.22, w * 0.22]) {
    ctx.beginPath();
    ctx.arc(x, 0, h * 0.23, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.22, h * 0.22, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawPush(ctx: CanvasRenderingContext2D, def: MowerDef, spin: number): void {
  ctx.strokeStyle = "#616161";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6, 10);
  ctx.lineTo(-54, -8);
  ctx.lineTo(-54, 28);
  ctx.lineTo(-6, 10);
  ctx.stroke();
  ctx.strokeStyle = "#9e9e9e";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-58, -10);
  ctx.lineTo(-58, 30);
  ctx.stroke();

  drawDeck(ctx, 70, 58, def.deck);
  wheel(ctx, -18, -24, 10, 10, spin, "#bdbdbd");
  wheel(ctx, -18, 24, 10, 10, spin, "#bdbdbd");
  wheel(ctx, 18, -22, 8, 8, spin, "#bdbdbd");
  wheel(ctx, 18, 22, 8, 8, spin, "#bdbdbd");

  ctx.fillStyle = def.body;
  roundRect(ctx, -16, -16, 40, 32, 8);
  ctx.fill();
  ctx.strokeStyle = "#00000055";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#cfd8dc";
  ctx.fillRect(8, -8, 14, 16);
  ctx.fillStyle = def.accent;
  ctx.beginPath();
  ctx.arc(2, 0, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawRider(ctx: CanvasRenderingContext2D, def: MowerDef, spin: number, commercial: boolean, steering: number): void {
  const deckW = commercial ? 118 : def.id === "wideboy" ? 124 : 86;
  drawDeck(ctx, deckW, 50, def.deck);

  wheel(ctx, -28, -30, 14, 14, spin, def.accent);
  wheel(ctx, -28, 30, 14, 14, spin, def.accent);
  wheel(ctx, 34, -24, 12, 8, spin, def.accent, steering * 0.5);
  wheel(ctx, 34, 24, 12, 8, spin, def.accent, steering * 0.5);

  ctx.fillStyle = def.body;
  roundRect(ctx, -40, -22, 86, 44, 12);
  ctx.fill();
  ctx.strokeStyle = "#00000044";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = shade(def.body, 1.12);
  roundRect(ctx, 10, -18, 40, 36, 10);
  ctx.fill();

  if (def.id === "nightowl") {
    ctx.fillStyle = "#fff59d";
    roundRect(ctx, 40, -14, 10, 8, 3);
    ctx.fill();
    roundRect(ctx, 40, 6, 10, 8, 3);
    ctx.fill();
    ctx.fillStyle = "#ffecb3";
    roundRect(ctx, 8, -20, 28, 6, 2);
    ctx.fill();
  }

  if (commercial) {
    ctx.strokeStyle = "#212121";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-18, -20);
    ctx.lineTo(-18, -42);
    ctx.lineTo(8, -42);
    ctx.lineTo(8, -20);
    ctx.stroke();
  }

  ctx.fillStyle = def.seat;
  roundRect(ctx, -34, -14, 24, 28, 6);
  ctx.fill();
  ctx.fillStyle = shade(def.seat, 0.85);
  roundRect(ctx, -38, -16, 8, 32, 3);
  ctx.fill();

  ctx.strokeStyle = "#cfd8dc";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(22, 0, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#37474f";
  ctx.beginPath();
  ctx.arc(22, 0, 3, 0, Math.PI * 2);
  ctx.fill();

  if (def.id === "yardking") {
    ctx.fillStyle = "#efebe9";
    roundRect(ctx, -62, -18, 24, 36, 6);
    ctx.fill();
    ctx.strokeStyle = "#8d6e63";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.fillStyle = "#eceff1";
  roundRect(ctx, 42, -10, 8, 20, 3);
  ctx.fill();
}

function drawZero(ctx: CanvasRenderingContext2D, def: MowerDef, spin: number): void {
  drawDeck(ctx, 108, 52, def.deck);
  wheel(ctx, -22, -34, 18, 18, spin, def.accent);
  wheel(ctx, -22, 34, 18, 18, spin, def.accent);
  wheel(ctx, 36, -18, 8, 8, spin * 0.4, "#9e9e9e");
  wheel(ctx, 36, 18, 8, 8, spin * 0.4, "#9e9e9e");

  ctx.fillStyle = def.body;
  roundRect(ctx, -36, -20, 70, 40, 14);
  ctx.fill();
  ctx.fillStyle = def.seat;
  roundRect(ctx, -12, -14, 26, 28, 8);
  ctx.fill();
  ctx.strokeStyle = "#212121";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(10, -12);
  ctx.lineTo(28, -20);
  ctx.moveTo(10, 12);
  ctx.lineTo(28, 20);
  ctx.stroke();
  if (def.kind === "standon") {
    ctx.fillStyle = "#263238";
    roundRect(ctx, -52, -28, 18, 56, 6);
    ctx.fill();
    ctx.strokeStyle = def.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-34, -18);
    ctx.lineTo(-48, -12);
    ctx.moveTo(-34, 18);
    ctx.lineTo(-48, 12);
    ctx.stroke();
  }
}

function drawFrontMount(ctx: CanvasRenderingContext2D, def: MowerDef, spin: number, steering: number): void {
  ctx.save();
  ctx.translate(48, 0);
  drawDeck(ctx, 112, 62, def.deck);
  ctx.restore();
  wheel(ctx, -30, -34, 19, 16, spin, def.accent);
  wheel(ctx, -30, 34, 19, 16, spin, def.accent);
  wheel(ctx, 18, -24, 12, 8, spin, def.accent, steering * 0.45);
  wheel(ctx, 18, 24, 12, 8, spin, def.accent, steering * 0.45);
  ctx.fillStyle = def.body;
  roundRect(ctx, -42, -24, 74, 48, 13);
  ctx.fill();
  ctx.fillStyle = shade(def.body, 1.18);
  roundRect(ctx, 0, -20, 36, 40, 10);
  ctx.fill();
  ctx.fillStyle = def.seat;
  roundRect(ctx, -36, -15, 24, 30, 7);
  ctx.fill();
  ctx.strokeStyle = "#cfd8dc";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(10, 0, 9, 0, Math.PI * 2);
  ctx.stroke();
}

function drawFarm(ctx: CanvasRenderingContext2D, def: MowerDef, spin: number): void {
  ctx.fillStyle = def.deck;
  roundRect(ctx, -78, -28, 40, 56, 10);
  ctx.fill();
  ctx.strokeStyle = "#0a0a0a";
  ctx.stroke();

  wheel(ctx, -8, -32, 20, 20, spin, def.accent);
  wheel(ctx, -8, 32, 20, 20, spin, def.accent);
  wheel(ctx, 40, -22, 12, 12, spin, def.accent);
  wheel(ctx, 40, 22, 12, 12, spin, def.accent);

  ctx.fillStyle = def.body;
  roundRect(ctx, -20, -18, 72, 36, 8);
  ctx.fill();
  ctx.fillStyle = shade(def.body, 1.15);
  roundRect(ctx, 20, -16, 36, 32, 8);
  ctx.fill();
  ctx.fillStyle = def.seat;
  roundRect(ctx, -8, -12, 18, 24, 4);
  ctx.fill();
  ctx.fillStyle = "#90a4ae";
  ctx.fillRect(48, -4, 6, 22);
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
  return `rgb(${r},${g},${b})`;
}

export function makeMowerCanvas(def: MowerDef, time = 0, throttle = 0.4): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.clearRect(0, 0, 256, 256);
  drawMowerFrame(ctx, def, time, throttle, 0.25);
  return c;
}

export function drawShadow(ctx: CanvasRenderingContext2D, rx: number, ry: number): void {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 8, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
