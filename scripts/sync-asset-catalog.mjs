#!/usr/bin/env node
import { copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
await copyFile(resolve(root, "src/data/asset-manifest.json"), resolve(root, "public/asset-manifest.json"));
