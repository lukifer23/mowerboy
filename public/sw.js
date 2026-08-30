const PREFIX = "mowerboy-release-";
const META = "mowerboy-meta";

self.addEventListener("install", (event) => event.waitUntil(stageRelease().then(() => self.skipWaiting())));

async function stageRelease() {
  const response = await fetch(new URL("release-manifest.json", self.registration.scope), { cache: "no-store" });
  if (!response.ok) throw new Error(`release manifest ${response.status}`);
  const manifest = await response.json();
  const name = `${PREFIX}${manifest.release}`;
  const cache = await caches.open(name);
  const urls = [...new Set(["./", "./release-manifest.json", ...manifest.packs.core, ...manifest.packs.mow, ...manifest.packs.vacuum])];
  try {
    for (let index = 0; index < urls.length; index += 6) await cache.addAll(urls.slice(index, index + 6));
  } catch (error) {
    await caches.delete(name);
    throw error;
  }
}

self.addEventListener("activate", (event) => event.waitUntil(promoteRelease()));

async function promoteRelease() {
  const releases = (await caches.keys()).filter((key) => key.startsWith(PREFIX));
  const current = releases.at(-1);
  if (current) {
    const meta = await caches.open(META);
    let history = [];
    try { history = await (await meta.match("./history.json"))?.json() ?? []; } catch { history = []; }
    history = [current, ...history.filter((item) => item !== current && releases.includes(item))].slice(0, 2);
    await meta.put("./history.json", new Response(JSON.stringify(history), { headers: { "content-type": "application/json" } }));
    await Promise.all(releases.filter((key) => !history.includes(key)).map((key) => caches.delete(key)));
  }
  await self.clients.claim();
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const releases = (await caches.keys()).filter((key) => key.startsWith(PREFIX));
      if (releases.length) await (await caches.open(releases.at(-1))).put(request, response.clone());
    }
    return response;
  } catch {
    return request.mode === "navigate" ? (await caches.match("./")) || Response.error() : Response.error();
  }
}
