import type { VacuumDef } from "../data/vacuums";

export function makeVacuumCanvas(def: VacuumDef): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  drawVacuumFrame(canvas.getContext("2d", { willReadFrequently: true })!, def, 0, 0, 0);
  return canvas;
}

export function drawVacuumFrame(
  ctx: CanvasRenderingContext2D,
  def: VacuumDef,
  time: number,
  throttle: number,
  steering: number
): void {
  ctx.clearRect(0, 0, 256, 256);
  ctx.save();
  ctx.translate(128, 128);
  ctx.rotate(Math.PI / 2);
  const body = def.body;
  const accent = def.accent;
  const pulse = 0.5 + Math.sin(time * (12 + throttle * 18)) * 0.5;

  ctx.fillStyle = "rgba(0,0,0,0.24)";
  rounded(ctx, -72, -42, 144, 84, 24);
  ctx.fill();

  if (def.kind === "robot") drawRobot(ctx, body, accent, pulse);
  else if (def.kind === "sweeper") drawSweeper(ctx, body, accent, steering, pulse);
  else if (def.kind === "canister" || def.kind === "shop") drawCanister(ctx, def.kind, body, accent, steering, pulse);
  else drawUpright(ctx, def.kind, body, accent, steering, pulse);
  ctx.restore();
}

function drawUpright(
  ctx: CanvasRenderingContext2D,
  kind: "upright" | "cyclone" | "stick" | "commercial",
  body: string,
  accent: string,
  steering: number,
  pulse: number
): void {
  const stick = kind === "stick";
  const commercial = kind === "commercial";
  const headW = commercial ? 112 : stick ? 72 : 92;
  ctx.save();
  ctx.translate(46, 0);
  ctx.rotate(steering * 0.13);
  ctx.fillStyle = "#202726";
  rounded(ctx, -23, -headW / 2 - 4, 46, headW + 8, 12);
  ctx.fill();
  ctx.fillStyle = body;
  rounded(ctx, -20, -headW / 2, 40, headW, 10);
  ctx.fill();
  ctx.fillStyle = accent;
  rounded(ctx, 4, -headW * 0.38, 8, headW * 0.76, 4);
  ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${0.18 + pulse * 0.12})`;
  rounded(ctx, -11, -headW * 0.32, 7, headW * 0.64, 3);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "#303938";
  ctx.lineWidth = stick ? 13 : 18;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(28, 0);
  ctx.lineTo(stick ? -62 : -30, 0);
  ctx.stroke();
  ctx.strokeStyle = accent;
  ctx.lineWidth = stick ? 5 : 7;
  ctx.stroke();

  if (stick) {
    ctx.fillStyle = body;
    rounded(ctx, -78, -19, 42, 38, 16);
    ctx.fill();
    ctx.fillStyle = accent;
    rounded(ctx, -108, -8, 38, 16, 8);
    ctx.fill();
  } else {
    ctx.fillStyle = body;
    rounded(ctx, -39, -32, 68, 64, 22);
    ctx.fill();
    ctx.fillStyle = kind === "cyclone" ? "rgba(180,245,255,0.72)" : accent;
    ctx.beginPath();
    ctx.ellipse(-12, 0, 20, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    if (kind === "cyclone") {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(-12, 0, 12, pulse * Math.PI, pulse * Math.PI + Math.PI * 1.5);
      ctx.stroke();
    }
    ctx.fillStyle = "#151a19";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(-18, side * 35, 13, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  rounded(ctx, -30, -21, 43, 9, 5);
  ctx.fill();
}

function drawCanister(
  ctx: CanvasRenderingContext2D,
  kind: "canister" | "shop",
  body: string,
  accent: string,
  steering: number,
  pulse: number
): void {
  ctx.save();
  ctx.translate(52, 0);
  ctx.rotate(steering * 0.18);
  ctx.fillStyle = body;
  rounded(ctx, -19, -34, 38, 68, 10);
  ctx.fill();
  ctx.fillStyle = accent;
  rounded(ctx, 4, -26, 7, 52, 3);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "#263238";
  ctx.lineWidth = 11;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(30, 0);
  ctx.bezierCurveTo(2, -18, -20, -22, -37, -7);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.24)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#202625";
  ctx.beginPath();
  ctx.ellipse(-57, 0, kind === "shop" ? 37 : 34, kind === "shop" ? 35 : 29, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(-57, 0, kind === "shop" ? 31 : 29, kind === "shop" ? 29 : 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = accent;
  rounded(ctx, -78, -10, 42, 20, 8);
  ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${0.14 + pulse * 0.13})`;
  ctx.beginPath();
  ctx.ellipse(-63, -9, 13, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111615";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(-57, side * 31, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRobot(ctx: CanvasRenderingContext2D, body: string, accent: string, pulse: number): void {
  ctx.fillStyle = "#151a19";
  ctx.beginPath();
  ctx.arc(0, 0, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(-10, 0, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(255,255,255,${0.25 + pulse * 0.35})`;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 43, -0.8, 0.8);
  ctx.stroke();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  for (let i = 0; i < 5; i++) {
    const a = timeAngle(pulse, i);
    ctx.beginPath();
    ctx.moveTo(46, 0);
    ctx.lineTo(71, Math.sin(a) * 14);
    ctx.stroke();
  }
}

function drawSweeper(ctx: CanvasRenderingContext2D, body: string, accent: string, steering: number, pulse: number): void {
  ctx.fillStyle = "#151a19";
  rounded(ctx, -70, -61, 140, 122, 30);
  ctx.fill();
  ctx.fillStyle = body;
  rounded(ctx, -64, -55, 128, 110, 26);
  ctx.fill();
  ctx.fillStyle = accent;
  rounded(ctx, 16, -45, 29, 90, 12);
  ctx.fill();
  ctx.fillStyle = "#263238";
  rounded(ctx, -44, -35, 48, 70, 18);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(-20, 0, 19, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = `rgba(255,255,255,${0.12 + pulse * 0.12})`;
  rounded(ctx, 24, -34, 9, 68, 4);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 5;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(58, side * 53);
    ctx.rotate(steering * 0.25 + side * pulse * 0.2);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 25, Math.sin(a) * 25);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function timeAngle(pulse: number, i: number): number {
  return pulse * Math.PI * 2 + (i / 5) * Math.PI * 2;
}
