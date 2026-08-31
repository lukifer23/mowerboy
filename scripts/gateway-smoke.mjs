#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = await availablePort();
const origin = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, [resolve(root, "scripts/gateway.mjs")], {
  cwd: root,
  env: { ...process.env, PORT: String(port), MOWERBOY_HOST: "127.0.0.1", MOWERBOY_NO_OPEN: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
child.stdout.on("data", (chunk) => { output += chunk; });
child.stderr.on("data", (chunk) => { output += chunk; });

try {
  const health = await waitUntilReady();
  const manifest = JSON.parse(await readFile(resolve(root, "dist/release-manifest.json"), "utf8"));
  const buildStamp = JSON.parse(await readFile(resolve(root, "dist/.mowerboy-build.json"), "utf8"));
  assert(health.release === manifest.releaseId, `health release ${health.release} did not match ${manifest.releaseId}`);
  assert(health.sourceHash === buildStamp.sourceHash, "health source hash did not match the successful build stamp");

  const missing = await fetch(`${origin}/assets/does-not-exist.png`);
  assert(missing.status === 404, `missing asset returned ${missing.status}`);

  const route = await fetch(`${origin}/a-gentle-route`, { headers: { accept: "text/html" } });
  assert(route.status === 200 && (await route.text()).includes("<div id=\"app\">"), "navigation route did not return the SPA shell");

  const malformed = await fetch(`${origin}/bad%5Cpath`, { headers: { accept: "text/html" } });
  assert(malformed.status === 400, `malformed path returned ${malformed.status}`);

  const head = await fetch(`${origin}/release-manifest.json`, { method: "HEAD" });
  assert(head.status === 200 && (await head.arrayBuffer()).byteLength === 0, "HEAD response was not bodyless");
  console.log(`Gateway smoke passed on isolated port ${port} for release ${manifest.releaseId}.`);
} catch (error) {
  if (output.trim()) console.error(output.trim());
  throw error;
} finally {
  child.kill("SIGTERM");
  await Promise.race([new Promise((resolveExit) => child.once("exit", resolveExit)), new Promise((resolveWait) => setTimeout(resolveWait, 3_000))]);
}

async function waitUntilReady() {
  for (let attempt = 0; attempt < 1_200; attempt++) {
    if (child.exitCode !== null) throw new Error(`Gateway exited with ${child.exitCode}.`);
    try {
      const response = await fetch(`${origin}/healthz`, { cache: "no-store" });
      const state = await response.json();
      if (response.ok && state.phase === "ready") return state;
      if (state.phase === "error") throw new Error(state.detail);
    } catch (error) {
      if (error instanceof Error && !/fetch failed/i.test(error.message)) throw error;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error("Gateway did not become ready within two minutes.");
}

function availablePort() {
  return new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close(() => typeof address === "object" && address ? resolvePort(address.port) : reject(new Error("No test port.")));
    });
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
