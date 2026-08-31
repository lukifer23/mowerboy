const CACHE_PREFIX = "mowerboy-release-";
const META_CACHE = "mowerboy-release-meta-v2";
const STATE_KEY = new URL("./release-state.json", self.registration.scope).href;
const MANIFEST_KEY = new URL("./release-manifest.json", self.registration.scope).href;
const PACKS = ["core", "mow", "vacuum"];

self.addEventListener("install", (event) => {
  event.waitUntil(stageRelease().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(promoteStagedRelease());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(fetchFromActiveRelease(event.request));
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "ROLLBACK_RELEASE") return;
  event.waitUntil(rollbackRelease().then((state) => event.ports[0]?.postMessage({ ok: true, state })).catch((error) => {
    event.ports[0]?.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }));
});

async function stageRelease() {
  const response = await fetch(MANIFEST_KEY, { cache: "no-store" });
  if (!response.ok) throw new Error(`release manifest ${response.status}`);
  const manifest = await response.clone().json();
  validateManifest(manifest);

  const availablePacks = [];
  for (const pack of PACKS) {
    const cacheName = releaseCacheName(manifest.releaseId, pack);
    await caches.delete(cacheName);
    try {
      const cache = await caches.open(cacheName);
      for (const entry of manifest.packs[pack]) await fetchVerifyAndPut(cache, entry);
      if (pack === "core") {
        await cache.put(MANIFEST_KEY, response.clone());
        const index = await cache.match(new URL("./index.html", self.registration.scope));
        if (!index) throw new Error("core pack does not contain index.html");
        await cache.put(new URL("./", self.registration.scope), index.clone());
      }
      availablePacks.push(pack);
    } catch (error) {
      await caches.delete(cacheName);
      if (pack === "core") throw error;
      console.warn(`MowerBoy could not cache the ${pack} pack. Online play remains available.`, error);
    }
  }

  await writeState({
    ...(await readState()),
    stagedReleaseId: manifest.releaseId,
    stagedPacks: availablePacks,
  });
}

async function promoteStagedRelease() {
  const state = await readState();
  if (!state.stagedReleaseId || !state.stagedPacks?.includes("core")) {
    throw new Error("No verified core release is staged.");
  }

  const sameRelease = state.activeReleaseId === state.stagedReleaseId;
  const next = {
    schema: 2,
    activeReleaseId: state.stagedReleaseId,
    activePacks: state.stagedPacks,
    previousReleaseId: sameRelease ? state.previousReleaseId ?? null : state.activeReleaseId ?? null,
    previousPacks: sameRelease ? state.previousPacks ?? [] : state.activePacks ?? [],
    promotedAt: new Date().toISOString(),
  };
  await writeState(next);

  const keep = new Set([next.activeReleaseId, next.previousReleaseId].filter(Boolean));
  const names = await caches.keys();
  await Promise.all(names
    .filter((name) => name.startsWith(CACHE_PREFIX) && name !== META_CACHE)
    .filter((name) => ![...keep].some((releaseId) => name.startsWith(`${CACHE_PREFIX}${releaseId}-`)))
    .map((name) => caches.delete(name)));
  await self.clients.claim();
}

async function rollbackRelease() {
  const state = await readState();
  if (!state.previousReleaseId || !state.previousPacks?.includes("core")) throw new Error("No verified previous release is available.");
  const next = {
    schema: 2,
    activeReleaseId: state.previousReleaseId,
    activePacks: state.previousPacks,
    previousReleaseId: state.activeReleaseId,
    previousPacks: state.activePacks ?? [],
    promotedAt: new Date().toISOString(),
  };
  await writeState(next);
  return next;
}

async function fetchFromActiveRelease(request) {
  const state = await readState();
  if (state.activeReleaseId) {
    for (const pack of state.activePacks ?? []) {
      const cache = await caches.open(releaseCacheName(state.activeReleaseId, pack));
      const hit = await cache.match(request, { ignoreSearch: false });
      if (hit) return hit;
    }
  }

  try {
    return await fetch(request);
  } catch {
    if (request.mode === "navigate" && state.activeReleaseId) {
      const core = await caches.open(releaseCacheName(state.activeReleaseId, "core"));
      return (await core.match(new URL("./", self.registration.scope))) ?? Response.error();
    }
    return Response.error();
  }
}

async function fetchVerifyAndPut(cache, entry) {
  const url = new URL(entry.path, self.registration.scope);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${entry.path} returned ${response.status}`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== entry.bytes) throw new Error(`${entry.path} length ${bytes.byteLength} did not match ${entry.bytes}`);
  const digest = bytesToHex(await crypto.subtle.digest("SHA-256", bytes));
  if (digest !== entry.sha256) throw new Error(`${entry.path} failed SHA-256 verification`);
  const headers = new Headers(response.headers);
  headers.set("x-mowerboy-sha256", digest);
  await cache.put(url, new Response(bytes, { status: response.status, statusText: response.statusText, headers }));
}

function validateManifest(manifest) {
  if (manifest?.schema !== 2 || typeof manifest.releaseId !== "string" || !/^[a-f0-9]{16}$/.test(manifest.releaseId)) {
    throw new Error("Unsupported release manifest.");
  }
  for (const pack of PACKS) {
    if (!Array.isArray(manifest.packs?.[pack])) throw new Error(`Release manifest is missing ${pack}.`);
    for (const entry of manifest.packs[pack]) {
      if (typeof entry?.path !== "string" || !entry.path.startsWith("./") || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
        throw new Error(`Invalid ${pack} release entry.`);
      }
    }
  }
}

async function readState() {
  try {
    return await (await (await caches.open(META_CACHE)).match(STATE_KEY))?.json() ?? { schema: 2 };
  } catch {
    return { schema: 2 };
  }
}

async function writeState(state) {
  const cache = await caches.open(META_CACHE);
  await cache.put(STATE_KEY, new Response(JSON.stringify(state), { headers: { "content-type": "application/json", "cache-control": "no-store" } }));
}

function releaseCacheName(releaseId, pack) {
  return `${CACHE_PREFIX}${releaseId}-${pack}`;
}

function bytesToHex(buffer) {
  return [...new Uint8Array(buffer)].map((value) => value.toString(16).padStart(2, "0")).join("");
}
