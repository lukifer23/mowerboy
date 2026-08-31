#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = resolve(root, "dist");
const catalog = JSON.parse(await readFile(resolve(root, "src/data/asset-manifest.json"), "utf8"));
const catalogPacks = ["core", "mow", "vacuum"];
const membership = new Map();

for (const pack of catalogPacks) {
  if (!Array.isArray(catalog[pack])) throw new Error(`Asset catalog pack ${pack} is missing.`);
  for (const path of catalog[pack]) {
    if (membership.has(path)) throw new Error(`Asset catalog path is assigned twice: ${path}`);
    membership.set(path, pack);
  }
}

const diskPaths = (await walk(dist)).filter((path) => !path.endsWith("release-manifest.json"));
const entries = [];
for (const diskPath of diskPaths) {
  const data = await readFile(diskPath);
  entries.push({
    path: `./${relative(dist, diskPath).split(sep).join("/")}`,
    bytes: data.byteLength,
    sha256: createHash("sha256").update(data).digest("hex"),
  });
}
entries.sort((a, b) => a.path.localeCompare(b.path));

const byPath = new Map(entries.map((entry) => [entry.path, entry]));
for (const path of membership.keys()) {
  if (!byPath.has(path)) throw new Error(`Cataloged release asset is missing from dist: ${path}`);
}

// The catalog is authoritative for activity ownership. Build output and other
// shell files are core by default; no filename guessing is permitted here.
const packs = { core: [], mow: [], vacuum: [] };
for (const entry of entries) packs[membership.get(entry.path) ?? "core"].push(entry);

const releaseId = createHash("sha256")
  .update(entries.map((entry) => `${entry.path}:${entry.bytes}:${entry.sha256}`).join("\n"))
  .digest("hex")
  .slice(0, 16);
const shellFiles = ["./", "./index.html", "./manifest.webmanifest", "./sw.js", "./asset-manifest.json"]
  .filter((path, index, values) => path === "./" || (byPath.has(path) && values.indexOf(path) === index));
const totals = {
  files: entries.length,
  bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
  javascriptBytes: entries.filter((entry) => entry.path.endsWith(".js")).reduce((sum, entry) => sum + entry.bytes, 0),
};
const manifest = {
  schema: 2,
  releaseId,
  // Kept for one release so older host dashboards can still display an ID.
  release: releaseId,
  generatedAt: new Date().toISOString(),
  shellFiles,
  totals,
  packs,
  files: entries,
};

const javascriptBudget = Number(process.env.MOWERBOY_JS_BUDGET_BYTES ?? 1_700_000);
const releaseBudget = Number(process.env.MOWERBOY_RELEASE_BUDGET_BYTES ?? 17 * 1024 * 1024);
if (totals.javascriptBytes > javascriptBudget) throw new Error(`JavaScript budget exceeded: ${totals.javascriptBytes} > ${javascriptBudget} bytes`);
if (totals.bytes > releaseBudget) throw new Error(`Release budget exceeded: ${totals.bytes} > ${releaseBudget} bytes`);

await writeFile(resolve(dist, "release-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Release ${releaseId}: ${totals.files} files, ${(totals.bytes / 1048576).toFixed(2)} MiB, ${(totals.javascriptBytes / 1024).toFixed(1)} KiB JS.`);

async function walk(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(path)); else output.push(path);
  }
  return output;
}
