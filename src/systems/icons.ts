export function drawCircleButton(
  ctx: CanvasRenderingContext2D,
  size: number,
  glyph: (ctx: CanvasRenderingContext2D, s: number) => void,
  bg = "#3d8b40"
): void {
  const s = size;
  const r = s * 0.42;
  ctx.clearRect(0, 0, s, s);
  ctx.translate(s / 2, s / 2);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.2, 0, 0, r);
  g.addColorStop(0, shade(bg, 1.25));
  g.addColorStop(1, shade(bg, 0.85));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = shade(bg, 0.55);
  ctx.lineWidth = s * 0.035;
  ctx.stroke();
  ctx.fillStyle = "#f4f1de";
  ctx.strokeStyle = "#f4f1de";
  glyph(ctx, s);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
  return `rgb(${r},${g},${b})`;
}

export const GLYPHS: Record<string, (ctx: CanvasRenderingContext2D, s: number) => void> = {
  home: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.18);
    ctx.lineTo(s * 0.16, -s * 0.02);
    ctx.lineTo(s * 0.16, s * 0.16);
    ctx.lineTo(-s * 0.16, s * 0.16);
    ctx.lineTo(-s * 0.16, -s * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-s * 0.04, s * 0.04, s * 0.08, s * 0.12);
  },
  pause: (ctx, s) => {
    ctx.fillRect(-s * 0.1, -s * 0.14, s * 0.07, s * 0.28);
    ctx.fillRect(s * 0.03, -s * 0.14, s * 0.07, s * 0.28);
  },
  play: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, -s * 0.16);
    ctx.lineTo(s * 0.16, 0);
    ctx.lineTo(-s * 0.1, s * 0.16);
    ctx.closePath();
    ctx.fill();
  },
  mute: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(-s * 0.14, -s * 0.06);
    ctx.lineTo(-s * 0.04, -s * 0.06);
    ctx.lineTo(s * 0.08, -s * 0.16);
    ctx.lineTo(s * 0.08, s * 0.16);
    ctx.lineTo(-s * 0.04, s * 0.06);
    ctx.lineTo(-s * 0.14, s * 0.06);
    ctx.closePath();
    ctx.fill();
  },
  speaker: (ctx, s) => {
    GLYPHS.mute(ctx, s);
    ctx.lineWidth = s * 0.03;
    ctx.beginPath();
    ctx.arc(s * 0.04, 0, s * 0.08, -0.8, 0.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s * 0.04, 0, s * 0.14, -0.8, 0.8);
    ctx.stroke();
  },
  wand: (ctx, s) => {
    ctx.lineWidth = s * 0.045;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, s * 0.12);
    ctx.lineTo(s * 0.06, -s * 0.08);
    ctx.stroke();
    star(ctx, s * 0.08, -s * 0.12, s * 0.08);
    star(ctx, s * 0.16, s * 0.02, s * 0.045);
  },
  gear: (ctx, s) => {
    ctx.save();
    ctx.lineWidth = s * 0.07;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.1, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * s * 0.14, Math.sin(a) * s * 0.14, s * 0.04, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  check: (ctx, s) => {
    ctx.lineWidth = s * 0.06;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, 0);
    ctx.lineTo(-s * 0.02, s * 0.12);
    ctx.lineTo(s * 0.16, -s * 0.14);
    ctx.stroke();
  },
  garage: (ctx, s) => {
    ctx.fillRect(-s * 0.16, -s * 0.04, s * 0.32, s * 0.16);
    ctx.beginPath();
    ctx.moveTo(-s * 0.18, -s * 0.04);
    ctx.lineTo(0, -s * 0.18);
    ctx.lineTo(s * 0.18, -s * 0.04);
    ctx.closePath();
    ctx.fill();
  },
  map: (ctx, s) => {
    ctx.beginPath();
    ctx.arc(0, -s * 0.04, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, 0);
    ctx.lineTo(0, s * 0.18);
    ctx.lineTo(s * 0.12, 0);
    ctx.closePath();
    ctx.fill();
  },
  mower: (ctx, s) => {
    ctx.fillRect(-s * .12, -s * .13, s * .24, s * .23);
    ctx.fillStyle = "#ffd54f";
    ctx.fillRect(-s * .18, s * .02, s * .36, s * .11);
    ctx.fillStyle = "#263238";
    for (const x of [-.15, .15]) for (const y of [-.1, .11]) {
      ctx.beginPath(); ctx.arc(x * s, y * s, s * .045, 0, Math.PI * 2); ctx.fill();
    }
  },
  vacuum: (ctx, s) => {
    ctx.save(); ctx.rotate(-.18);
    ctx.fillRect(-s * .1, -s * .16, s * .2, s * .25);
    ctx.fillStyle = "#80deea";
    ctx.fillRect(-s * .17, s * .06, s * .34, s * .1);
    ctx.strokeStyle = "#f4f1de"; ctx.lineWidth = s * .035;
    ctx.beginPath(); ctx.moveTo(0, -s * .14); ctx.lineTo(s * .09, -s * .25); ctx.stroke(); ctx.restore();
  },
  yard: (ctx, s) => {
    ctx.fillStyle = "#81c784"; ctx.fillRect(-s * .17, -s * .14, s * .34, s * .28);
    ctx.strokeStyle = "#f4f1de"; ctx.lineWidth = s * .025;
    for (let x = -.12; x <= .12; x += .08) { ctx.beginPath(); ctx.moveTo(x*s,s*.12); ctx.lineTo((x+.04)*s,-s*.12); ctx.stroke(); }
  },
  room: (ctx, s) => {
    ctx.fillStyle = "#80cbc4"; ctx.fillRect(-s * .17, -s * .14, s * .34, s * .28);
    ctx.strokeStyle = "#f4f1de"; ctx.lineWidth = s * .035; ctx.strokeRect(-s*.17,-s*.14,s*.34,s*.28);
    ctx.fillStyle = "#f4f1de"; ctx.fillRect(-s*.11,s*.01,s*.22,s*.08); ctx.fillRect(-s*.09,-s*.06,s*.18,s*.08);
  },
  rain: (ctx, s) => {
    ctx.beginPath();
    ctx.arc(0, -s * 0.06, s * 0.12, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-s * 0.12, -s * 0.08, s * 0.24, s * 0.08);
    ctx.lineWidth = s * 0.03;
    ctx.beginPath();
    ctx.moveTo(-s * 0.06, s * 0.06);
    ctx.lineTo(-s * 0.08, s * 0.16);
    ctx.moveTo(s * 0.04, s * 0.06);
    ctx.lineTo(s * 0.02, s * 0.16);
    ctx.stroke();
  },
  turbo: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(-s * 0.04, -s * 0.16);
    ctx.lineTo(s * 0.12, 0);
    ctx.lineTo(-s * 0.02, 0);
    ctx.lineTo(s * 0.06, s * 0.16);
    ctx.lineTo(-s * 0.14, s * 0.02);
    ctx.lineTo(-s * 0.02, s * 0.02);
    ctx.closePath();
    ctx.fill();
  },
  fullscreen: (ctx, s) => {
    ctx.lineWidth = s * 0.045;
    ctx.lineCap = "round";
    const d = s * 0.14;
    const n = s * 0.055;
    for (const [x, y, sx, sy] of [[-d, -d, 1, 1], [d, -d, -1, 1], [-d, d, 1, -1], [d, d, -1, -1]] as const) {
      ctx.beginPath();
      ctx.moveTo(x + sx * n, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + sy * n);
      ctx.stroke();
    }
  },
  wide: (ctx, s) => {
    ctx.lineWidth = s * 0.045;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-s * 0.16, 0);
    ctx.lineTo(s * 0.16, 0);
    ctx.moveTo(-s * 0.16, 0);
    ctx.lineTo(-s * 0.08, -s * 0.08);
    ctx.moveTo(-s * 0.16, 0);
    ctx.lineTo(-s * 0.08, s * 0.08);
    ctx.moveTo(s * 0.16, 0);
    ctx.lineTo(s * 0.08, -s * 0.08);
    ctx.moveTo(s * 0.16, 0);
    ctx.lineTo(s * 0.08, s * 0.08);
    ctx.stroke();
  },
  magnet: (ctx, s) => {
    ctx.lineWidth = s * 0.075;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, -s * 0.01, s * 0.13, 0, Math.PI);
    ctx.lineTo(-s * 0.13, -s * 0.14);
    ctx.moveTo(s * 0.13, -s * 0.01);
    ctx.lineTo(s * 0.13, -s * 0.14);
    ctx.stroke();
  },
  rainbow: (ctx, s) => {
    ctx.lineWidth = s * 0.04;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, s * 0.08, s * (0.09 + i * 0.05), Math.PI, Math.PI * 2);
      ctx.stroke();
    }
  },
  flock: (ctx, s) => {
    ctx.lineWidth = s * 0.035;
    ctx.lineCap = "round";
    for (const [x, y] of [[-0.09, -0.03], [0.08, 0.05]]) {
      ctx.beginPath();
      ctx.arc(s * x - s * 0.035, s * y, s * 0.05, Math.PI * 1.15, Math.PI * 1.9);
      ctx.arc(s * x + s * 0.035, s * y, s * 0.05, Math.PI * 1.1, Math.PI * 1.85);
      ctx.stroke();
    }
  },
  mulcher: (ctx, s) => {
    ctx.beginPath();
    ctx.ellipse(-s * 0.04, 0, s * 0.08, s * 0.15, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(s * 0.02, -s * 0.02, s * 0.13, s * 0.04);
  },
  headlights: (ctx, s) => {
    ctx.fillRect(-s * 0.14, -s * 0.08, s * 0.08, s * 0.16);
    ctx.fillRect(s * 0.06, -s * 0.08, s * 0.08, s * 0.16);
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(-s * 0.06, -s * 0.07);
    ctx.lineTo(s * 0.2, -s * 0.15);
    ctx.lineTo(s * 0.2, -s * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  },
};

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.4;
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function makeIconTexture(glyph: string, size = 128, bg?: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  drawCircleButton(ctx, size, GLYPHS[glyph] ?? GLYPHS.play, bg);
  return c;
}
