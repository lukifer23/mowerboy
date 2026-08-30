import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const args = Object.fromEntries(process.argv.slice(2).map((item) => {
  const [key, ...value] = item.replace(/^--/, "").split("=");
  return [key, value.join("=") || "true"];
}));
const endpoint = args.cdp ?? "http://127.0.0.1:9222";
const targetUrl = args.url;
const screenshot = resolve(args.screenshot ?? "output/fold/latest.png");
let tabs;
try {
  const response = await fetch(`${endpoint}/json/list`, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  tabs = await response.json();
} catch (error) {
  throw new Error(`Fold Chrome debugging is unavailable at ${endpoint}. Connect or wake the Fold, then re-run test:fold. ${error instanceof Error ? error.message : String(error)}`);
}
const tab = tabs.find((item) => {
  if (item.type !== "page") return false;
  try {
    const url = new URL(item.url);
    return (url.protocol === "http:" || url.protocol === "https:") && (url.port === "5173" || url.port === "5174");
  } catch {
    return false;
  }
});
if (!tab) throw new Error("No existing MowerBoy tab found in Fold Chrome. This script never opens a new browser.");

const ws = new WebSocket(tab.webSocketDebuggerUrl);
let nextId = 0;
const pending = new Map();
const errors = [];
const send = (method, params = {}) => new Promise((resolvePromise, rejectPromise) => {
  const id = ++nextId;
  const timer = setTimeout(() => {
    pending.delete(id);
    rejectPromise(new Error(`Fold Chrome did not answer ${method} within 10 seconds.`));
  }, 10_000);
  pending.set(id, {
    resolve: (value) => { clearTimeout(timer); resolvePromise(value); },
    reject: (error) => { clearTimeout(timer); rejectPromise(error); },
  });
  ws.send(JSON.stringify({ id, method, params }));
});
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const promise = pending.get(message.id); pending.delete(message.id);
    if (message.error) promise.reject(new Error(message.error.message)); else promise.resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") errors.push(message.params.entry.text);
};
await new Promise((resolvePromise, rejectPromise) => {
  const timer = setTimeout(() => rejectPromise(new Error("Fold Chrome WebSocket did not connect within 8 seconds.")), 8_000);
  ws.onopen = () => { clearTimeout(timer); resolvePromise(); };
  ws.onerror = (event) => { clearTimeout(timer); rejectPromise(event); };
});
ws.onclose = () => {
  for (const promise of pending.values()) promise.reject(new Error("Fold Chrome debugging connection closed."));
  pending.clear();
};
await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable");
if (targetUrl) { await send("Page.navigate", { url: targetUrl }); await delay(4500); }
else { await send("Page.reload", { ignoreCache: true }); await delay(3500); }
const before = await snapshot();

if (args.drag) {
  const [x1, y1, x2, y2] = args.drag.split(",").map(Number);
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x1, y: y1, radiusX: 12, radiusY: 12 }] });
  for (let step = 1; step <= 12; step++) {
    const t = step / 12;
    await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t, radiusX: 12, radiusY: 12 }] });
    await delay(85);
  }
  await delay(900);
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await delay(1100);
}

const after = await snapshot();
const image = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
await mkdir(dirname(screenshot), { recursive: true });
await writeFile(screenshot, Buffer.from(image.data, "base64"));
ws.close();
console.log(JSON.stringify({ tabId: tab.id, before, after, errors, screenshot }, null, 2));
if (errors.length) process.exitCode = 1;

async function snapshot() {
  const response = await send("Runtime.evaluate", { expression: "JSON.stringify(window.__MOWERBOY_TEST__?.snapshot() ?? null)", returnByValue: true });
  return response.result.value ? JSON.parse(response.result.value) : null;
}
function delay(ms) { return new Promise((resolvePromise) => setTimeout(resolvePromise, ms)); }
