#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { createServer as createProbeServer } from "node:net";
import { networkInterfaces } from "node:os";
import { existsSync } from "node:fs";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = resolve(root, "dist");
const stampPath = resolve(dist, ".mowerboy-build.json");
const host = process.env.MOWERBOY_HOST || "0.0.0.0";
const requestedPort = validPort(process.env.PORT || "5173");
const existingUrl = process.env.PORT ? null : await findExistingGateway(requestedPort);
if (existingUrl) {
  console.log(`MowerBoy is already running: ${existingUrl}/host`);
  if (process.env.MOWERBOY_NO_OPEN !== "1") openBrowser(`${existingUrl}/host`);
  process.exit(0);
}
const port = process.env.PORT ? await requireAvailablePort(requestedPort, host) : await firstAvailablePort(requestedPort, host);
const certPath = process.env.MOWERBOY_CERT;
const keyPath = process.env.MOWERBOY_KEY;
const addresses = Object.values(networkInterfaces()).flat().filter((item) => item && !item.internal && (item.family === 4 || item.family === "IPv4")).map((item) => item.address);
let phase = "preparing", detail = port === requestedPort ? "Checking MowerBoy…" : `Port ${requestedPort} is busy. Using ${port} instead…`, release = "";

if (Number(process.versions.node.split(".")[0]) < 20) stop(`Node 20 or newer is required. Found ${process.version}.`);
if (!existsSync(resolve(root, "package-lock.json"))) stop("package-lock.json is missing. Restore the MowerBoy folder and try again.");
if (Boolean(certPath) !== Boolean(keyPath)) stop("Set both MOWERBOY_CERT and MOWERBOY_KEY, or neither.");
const tls = certPath ? { cert: await readFile(resolve(certPath)), key: await readFile(resolve(keyPath)) } : null;
const protocol = tls ? "https" : "http";
const localUrl = `${protocol}://localhost:${port}`;
const lanUrls = addresses.map((address) => `${protocol}://${address}:${port}`);
const server = tls ? createHttpsServer(tls, respond) : createHttpServer(respond);
server.on("error", (error) => stop(error.code === "EADDRINUSE" ? `Port ${port} is already in use. Close the other MowerBoy window and try again.` : error.message));
server.listen(port, host, () => {
  console.log(`MowerBoy host: ${localUrl}/host`);
  lanUrls.forEach((url) => console.log(`Tablet: ${url}`));
  if (!addresses.length) console.log("No Wi-Fi address found. Connect this computer and tablet to the same network.");
  if (process.env.MOWERBOY_NO_OPEN !== "1") openBrowser(`${localUrl}/host`);
  void prepare();
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));

async function prepare() {
  try {
    if (!existsSync(resolve(root, "node_modules/vite/package.json"))) {
      detail = "First-time setup. Installing the locked game files…";
      await run(process.platform === "win32" ? "npm.cmd" : "npm", ["ci"]);
    }
    detail = "Checking for game updates…";
    const sourceHash = await hashInputs();
    let stamp;
    try { stamp = JSON.parse(await readFile(stampPath, "utf8")); } catch { stamp = null; }
    if (!existsSync(resolve(dist, "index.html")) || stamp?.sourceHash !== sourceHash) {
      detail = "Building the game. This can take a minute…";
      await run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"]);
      await writeFile(stampPath, `${JSON.stringify({ sourceHash, builtAt: new Date().toISOString() }, null, 2)}\n`);
    }
    try { release = JSON.parse(await readFile(resolve(dist, "release-manifest.json"), "utf8")).release; } catch { release = sourceHash.slice(0, 16); }
    phase = "ready"; detail = "Ready to play";
  } catch (error) {
    phase = "error"; detail = error instanceof Error ? error.message : String(error);
    console.error(detail);
  }
}

