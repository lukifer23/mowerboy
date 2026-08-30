#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = resolve(root, "dist");
const paths = (await walk(dist)).filter((path) => !path.endsWith("release-manifest.json"));
const files = [];
for (const path of paths) {
  const data = await readFile(path);
  files.push({
    url: `./${relative(dist, path).split(sep).join("/")}`,
    bytes: data.byteLength,
    sha256: createHash("sha256").update(data).digest("hex"),
  });
}
files.sort((a, b) => a.url.localeCompare(b.url));
const release = createHash("sha256").update(files.map((file) => `${file.url}:${file.sha256}`).join("\n")).digest("hex").slice(0, 16);
const kind = (url) => url.includes("/vacuums/") ? "vacuum" : url.includes("/mowers/") || /grass|fence|tree|pond|flower|house|rock|hay|bench|barn/.test(url) ? "mow" : "core";
const manifest = {
  schema: 1, release, generatedAt: new Date().toISOString(),
  totals: {
    files: files.length,
    bytes: files.reduce((sum, file) => sum + file.bytes, 0),
    javascriptBytes: files.filter((file) => file.url.endsWith(".js")).reduce((sum, file) => sum + file.bytes, 0),
  },
  packs: Object.fromEntries(["core", "mow", "vacuum"].map((pack) => [pack, files.filter((file) => kind(file.url) === pack).map((file) => file.url)])),
  files,
};
if (manifest.totals.javascriptBytes > 1_700_000) throw new Error(`JavaScript budget exceeded: ${manifest.totals.javascriptBytes} bytes`);
if (manifest.totals.bytes > 19 * 1024 * 1024) throw new Error(`Release budget exceeded: ${manifest.totals.bytes} bytes`);
await writeFile(resolve(dist, "release-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Release ${release}: ${files.length} files, ${(manifest.totals.bytes / 1048576).toFixed(2)} MiB, ${(manifest.totals.javascriptBytes / 1024).toFixed(1)} KiB JS.`);

async function walk(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(path)); else output.push(path);
  }
  return output;
}
