import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const assetManifest = JSON.parse(await readFile(resolve(root, "src/data/asset-manifest.json"), "utf8"));
const catalogUrls = [assetManifest.core, assetManifest.mow, assetManifest.vacuum].flat();
const required = catalogUrls.map((url) => `public/${url.replace(/^\.\//, "")}`);

const failures = [];
let bytes = 0;
for (const relative of required) {
  const absolute = resolve(root, relative);
  try {
    const info = await stat(absolute);
    const data = await readFile(absolute);
    bytes += info.size;
    if (info.size < 128) failures.push(`${relative}: file is unexpectedly small`);
    if (relative.endsWith(".png") && !isPng(data)) failures.push(`${relative}: invalid PNG signature or dimensions`);
    if (relative.includes("/environment/") || relative.includes("/vacuums/") || relative.includes("/mowers/")) failures.push(...validateTransparentBounds(data, relative));
    if (relative.endsWith(".jpg") && !isJpeg(data)) failures.push(`${relative}: invalid JPEG signature`);
  } catch (error) {
    failures.push(`${relative}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

try {
  const packed = new Set(catalogUrls);
  for (const relative of required) {
    const url = `./${relative.replace(/^public\//, "")}`;
    if (!packed.has(url)) failures.push(`${relative}: missing from production asset manifest`);
  }
  if (packed.size !== required.length) failures.push(`public/asset-manifest.json: expected ${required.length} unique production assets, found ${packed.size}`);
} catch (error) {
  failures.push(`public/asset-manifest.json: ${error instanceof Error ? error.message : String(error)}`);
}

if (failures.length) {
  console.error(`Asset validation failed (${failures.length}):\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exit(1);
}
console.log(`Asset validation passed: ${required.length} production files, ${(bytes / 1024 / 1024).toFixed(2)} MiB.`);

function isPng(data) {
  return data.length >= 24 && data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && data.readUInt32BE(16) > 0 && data.readUInt32BE(20) > 0;
}

function isJpeg(data) {
  return data.length >= 4 && data[0] === 0xff && data[1] === 0xd8 && data[data.length - 2] === 0xff && data[data.length - 1] === 0xd9;
}

function validateTransparentBounds(data, relative) {
  if (!isPng(data)) return [];
  const width = data.readUInt32BE(16), height = data.readUInt32BE(20);
  const bitDepth = data[24], colorType = data[25], interlace = data[28];
  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) return [`${relative}: production cutouts must be non-interlaced 8-bit RGBA PNGs`];
  const chunks = [];
  for (let offset = 8; offset + 12 <= data.length;) {
    const size = data.readUInt32BE(offset), type = data.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT") chunks.push(data.subarray(offset + 8, offset + 8 + size));
    offset += 12 + size;
    if (type === "IEND") break;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * 4, rows = Buffer.alloc(stride * height);
  let source = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[source++], row = rows.subarray(y * stride, (y + 1) * stride), prev = y ? rows.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const value = raw[source++], left = x >= 4 ? row[x - 4] : 0, up = prev ? prev[x] : 0, upLeft = prev && x >= 4 ? prev[x - 4] : 0;
      row[x] = filter === 0 ? value : filter === 1 ? value + left : filter === 2 ? value + up : filter === 3 ? value + Math.floor((left + up) / 2) : value + paeth(left, up, upLeft);
    }
  }
  let visible = 0, transparent = 0, minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const alpha = rows[y * stride + x * 4 + 3];
    if (alpha <= 4) transparent++; else { visible++; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  }
  const issues = [];
  if (!visible || !transparent) issues.push(`${relative}: cutout must contain both visible art and genuine transparency`);
  if (visible && (minX < 2 || minY < 2 || maxX > width - 3 || maxY > height - 3)) issues.push(`${relative}: visible artwork touches the image edge`);
  return issues;
}

function paeth(a, b, c) {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}