async function respond(req, res) {
  const url = new URL(req.url || "/", localUrl);
  if (url.pathname === "/healthz") return json(res, phase === "error" ? 503 : 200, { app: "mowerboy", phase, detail, release, localUrl, lanUrls });
  if (url.pathname === "/host") return html(res, dashboard());
  if (url.pathname === "/host/qr.svg") {
    const target = lanUrls[0] || localUrl;
    try { res.writeHead(200, { "content-type": "image/svg+xml", "cache-control": "no-store" }); res.end(qrSvg(target)); }
    catch { res.writeHead(503); res.end(); }
    return;
  }
  if (phase !== "ready") { res.writeHead(302, { location: "/host" }); res.end(); return; }
  let requested = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
  let path = resolve(dist, requested);
  const fromRoot = relative(dist, path);
  if (fromRoot.startsWith("..") || resolve(fromRoot) === fromRoot) { res.writeHead(403); res.end("Forbidden"); return; }
  try { if ((await stat(path)).isDirectory()) path = resolve(dist, "index.html"); }
  catch { path = resolve(dist, "index.html"); }
  try {
    const body = await readFile(path), immutable = /\.[a-f0-9]{8,}\.(?:js|css)$/.test(path);
    res.writeHead(200, { "content-type": mime(extname(path)), "cache-control": immutable ? "public, max-age=31536000, immutable" : "no-cache", "x-content-type-options": "nosniff" }); res.end(body);
  } catch { res.writeHead(404); res.end("Not found"); }
}

