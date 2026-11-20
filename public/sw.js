// Service worker: makes the app installable and lets it open without a network.
// - Page loads: network first, the last good copy when offline.
// - /assets/* (hashed file names) and /icons/*: cache first.
// - /api/* is never cached: expense data always comes from the spreadsheet.
// The file never changes between deploys, so the logic below must not depend on build output.

const CACHE = "saving-v1";
const STATIC_FILES = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon.svg"];
const ASSET_PATTERN = /\/assets\/[^"'\s)]+/g;
// ignoreVary: servers may answer assets with "Vary: Origin", and module scripts are requested with
// an Origin header that the precached copy was not, so a strict match would always miss offline.
const MATCH_OPTIONS = { ignoreVary: true };

const assetsIn = (html) => new Set(html.match(ASSET_PATTERN) ?? []);

// Stores the page and the assets it references, then drops assets from older builds.
const storeShell = async (response) => {
  const cache = await caches.open(CACHE);
  const assets = assetsIn(await response.clone().text());
  await cache.put("/", response);
  await cache.addAll([...assets]);
  for (const request of await cache.keys()) {
    const path = new URL(request.url).pathname;
    if (path.startsWith("/assets/") && !assets.has(path)) {
      await cache.delete(request);
    }
  }
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(STATIC_FILES);
      await storeShell(await fetch("/", { cache: "no-store" }));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key !== CACHE) {
          await caches.delete(key);
        }
      }
      await self.clients.claim();
    })(),
  );
});

const pageRequest = async (event) => {
  try {
    const response = await fetch(event.request);
    if (response.ok) {
      // Refresh the offline copy in the background; the user gets the network response now.
      event.waitUntil(storeShell(response.clone()).catch(() => undefined));
    }
    return response;
  } catch {
    return (await caches.match("/", MATCH_OPTIONS)) ?? Response.error();
  }
};

const staticRequest = async (request) => {
  const cached = await caches.match(request, MATCH_OPTIONS);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(pageRequest(event));
  } else if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(staticRequest(request));
  }
});
