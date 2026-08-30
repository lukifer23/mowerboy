import Phaser from "phaser";
import type { TerrainPalette } from "./palette";
import { HIGH_CONTRAST, PALETTES } from "./palette";
import type { TerrainId } from "../data/levels";
import {
  HEIGHT_CUT,
  HEIGHT_MED,
  HEIGHT_SHORT,
  HEIGHT_TALL,
  HEIGHT_WILD,
  cutRemainingSlice,
  cutWithDeck,
  growRandom,
  mowableCount,
  remainingCells,
} from "./grassMath";
import type { Layout } from "./Layout";
import { save } from "./Save";

// Finer seven-unit blades make curved and diagonal deck edges less blocky.
// Larger chunks keep the texture count below the old eight-unit grid.
const CHUNK_CELLS = 40;

interface GrassChunk {
  col: number;
  row: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tex: Phaser.Textures.CanvasTexture;
  sprite: Phaser.GameObjects.Image;
}

function hash(c: number, r: number): number {
  let n = Math.imul(c + 17, 374761393) ^ Math.imul(r + 31, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

export class GrassField {
  cols: number;
  rows: number;
  cellSize: number;
  height: Uint8Array;
  heading: Uint8Array;
  worldW: number;
  worldH: number;
  sprite: Phaser.GameObjects.Container;
  private chunks: GrassChunk[] = [];
  private chunkCols: number;
  private pal: TerrainPalette;
  private terrain: TerrainId;
  private dirty: Set<number> = new Set();
  private mulched: Uint8Array;
  private texturePattern?: CanvasPattern | null;
  private cutTexturePattern?: CanvasPattern | null;
  private helperCursor = 0;
  private readonly mowable: number;
  private remaining: number;

  constructor(scene: Phaser.Scene, layout: Layout, terrain: TerrainId) {
    this.cols = layout.cols;
    this.rows = layout.rows;
    this.cellSize = layout.cellSize;
    this.height = layout.height;
    this.heading = layout.heading;
    this.mulched = new Uint8Array(layout.height.length);
    this.worldW = layout.worldW;
    this.worldH = layout.worldH;
    this.terrain = terrain;
    this.mowable = mowableCount(this.height);
    this.remaining = remainingCells(this.height, this.cols).length;
    this.pal = save().highContrast ? HIGH_CONTRAST : PALETTES[terrain];
    this.chunkCols = Math.ceil(this.cols / CHUNK_CELLS);
    this.sprite = scene.add.container(0, 0).setDepth(0);

    const detail = scene.textures.exists("grass-detail")
      ? (scene.textures.get("grass-detail").getSourceImage() as CanvasImageSource)
      : undefined;
    const cutDetail = scene.textures.exists("grass-cut-detail")
      ? (scene.textures.get("grass-cut-detail").getSourceImage() as CanvasImageSource)
      : undefined;

    for (let row = 0; row < Math.ceil(this.rows / CHUNK_CELLS); row++) {
      for (let col = 0; col < this.chunkCols; col++) {
        const cellW = Math.min(CHUNK_CELLS, this.cols - col * CHUNK_CELLS);
        const cellH = Math.min(CHUNK_CELLS, this.rows - row * CHUNK_CELLS);
        const canvas = document.createElement("canvas");
        canvas.width = cellW * this.cellSize;
        canvas.height = cellH * this.cellSize;
        const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true })!;
        if (detail && !this.texturePattern) this.texturePattern = ctx.createPattern(detail, "repeat");
        if (cutDetail && !this.cutTexturePattern) this.cutTexturePattern = ctx.createPattern(cutDetail, "repeat");
        const key = `grass-${terrain}-${col}-${row}-${Math.random().toString(36).slice(2, 7)}`;
        const tex = scene.textures.addCanvas(key, canvas)!;
        const image = scene.add
          .image(col * CHUNK_CELLS * this.cellSize, row * CHUNK_CELLS * this.cellSize, key)
          .setOrigin(0, 0);
        this.sprite.add(image);
        this.chunks.push({ col, row, canvas, ctx, tex, sprite: image });
      }
    }
    this.paintAll();
  }

  get percent(): number {
    return this.mowable <= 0 ? 1 : Math.max(0, Math.min(1, 1 - this.remaining / this.mowable));
  }

  isMowableAt(x: number, y: number): boolean {
    const c = Math.max(0, Math.min(this.cols - 1, Math.floor(x / this.cellSize)));
    const r = Math.max(0, Math.min(this.rows - 1, Math.floor(y / this.cellSize)));
    return this.height[r * this.cols + c] !== 255;
  }

  isTallAt(x: number, y: number): boolean {
    const c = Math.max(0, Math.min(this.cols - 1, Math.floor(x / this.cellSize)));
    const r = Math.max(0, Math.min(this.rows - 1, Math.floor(y / this.cellSize)));
    return this.height[r * this.cols + c] >= HEIGHT_TALL && this.height[r * this.cols + c] !== 255;
  }

  cutMower(
    mx: number,
    my: number,
    heading: number,
    deckW: number,
    deckL: number,
    deckOffset: number,
    mulch: boolean
  ): { cut: number; cx: number; cy: number } {
    const cut = cutWithDeck(
      this.height,
      this.heading,
      this.cols,
      this.rows,
      this.cellSize,
      mx,
      my,
      heading,
      deckW,
      deckL,
      deckOffset,
      mulch
    );
    if (cut > 0) {
      this.remaining = Math.max(0, this.remaining - cut);
      this.markAround(mx, my, Math.max(deckW, deckL) * 0.7 + this.cellSize);
      if (mulch) {
        for (const i of this.dirty) if (this.height[i] === HEIGHT_CUT) this.mulched[i] = 1;
      }
      this.flush();
    }
    return { cut, cx: mx, cy: my };
  }

  grow(count: number, rng: () => number, maxH = HEIGHT_TALL): number {
    const grown = growRandom(this.height, count, rng, maxH);
    if (grown > 0) {
      this.remaining = remainingCells(this.height, this.cols).length;
      this.paintAll();
    }
    return grown;
  }

  helperSweep(n: number): number {
    const slice = cutRemainingSlice(this.height, this.helperCursor, n);
    this.helperCursor = slice.next;
    for (const idx of slice.indices) this.dirty.add(idx);
    this.remaining = Math.max(0, this.remaining - slice.indices.length);
    if (slice.indices.length) this.flush();
    return slice.indices.length;
  }

  get remainingCount(): number {
    return this.remaining;
  }

  destroy(): void {
    for (const chunk of this.chunks) {
      chunk.sprite.destroy();
      chunk.tex.destroy();
    }
    this.chunks = [];
    this.sprite.destroy();
  }

  private markAround(x: number, y: number, reach: number): void {
    const minC = Math.max(0, Math.floor((x - reach) / this.cellSize));
    const maxC = Math.min(this.cols - 1, Math.floor((x + reach) / this.cellSize));
    const minR = Math.max(0, Math.floor((y - reach) / this.cellSize));
    const maxR = Math.min(this.rows - 1, Math.floor((y + reach) / this.cellSize));
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) this.dirty.add(r * this.cols + c);
    }
  }

  private flush(): void {
    const touched = new Set<GrassChunk>();
    for (const i of this.dirty) {
      const c = i % this.cols;
      const r = (i / this.cols) | 0;
      const chunk = this.chunkFor(c, r);
      this.paintCell(chunk, c, r);
      touched.add(chunk);
    }
    this.dirty.clear();
    for (const chunk of touched) chunk.tex.update();
  }

  private paintAll(): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) this.paintCell(this.chunkFor(c, r), c, r);
    }
    for (const chunk of this.chunks) chunk.tex.update();
  }

  private chunkFor(c: number, r: number): GrassChunk {
    const chunkCol = Math.floor(c / CHUNK_CELLS);
    const chunkRow = Math.floor(r / CHUNK_CELLS);
    return this.chunks[chunkRow * this.chunkCols + chunkCol];
  }

  private paintCell(chunk: GrassChunk, c: number, r: number): void {
    const i = r * this.cols + c;
    const h = this.height[i];
    const s = this.cellSize;
    const x = (c - chunk.col * CHUNK_CELLS) * s;
    const y = (r - chunk.row * CHUNK_CELLS) * s;
    const pal = this.pal;
    let col: [number, number, number];
    if (h === 255 && this.heading[i] === 251) {
      col = this.terrain === "night" ? [24, 58, 88] : this.terrain === "wet" ? [38, 112, 142] : [48, 124, 164];
    }
    else if (h === 255 && this.heading[i] === 254) {
      col = this.terrain === "wet" ? [92, 100, 96] : this.terrain === "farm" ? [152, 126, 84] : [132, 132, 118];
    }
    else if (h === 255) col = pal.dirt;
    else if (h === HEIGHT_CUT) {
      const stripeAngle = (this.heading[i] / 8) * Math.PI * 2;
      const facingLight = Math.cos(stripeAngle - 0.72);
      const base = facingLight >= 0 ? pal.cutA : pal.cutB;
      // Broad reflective bands remain readable after the world camera scales
      // the seven-unit cells down on phones. Direction is still the primary
      // cue, while this alternating lift keeps adjacent passes distinct.
      const across = c * -Math.sin(stripeAngle) + r * Math.cos(stripeAngle);
      const band = (Math.floor(across / 6) & 1) === 0 ? 1 : -1;
      const lift = facingLight * (save().highContrast ? 22 : 15) + band * (save().highContrast ? 8 : 5);
      col = base.map((v) => Math.max(0, Math.min(255, v + lift))) as [number, number, number];
    }
    else if (h === HEIGHT_SHORT) col = pal.short;
    else if (h === HEIGHT_MED) col = pal.med;
    else if (h === HEIGHT_WILD) col = pal.wild;
    else col = pal.tall;

    const n = hash(c, r);
    const variation = h === HEIGHT_CUT ? 6 : h === 255 ? 3 : 12;
    col = col.map((v, channel) => {
      const wave = channel === 0 ? n : channel === 1 ? (n * 7.31) % 1 : (n * 3.17) % 1;
      return Math.max(0, Math.min(255, v + wave * variation - variation / 2));
    }) as [number, number, number];

    chunk.ctx.fillStyle = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`;
    chunk.ctx.fillRect(x, y, s, s);

    if (h === HEIGHT_CUT) {
      const isTall = (dc: number, dr: number) => {
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= this.cols || nr >= this.rows) return false;
        const neighbor = this.height[nr * this.cols + nc];
        return neighbor >= HEIGHT_SHORT && neighbor !== 255;
      };
      chunk.ctx.fillStyle = "rgba(223,244,174,0.24)";
      if (isTall(-1, 0)) chunk.ctx.fillRect(x, y, 1.4, s);
      if (isTall(0, -1)) chunk.ctx.fillRect(x, y, s, 1.4);
      chunk.ctx.fillStyle = "rgba(20,66,24,0.26)";
      if (isTall(1, 0)) chunk.ctx.fillRect(x + s - 1.4, y, 1.4, s);
      if (isTall(0, 1)) chunk.ctx.fillRect(x, y + s - 1.4, s, 1.4);
    }

    if (h === 255 && this.heading[i] === 254) {
      // Driveways and paths are continuous authored surfaces. Sparse aggregate
      // and a one-pixel shoulder keep them from reading as flat gray map tiles.
      if (n > 0.76) {
        chunk.ctx.fillStyle = n > 0.9 ? "rgba(238,231,206,0.34)" : "rgba(57,61,55,0.2)";
        chunk.ctx.fillRect(x + 1 + ((n * 13) % Math.max(1, s - 3)), y + 1 + ((n * 29) % Math.max(1, s - 3)), 1.4, 1.4);
      }
      const samePath = (dc: number, dr: number) => {
        const nc = c + dc, nr = r + dr;
        return nc >= 0 && nr >= 0 && nc < this.cols && nr < this.rows && this.height[nr * this.cols + nc] === 255 && this.heading[nr * this.cols + nc] === 254;
      };
      chunk.ctx.fillStyle = "rgba(238,226,190,0.45)";
      if (!samePath(-1, 0)) chunk.ctx.fillRect(x, y, 1, s);
      if (!samePath(0, -1)) chunk.ctx.fillRect(x, y, s, 1);
      chunk.ctx.fillStyle = "rgba(41,50,39,0.3)";
      if (!samePath(1, 0)) chunk.ctx.fillRect(x + s - 1, y, 1, s);
      if (!samePath(0, 1)) chunk.ctx.fillRect(x, y + s - 1, s, 1);
    } else if (h === 255 && this.heading[i] === 251 && n > 0.7) {
      chunk.ctx.fillStyle = "rgba(190,232,239,0.28)";
      chunk.ctx.fillRect(x + 1, y + 1 + ((n * 17) % Math.max(1, s - 3)), Math.max(2, s - 3), 1);
    }

    const pattern = h === HEIGHT_CUT ? this.cutTexturePattern : undefined;
    if (pattern && h !== 255) {
      chunk.ctx.save();
      chunk.ctx.globalAlpha = h === HEIGHT_CUT ? 0.055 : this.terrain === "lush" ? 0.014 : 0.009;
      chunk.ctx.fillStyle = pattern;
      chunk.ctx.fillRect(x, y, s, s);
      chunk.ctx.restore();
    }

    if (h >= HEIGHT_TALL && h !== 255) {
      chunk.ctx.strokeStyle = `rgba(8,45,14,${h === HEIGHT_WILD ? 0.24 : 0.14})`;
      chunk.ctx.lineWidth = h === HEIGHT_WILD ? 1.15 : 0.85;
      const blades = h === HEIGHT_WILD ? 3 : n > 0.38 ? 2 : 1;
      for (let b = 0; b < blades; b++) {
        const bladeHash = hash(c + b * 11, r + b * 3);
        const bx = x + 2 + bladeHash * (s - 4);
        const baseY = y + s - 1 - ((b + c + r) % 2);
        const lean = (hash(c + b * 5, r + 19) - 0.5) * (h === HEIGHT_WILD ? 4 : 2.4);
        const tipY = y + (h === HEIGHT_WILD ? 1 : 3 + bladeHash * 2);
        chunk.ctx.beginPath();
        chunk.ctx.moveTo(bx, baseY);
        chunk.ctx.lineTo(bx + lean, tipY);
        chunk.ctx.stroke();
      }
    }

    if (h === HEIGHT_CUT) {
      if (this.mulched[i]) {
        chunk.ctx.fillStyle = "rgba(52,76,28,0.45)";
        for (let bit = 0; bit < 4; bit++) {
          const bx = x + 3 + hash(c + bit * 5, r + 17) * (s - 6);
          const by = y + 3 + hash(c + 23, r + bit * 7) * (s - 6);
          chunk.ctx.fillRect(bx, by, 3, 2);
        }
      }
    }
  }
}
