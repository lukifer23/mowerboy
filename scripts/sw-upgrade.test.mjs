import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workerSource = await readFile(resolve(root, "public/sw.js"), "utf8");
const origin = "https://mowerboy.test/";
const META_CACHE = "mowerboy-release-meta-v2";

test("verified releases promote atomically, isolate optional pack failure, roll back, and prune release three", async () => {
  const harness = createHarness();
  const v1 = release("1111111111111111", "v1");
  const v2 = release("2222222222222222", "v2");
  const v3 = release("3333333333333333", "v3");
  const interrupted = release("cccccccccccccccc", "interrupted");

  // Model the monolithic cache and history record left by the schema-v1
  // worker. A V2 activation must not select it by cache-key ordering.
  const legacy = await harness.cache(`mowerboy-release-${v1.releaseId}`);
  await legacy.put(new URL("./", origin), new Response("legacy shell"));
  const legacyMeta = await harness.cache("mowerboy-meta");
  await legacyMeta.put(new URL("./history.json", origin), new Response(JSON.stringify([`mowerboy-release-${v1.releaseId}`])));

  harness.serve(v1);
  await harness.installAndActivate();
  const firstState = await harness.state();
  assert.deepEqual({ ...firstState, promotedAt: "<timestamp>" }, {
    schema: 2,
    activeReleaseId: v1.releaseId,
    activePacks: ["core", "mow", "vacuum"],
    previousReleaseId: null,
    previousPacks: [],
    promotedAt: "<timestamp>",
  });
  assert.equal(typeof firstState.promotedAt, "string");
  assert.equal(await harness.hasCache(`mowerboy-release-${v1.releaseId}`), false, "V1 monolithic cache should be retired");
  await harness.assertInventory(v1);

  // Simulate a quota/cache write failure after core and mow have staged. The
  // failed vacuum cache must be discarded without invalidating valid packs.
  harness.serve(v2);
  harness.failPut = (cacheName, url) => cacheName.endsWith("-vacuum") && url.endsWith("/vacuum.png");
  await harness.installAndActivate();
  harness.failPut = null;
  let state = await harness.state();
  assert.equal(state.activeReleaseId, v2.releaseId);
  assert.deepEqual(state.activePacks, ["core", "mow"]);
  assert.equal(state.previousReleaseId, v1.releaseId);
  assert.equal(await harness.hasCache(`mowerboy-release-${v2.releaseId}-vacuum`), false);
  await harness.assertInventory(v2, ["core", "mow"]);

  // An interrupted core write rejects the install before staged metadata is
  // changed, leaving the currently active V2 release fully usable.
  harness.serve(interrupted);
  harness.failPut = (cacheName, url) => cacheName.endsWith("-core") && url.endsWith("/app.js");
  await assert.rejects(harness.install(), /Quota exceeded/);
  harness.failPut = null;
  assert.equal((await harness.state()).activeReleaseId, v2.releaseId);
  assert.equal(await harness.hasCache(`mowerboy-release-${interrupted.releaseId}-core`), false);

  const rollback = await harness.rollback();
  assert.equal(rollback.ok, true);
  state = await harness.state();
  assert.equal(state.activeReleaseId, v1.releaseId);
  assert.equal(state.previousReleaseId, v2.releaseId);

  // A corrupt core entry rejects installation and cannot change active state.
  const corrupt = structuredClone(v3);
  corrupt.packs.core[0].sha256 = "0".repeat(64);
  harness.serve(corrupt);
  await assert.rejects(harness.install(), /SHA-256 verification/);
  assert.equal((await harness.state()).activeReleaseId, v1.releaseId);
  assert.equal(await harness.hasCache(`mowerboy-release-${v3.releaseId}-core`), false);

  // A valid third release promotes, retains only its predecessor, and removes
  // all pack caches belonging to the no-longer-reachable v2 release.
  harness.serve(v3);
  await harness.installAndActivate();
  state = await harness.state();
  assert.equal(state.activeReleaseId, v3.releaseId);
  assert.equal(state.previousReleaseId, v1.releaseId);
  for (const pack of ["core", "mow", "vacuum"]) {
    assert.equal(await harness.hasCache(`mowerboy-release-${v2.releaseId}-${pack}`), false);
  }
  assert.equal(await harness.hasCache(META_CACHE), true, "release pruning must not delete metadata");
  await harness.assertInventory(v3);
});

