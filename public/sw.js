// NEXSOLVE Service Worker
// Strategie: cache-first voor Next.js statische assets (content-hash → immutable),
//            network-first voor navigatie en dynamische verzoeken.
// API-calls en auth-routes worden altijd doorgestuurd naar het netwerk.

const CACHE = "nexsolve-v1";

// ── Installatie: sla manifest en SVG-icon alvast op ──────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(["/manifest.webmanifest", "/icon.svg"]).catch(() => {
        // Niet fataal als pre-cache mislukt
      })
    )
  );
});

// ── Activatie: verwijder verouderde caches ────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: intercepteer verzoeken ─────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Alleen GET-verzoeken van hetzelfde domein
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // API-calls, auth-routes en Supabase → altijd netwerk
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.hostname.includes("supabase")
  ) {
    return;
  }

  // Next.js statische assets: content-hash in URL → cache-first (immutable)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // Statische bestanden in /public (SVG, PNG, ico, fonts, …) → cache-first
  if (url.pathname.match(/\.(svg|png|jpg|jpeg|webp|ico|woff2?|ttf)$/)) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // Paginanavigatie: network-first met cache-fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/"))
        )
    );
  }
});
