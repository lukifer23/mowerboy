const CACHE = "mowerboy-v6-20260828";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./asset-manifest.json", "./assets/icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(warmCore().then(() => self.skipWaiting()));
});

async function warmCore() {
  const cache = await caches.open(CACHE);
  await cache.addAll(CORE);
  // Vite fingerprints the production JavaScript and CSS. Discover those exact
  // files from the built index so the first installed launch can reopen even
  // when the host briefly disappears from Wi-Fi.
  const response = await cache.match("./index.html");
  if (!response || !response.ok) throw new Error(`MowerBoy shell ${response?.status ?? "missing"}`);
  const html = await response.text();
  const shell = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => new URL(match[1], self.location.href))
    .filter((url) => url.origin === self.location.origin && (url.pathname.includes("/assets/") || /\.(?:js|css)$/.test(url.pathname)))
    .map((url) => url.href);
  const manifestResponse = await cache.match("./asset-manifest.json");
  if (!manifestResponse || !manifestResponse.ok) throw new Error(`MowerBoy asset manifest ${manifestResponse?.status ?? "missing"}`);
  const manifest = await manifestResponse.json();
  const production = [manifest.core, manifest.mow, manifest.vacuum]
    .flat()
    .filter((url) => typeof url === "string")
    .map((url) => new URL(url, self.registration.scope).href);
  const pack = [...new Set([...shell, ...production])];
  for (let index = 0; index < pack.length; index += 6) {
    await cache.addAll(pack.slice(index, index + 6));
  }
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("mowerboy-") && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(networkFirst(event.request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === "basic") await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (request.mode === "navigate" ? cache.match("./") : undefined) || Response.error();
  }
}