test("fetch reads the active release only and never falls through to previous or unrelated caches", async () => {
  const harness = createHarness();
  const v1 = release("aaaaaaaaaaaaaaaa", "old");
  const v2 = release("bbbbbbbbbbbbbbbb", "active");
  harness.serve(v1);
  await harness.installAndActivate();
  harness.serve(v2);
  await harness.installAndActivate();

  const networkCount = harness.networkRequests.length;
  const navigation = await harness.dispatchFetch("./?test=1&activity=mow", { mode: "navigate" });
  assert.equal(await navigation.text(), "<html>active</html>");
  assert.equal(
    harness.networkRequests.length,
    networkCount,
    "active query-string navigation must not consult the network",
  );

  const activeResponse = await harness.dispatchFetch("./mow.png", { headers: { Origin: origin } });
  assert.equal(await activeResponse.text(), "active:mow");

  const previousCore = await harness.cache(`mowerboy-release-${v1.releaseId}-core`);
  await previousCore.put(new URL("./previous-only.txt", origin), new Response("stale previous"));
  const unrelated = await harness.cache("some-other-app-cache");
  await unrelated.put(new URL("./network-only.txt", origin), new Response("unrelated poison"));
  harness.network.set(new URL("./previous-only.txt", origin).href, new Response("fresh network"));
  harness.network.set(new URL("./network-only.txt", origin).href, new Response("network wins"));

  assert.equal(await (await harness.dispatchFetch("./previous-only.txt")).text(), "fresh network");
  assert.equal(await (await harness.dispatchFetch("./network-only.txt")).text(), "network wins");
  assert.deepEqual(harness.networkRequests.slice(-2), [
    new URL("./previous-only.txt", origin).href,
    new URL("./network-only.txt", origin).href,
  ]);
});

function createHarness() {
  const listeners = new Map();
  const storage = new MockCacheStorage();
  const network = new Map();
  const networkRequests = [];
  const self = {
    registration: { scope: origin },
    location: new URL(origin),
    clients: { claim: async () => undefined },
    skipWaiting: async () => undefined,
    addEventListener(type, listener) { listeners.set(type, listener); },
  };
  const harness = {
    network,
    networkRequests,
    failPut: null,
    serve(manifest) {
      network.clear();
      network.set(new URL("./release-manifest.json", origin).href, jsonResponse(manifest));
      for (const pack of ["core", "mow", "vacuum"]) {
        for (const entry of manifest.packs[pack]) {
          network.set(new URL(entry.path, origin).href, new Response(manifest.bodies[entry.path], { headers: { "content-type": mime(entry.path), vary: "Origin" } }));
        }
      }
    },
    async install() { await dispatchExtendable(listeners.get("install")); },
    async activate() { await dispatchExtendable(listeners.get("activate")); },
    async installAndActivate() { await this.install(); await this.activate(); },
    async state() {
      const meta = await storage.open(META_CACHE);
      return (await meta.match(new URL("./release-state.json", origin)))?.json();
    },
    async rollback() {
      let result;
      await dispatchExtendable(listeners.get("message"), {
        data: { type: "ROLLBACK_RELEASE" },
        ports: [{ postMessage(value) { result = value; } }],
      });
      return result;
    },
    async dispatchFetch(path, options = {}) {
      let responsePromise;
      const url = new URL(path, origin).href;
      listeners.get("fetch")({
        request: options.mode === "navigate"
          ? { url, method: "GET", mode: "navigate" }
          : new Request(url, { headers: options.headers }),
        respondWith(value) { responsePromise = Promise.resolve(value); },
      });
      assert.ok(responsePromise, "fetch handler did not respond");
      return responsePromise;
    },
    cache: (name) => storage.open(name),
    async hasCache(name) { return (await storage.keys()).includes(name); },
    async assertInventory(manifest, availablePacks = ["core", "mow", "vacuum"]) {
      const state = await this.state();
      assert.deepEqual(state.activePacks, availablePacks);
      for (const pack of availablePacks) {
        const cache = await storage.open(`mowerboy-release-${manifest.releaseId}-${pack}`);
        const actual = (await cache.keys()).map((request) => request.url).sort();
        const expected = manifest.packs[pack].map((entry) => new URL(entry.path, origin).href);
        if (pack === "core") expected.push(new URL("./", origin).href, new URL("./release-manifest.json", origin).href);
        assert.deepEqual(actual, [...new Set(expected)].sort(), `${pack} inventory differs`);
        for (const entry of manifest.packs[pack]) {
          const response = await cache.match(new URL(entry.path, origin));
          assert.equal(response.headers.get("x-mowerboy-sha256"), entry.sha256);
          assert.equal((await response.arrayBuffer()).byteLength, entry.bytes);
        }
      }
    },
  };
  storage.beforePut = (name, url) => {
    if (harness.failPut?.(name, url)) throw new DOMException("Quota exceeded", "QuotaExceededError");
  };

  const context = vm.createContext({
    self,
    caches: storage,
    crypto: webcrypto,
    console: { ...console, warn() {} },
    URL,
    Request,
    Response,
    Headers,
    DOMException,
    Date,
  });
  vm.runInContext(workerSource, context, { filename: "public/sw.js" });

  async function dispatchExtendable(listener, extra = {}) {
    assert.ok(listener, "service-worker listener is missing");
    const promises = [];
    listener({ ...extra, waitUntil(value) { promises.push(Promise.resolve(value)); } });
    await Promise.all(promises);
  }

  async function workerFetch(input) {
    const url = requestUrl(input);
    networkRequests.push(url);
    const response = network.get(url);
    if (!response) throw new TypeError(`Network unavailable for ${url}`);
    return response.clone();
  }
  context.fetch = workerFetch;
  return harness;
}