function dashboard() {
  const links = lanUrls.length ? lanUrls.map((url) => `<a class="url" href="${url}">${url}</a>`).join("") : `<p class="warn">No Wi-Fi address found. Connect this computer and iPad to the same Wi-Fi, then reopen MowerBoy.</p>`;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MowerBoy Host</title><style>
  *{box-sizing:border-box}body{margin:0;background:#143018;color:#f4f1de;font-family:system-ui,sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px}.card{width:min(920px,100%);background:#1e4926;border:5px solid #81c784;border-radius:28px;padding:clamp(22px,4vw,44px);box-shadow:0 18px 55px #07180bbb;text-align:center}h1{font-size:clamp(38px,7vw,70px);margin:0 0 8px;color:#fff176}h2{font-size:clamp(22px,3vw,32px);margin:12px 0}.status{font-size:22px;background:#102418;border-radius:18px;padding:15px;margin:18px auto;max-width:640px}.ready{color:#b9f6ca}.error{color:#ffab91}.grid{display:grid;grid-template-columns:minmax(260px,360px) 1fr;gap:28px;align-items:center;margin-top:24px}img{width:min(340px,80vw);aspect-ratio:1;background:white;padding:14px;border-radius:18px}.url{display:block;color:#fff;background:#276c35;border:3px solid #c8e6c9;border-radius:16px;padding:16px;margin:12px 0;font-size:clamp(18px,2.5vw,28px);font-weight:800;text-decoration:none;overflow-wrap:anywhere}.play{display:inline-block;color:#102418;background:#fff176;border-radius:18px;padding:18px 32px;font-size:26px;font-weight:900;text-decoration:none;margin-top:16px}.hint{font-size:18px;color:#c8e6c9}.warn{color:#ffcc80;font-size:20px}@media(max-width:700px){.grid{grid-template-columns:1fr}}
  </style><main class="card"><h1>MowerBoy</h1><h2>Scan with the iPad camera</h2><div id="status" class="status">${escapeHtml(detail)}</div><div id="ready" class="grid" hidden><img src="/host/qr.svg" alt="QR code for MowerBoy"><section>${links}<p class="hint">Use the same Wi-Fi on this computer and the iPad.</p><a class="play" href="/">Play on this computer</a></section></div><script>
  async function check(){try{const r=await fetch('/healthz',{cache:'no-store'}),s=await r.json(),el=document.querySelector('#status');el.textContent=s.detail;el.className='status '+s.phase;if(s.phase==='ready'){document.querySelector('#ready').hidden=false;return}}catch{}setTimeout(check,800)}check();
  </script></main></html>`;
}

function qrSvg(value) {
  const require = createRequire(import.meta.url), QRCode = require("qrcode-terminal/vendor/QRCode"), level = require("qrcode-terminal/vendor/QRCode/QRErrorCorrectLevel");
  const qr = new QRCode(-1, level.M); qr.addData(value); qr.make(); const quiet = 4, count = qr.getModuleCount(), size = count + quiet * 2;
  let cells = ""; for (let y=0;y<count;y++) for(let x=0;x<count;x++) if(qr.isDark(y,x)) cells += `<rect x="${x+quiet}" y="${y+quiet}" width="1" height="1"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><g fill="#102418">${cells}</g></svg>`;
}
async function hashInputs(){const hash=createHash("sha256"),items=["src","public","index.html","package.json","package-lock.json","tsconfig.json","vite.config.ts"];const files=[];for(const item of items){const path=resolve(root,item);if(existsSync(path))files.push(...await collect(path));}for(const path of files.sort()){hash.update(relative(root,path));hash.update(await readFile(path));}return hash.digest("hex");}
async function collect(path){const info=await stat(path);if(info.isFile())return[path];const out=[];for(const entry of await readdir(path))out.push(...await collect(resolve(path,entry)));return out;}
function run(command,args){return new Promise((ok,bad)=>{const child=spawn(command,args,{cwd:root,stdio:"inherit",shell:process.platform==="win32"});child.on("error",bad);child.on("exit",code=>code===0?ok():bad(new Error(`Setup stopped with code ${code}.`)));});}
function openBrowser(url){const spec=process.platform==="win32"?["cmd.exe",["/d","/s","/c","start","",url]]:process.platform==="darwin"?["open",[url]]:["xdg-open",[url]];const child=spawn(spec[0],spec[1],{detached:true,stdio:"ignore"});child.unref();}
function json(res,status,value){res.writeHead(status,{"content-type":"application/json","cache-control":"no-store"});res.end(JSON.stringify(value));}
function html(res,value){res.writeHead(200,{"content-type":"text/html; charset=utf-8","cache-control":"no-store"});res.end(value);}
function validPort(value){const port=Number(value);if(!Number.isInteger(port)||port<1||port>65535)stop("PORT must be a number from 1 to 65535.");return port;}
async function findExistingGateway(start){const probes=[];for(let port=start;port<start+20&&port<=65535;port++)probes.push((async()=>{try{const response=await fetch(`http://127.0.0.1:${port}/healthz`,{signal:AbortSignal.timeout(350)});const state=await response.json();return state.app==="mowerboy"&&typeof state.localUrl==="string"?state.localUrl:null;}catch{return null;}})());return(await Promise.all(probes)).find(Boolean)||null;}
async function requireAvailablePort(port,address){if(await portAvailable(port,address))return port;stop(`Port ${port} is already in use. Choose another PORT or close the other local server.`);}
async function firstAvailablePort(start,address){for(let candidate=start;candidate<start+20&&candidate<=65535;candidate++){if(await portAvailable(candidate,address))return candidate;}stop(`Ports ${start}-${Math.min(start+19,65535)} are already in use. Close another local server and try again.`);}
async function portAvailable(port,address){const loopbackFree=address!=="0.0.0.0"||await canListen(port,"127.0.0.1");return loopbackFree&&await canListen(port,address);}
function canListen(port,address){return new Promise((resolveAvailable)=>{const probe=createProbeServer();probe.unref();probe.once("error",()=>resolveAvailable(false));probe.listen(port,address,()=>probe.close(()=>resolveAvailable(true)));});}
function mime(ext){return ({".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".webmanifest":"application/manifest+json",".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml",".map":"application/json"})[ext]||"application/octet-stream";}
function escapeHtml(value){return value.replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);}
function stop(message){console.error(`MowerBoy could not start: ${message}`);process.exit(1);}
