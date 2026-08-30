import Phaser from "phaser";
import { save } from "./Save";
import type { Prop } from "./Layout";
import type { TerrainId } from "../data/levels";
import { resolveCircleObstacle } from "./worldGeometry";

export function drawPropCanvas(kind: Prop["kind"], seed = 1): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 96;
  c.height = 96;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.translate(48, 56);
  if (kind === "tree" || kind === "pine") {
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(0, 18, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6d4c41";
    ctx.fillRect(-5, -4, 10, 24);
    if (kind === "pine") {
      for (let tier = 0; tier < 4; tier++) {
        ctx.fillStyle = tier % 2 ? "#1b5e20" : "#276b32";
        ctx.beginPath();
        ctx.moveTo(0, -48 + tier * 13);
        ctx.lineTo(-28 + tier * 3, 3 + tier * 9);
        ctx.lineTo(28 - tier * 3, 3 + tier * 9);
        ctx.closePath(); ctx.fill();
      }
    } else {
      ctx.fillStyle = seed % 2 ? "#2e7d32" : "#1b5e20";
      blob(ctx, 0, -18, 26);
      ctx.fillStyle = "#43a047";
      blob(ctx, -10, -12, 16);
      blob(ctx, 12, -14, 14);
    }
  } else if (kind === "flower" || kind === "bed") {
    ctx.fillStyle = "#2e7d32";
    ctx.fillRect(-16, 8, 32, 8);
    for (let i = 0; i < 5; i++) {
      const x = -14 + i * 7;
      ctx.fillStyle = "#66bb6a";
      ctx.fillRect(x, -2, 3, 12);
      const colors = ["#ef5350", "#ab47bc", "#ffa726", "#ec407a", "#42a5f5"];
      ctx.fillStyle = colors[(i + seed) % colors.length];
      ctx.beginPath();
      ctx.arc(x + 1, -6, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff59d";
      ctx.beginPath();
      ctx.arc(x + 1, -6, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === "rock") {
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(0, 10, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#78909c";
    ctx.beginPath();
    ctx.moveTo(-16, 8);
    ctx.lineTo(-10, -10);
    ctx.lineTo(6, -14);
    ctx.lineTo(18, 4);
    ctx.lineTo(8, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#90a4ae";
    ctx.beginPath();
    ctx.ellipse(-2, -2, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "pond") {
    ctx.fillStyle = "#1565c0";
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#42a5f5";
    ctx.beginPath();
    ctx.ellipse(-6, -4, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "house" || kind === "shed" || kind === "barn") {
    const barn = kind === "barn";
    const shed = kind === "shed";
    ctx.fillStyle = barn ? "#9f3b32" : shed ? "#6f8f78" : "#d7ccc8";
    ctx.fillRect(barn ? -28 : -20, barn ? -15 : -8, barn ? 56 : 40, barn ? 38 : 28);
    ctx.fillStyle = barn ? "#5d251f" : "#6d4c41";
    ctx.beginPath();
    ctx.moveTo(barn ? -32 : -24, barn ? -15 : -8);
    ctx.lineTo(0, barn ? -43 : -28);
    ctx.lineTo(barn ? 32 : 24, barn ? -15 : -8);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = barn ? "#f1e0c2" : "#5d4037";
    ctx.fillRect(barn ? -10 : -6, barn ? 0 : 4, barn ? 20 : 12, barn ? 23 : 16);
    if (barn) {
      ctx.strokeStyle = "#9f3b32"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-9, 1); ctx.lineTo(9, 21); ctx.moveTo(9, 1); ctx.lineTo(-9, 21); ctx.stroke();
    } else if (!shed) {
      ctx.fillStyle = "#81d4fa"; ctx.fillRect(10, 0, 8, 8);
    }
  } else if (kind === "fence") {
    ctx.fillStyle = "#8d6e63";
    ctx.fillRect(-18, -8, 6, 28);
    ctx.fillRect(12, -8, 6, 28);
    ctx.fillRect(-20, -4, 40, 5);
    ctx.fillRect(-20, 8, 40, 5);
  } else if (kind === "hedge") {
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(0,18,38,9,0,0,Math.PI*2); ctx.fill();
    for (let i=-3;i<=3;i++) { ctx.fillStyle = i%2 ? "#256c33" : "#3b8b45"; blob(ctx,i*11,-2-(Math.abs(i)%2)*4,17); }
    ctx.fillStyle="#76b852"; for(let i=0;i<9;i++) blob(ctx,-35+i*9,-12+(i%3)*5,4);
  } else if (kind === "bridge") {
    ctx.fillStyle="rgba(0,0,0,.2)";ctx.fillRect(-42,17,84,10);
    ctx.fillStyle="#9a6a3b"; for(let x=-42;x<42;x+=12){ctx.fillRect(x,-19,10,42);}
    ctx.strokeStyle="#5b3b22";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-44,-24);ctx.quadraticCurveTo(0,-36,44,-24);ctx.moveTo(-44,25);ctx.quadraticCurveTo(0,37,44,25);ctx.stroke();
    ctx.lineWidth=3;for(let x=-38;x<=38;x+=19){ctx.beginPath();ctx.moveTo(x,-25);ctx.lineTo(x,25);ctx.stroke();}
  } else if (kind === "equipment") {
    ctx.fillStyle="rgba(0,0,0,.2)";ctx.beginPath();ctx.ellipse(0,18,34,10,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#d68a18";round(ctx,-30,-15,58,35,8);ctx.fill();
    ctx.fillStyle="#263238";for(const x of [-24,24]){ctx.beginPath();ctx.arc(x,18,12,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle="#ffe082";ctx.fillRect(-18,-8,30,9);ctx.strokeStyle="#4e342e";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(22,-10);ctx.lineTo(38,-30);ctx.stroke();
  } else if (kind === "goal") {
    ctx.fillStyle="rgba(0,0,0,.2)";ctx.beginPath();ctx.ellipse(0,20,39,9,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="rgba(238,244,239,.62)";ctx.lineWidth=1.5;
    for(let x=-32;x<=32;x+=8){ctx.beginPath();ctx.moveTo(x,-20);ctx.lineTo(x,20);ctx.stroke();}
    for(let y=-20;y<=20;y+=8){ctx.beginPath();ctx.moveTo(-32,y);ctx.lineTo(32,y);ctx.stroke();}
    ctx.strokeStyle="#f7faf7";ctx.lineWidth=6;ctx.lineCap="round";
    ctx.beginPath();ctx.moveTo(-38,22);ctx.lineTo(-38,-25);ctx.lineTo(38,-25);ctx.lineTo(38,22);ctx.stroke();
    ctx.strokeStyle="#aab7af";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-38,-25);ctx.lineTo(-31,20);ctx.moveTo(38,-25);ctx.lineTo(31,20);ctx.stroke();
  }
  return c;
}

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function ensurePropTextures(scene: Phaser.Scene): void {
  const kinds: Prop["kind"][] = ["tree", "pine", "flower", "rock", "pond", "fence", "hedge", "house", "shed", "barn", "bridge", "equipment", "bed", "hay", "bench", "goal"];
  for (const k of kinds) {
    for (let variant = 0; variant < 3; variant++) {
      const key = `prop-${k}-${variant}`;
      if (scene.textures.exists(key)) continue;
      scene.textures.addCanvas(key, drawPropCanvas(k, variant + 1));
    }
  }
}

export function spawnProps(scene: Phaser.Scene, props: Prop[], terrain?: TerrainId): Phaser.GameObjects.Image[] {
  ensurePropTextures(scene);
  return props.map((p) => {
    const variant = Math.abs(p.seed ?? 0) % 3;
    const artKey = p.kind === "bed"
      ? "prop-art-flower"
      : p.kind === "barn"
        ? "prop-art-barn"
      : p.kind === "tree" && terrain === "autumn"
        ? "prop-art-tree-autumn"
        : p.kind === "tree" && terrain === "dry"
          ? "prop-art-tree-dry"
          : `prop-art-${p.kind}`;
    const key = p.kind === "fence" && scene.textures.exists("fence-cedar")
      ? "fence-cedar"
      : scene.textures.exists(artKey)
        ? artKey
        : `prop-${p.kind}-${variant}`;
    const img = scene.add.image(p.x, p.y, key).setDepth(3);
    const base = p.kind === "tree" || p.kind === "pine" ? 132 : p.kind === "house" || p.kind === "barn" ? 160 : p.kind === "shed" ? 138 : p.kind === "pond" ? 110 : p.kind === "fence" || p.kind === "hedge" || p.kind === "bridge" ? 92 : p.kind === "equipment" || p.kind === "bench" || p.kind === "goal" ? 110 : p.kind === "hay" ? 96 : 64;
    img.setDisplaySize(p.width ?? base, p.height ?? base);
    img.setRotation(p.rotation ?? 0);
    img.setData("prop", p);
    img.setData("baseRotation", p.rotation ?? 0);
    if (p.kind === "pond" && !save().reducedMotion) {
      scene.tweens.add({ targets: img, scaleX: img.scaleX * 1.012, scaleY: img.scaleY * 0.992, alpha: 0.94, duration: 1500, yoyo: true, repeat: -1, ease: "Sine.InOut" });
    }
    if ((p.kind === "tree" || p.kind === "pine" || p.kind === "hedge") && !scene.game.device.os.desktop) {
      img.setData("windPhase", ((p.seed ?? 0) % 19) / 19 * Math.PI * 2);
    }
    return img;
  });
}

function round(ctx: CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number):void{
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);
}

export function softCollide(
  x: number,
  y: number,
  radius: number,
  props: Prop[]
): { x: number; y: number } {
  let nx = x;
  let ny = y;
  for (const p of props) {
    const resolved = resolveCircleObstacle(nx, ny, radius, p);
    if (resolved.collided) {
      nx = resolved.x;
      ny = resolved.y;
    }
  }
  return { x: nx, y: ny };
}