class MockCacheStorage {
  caches = new Map();
  beforePut = null;
  async open(name) {
    if (!this.caches.has(name)) this.caches.set(name, new MockCache(name, this));
    return this.caches.get(name);
  }
  async keys() { return [...this.caches.keys()]; }
  async delete(name) { return this.caches.delete(name); }
}

class MockCache {
  entries = new Map();
  constructor(name, owner) { this.name = name; this.owner = owner; }
  async put(input, response) {
    const url = requestUrl(input);
    this.owner.beforePut?.(this.name, url);
    this.entries.set(url, { request: toRequest(input), response: response.clone() });
  }
  async match(input, options = {}) {
    const requested = new URL(requestUrl(input));
    const request = toRequest(input);
    for (const [url, entry] of this.entries) {
      const candidate = new URL(url);
      if (options.ignoreSearch) { requested.search = ""; candidate.search = ""; }
      if (candidate.href !== requested.href) continue;
      if (!options.ignoreVary && varyDiffers(entry.request, request, entry.response)) continue;
      return entry.response.clone();
    }
    return undefined;
  }
  async keys() { return [...this.entries.keys()].map((url) => new Request(url)); }
}

function release(releaseId, label) {
  const bodies = {
    "./index.html": `<html>${label}</html>`,
    "./app.js": `globalThis.release=${JSON.stringify(label)}`,
    "./sw.js": `// ${label}`,
    "./manifest.webmanifest": JSON.stringify({ name: `MowerBoy ${label}` }),
    "./asset-manifest.json": JSON.stringify({ version: 1 }),
    "./mow.png": `${label}:mow`,
    "./vacuum.png": `${label}:vacuum`,
  };
  const packPaths = {
    core: ["./index.html", "./app.js", "./sw.js", "./manifest.webmanifest", "./asset-manifest.json"],
    mow: ["./mow.png"],
    vacuum: ["./vacuum.png"],
  };
  const packs = Object.fromEntries(Object.entries(packPaths).map(([pack, paths]) => [pack, paths.map((path) => entry(path, bodies[path]))]));
  return {
    schema: 2,
    releaseId,
    release: releaseId,
    generatedAt: new Date(0).toISOString(),
    shellFiles: ["./", "./index.html", "./manifest.webmanifest", "./sw.js", "./asset-manifest.json"],
    packs,
    files: Object.values(packs).flat(),
    bodies,
  };
}

function entry(path, body) {
  const bytes = Buffer.from(body);
  return { path, bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") };
}

function requestUrl(input) {
  if (input instanceof Request) return input.url;
  if (input instanceof URL) return input.href;
  if (input && typeof input === "object" && typeof input.url === "string") return input.url;
  return new URL(String(input), origin).href;
}
function toRequest(input) {
  if (input instanceof Request) return input.clone();
  return new Request(requestUrl(input));
}
function varyDiffers(storedRequest, incomingRequest, response) {
  const vary = response.headers.get("vary");
  if (!vary) return false;
  if (vary.trim() === "*") return true;
  return vary.split(",").some((name) => storedRequest.headers.get(name.trim()) !== incomingRequest.headers.get(name.trim()));
}
function jsonResponse(value) { return new Response(JSON.stringify(value), { headers: { "content-type": "application/json" } }); }
function mime(path) { return path.endsWith(".html") ? "text/html" : path.endsWith(".js") ? "text/javascript" : "application/octet-stream"; }
