// Minimal service worker — enables PWA installability with a network-first
// passthrough. No aggressive precaching (app data is session-based).
const CACHE = "keras-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful same-origin navigations/assets for offline fallback.
        if (
          response.ok &&
          new URL(request.url).origin === self.location.origin
        ) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
