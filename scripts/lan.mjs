#!/usr/bin/env node
import { networkInterfaces } from "node:os";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const port = Number(process.env.PORT || 5173);

function lanIPs() {
  const ips = [];
  const nets = networkInterfaces();
  for (const list of Object.values(nets)) {
    if (!list) continue;
    for (const n of list) {
      const family = n.family === 4 || n.family === "IPv4";
      if (family && !n.internal) ips.push(n.address);
    }
  }
  return ips;
}

const ips = lanIPs();
const urls = ips.map((ip) => `http://${ip}:${port}`);

console.log("");
console.log("  MowerBoy");
console.log("  --------");
console.log(`  This computer:  http://localhost:${port}`);
if (urls.length === 0) {
  console.log("  Tablet:         (no LAN IP found — check Wi-Fi)");
} else {
  console.log("  Open on iPad / phone (same Wi-Fi):");
  for (const u of urls) console.log(`    ${u}`);
}
console.log("");
console.log("  For a clean play view: tap Full screen, or Share → Add to Home Screen");
console.log("  Tap the screen once if the engine is silent (iPad audio rule).");
console.log("");

try {
  const qr = require("qrcode-terminal");
  const best = urls[0] || `http://localhost:${port}`;
  qr.generate(best, { small: true });
  console.log(`  QR → ${best}`);
  console.log("");
} catch {
  console.log("  (QR skipped — qrcode-terminal not installed yet)");
}

const vite = spawn("npx", ["vite", "--host", "0.0.0.0", "--port", String(port)], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: process.env,
});

vite.on("exit", (code) => process.exit(code ?? 0));
