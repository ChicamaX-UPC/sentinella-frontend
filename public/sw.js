/* global self, caches, fetch */
/**
 * PWA offline (blueprint §9.3):
 * - Cache First: assets estáticos de Next y manifest.
 * - Network First + fallback a caché: GET bajo /api/backend/nodes y /api/backend/alerts.
 */
const STATIC_CACHE = "sentinella-static-v2";
const API_CACHE = "sentinella-api-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== STATIC_CACHE && k !== API_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/_next/image") ||
    pathname.startsWith("/icons/") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js"
  );
}

function isNodesOrAlertsApi(pathname) {
  return pathname.startsWith("/api/backend/nodes") || pathname.startsWith("/api/backend/alerts");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") {
    return;
  }
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(req).then((hit) => {
          if (hit) {
            return hit;
          }
          return fetch(req).then((res) => {
            if (res.ok) {
              cache.put(req, res.clone());
            }
            return res;
          });
        })
      )
    );
    return;
  }

  if (isNodesOrAlertsApi(url.pathname)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(API_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.open(API_CACHE).then((c) =>
            c.match(req).then((hit) => hit || new Response("null", { status: 503, statusText: "Offline" }))
          )
        )
    );
  }
});
