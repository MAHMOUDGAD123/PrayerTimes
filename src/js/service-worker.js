const STATIC_CACHE_NAME = "static-v1";

// Remove the IIFE wrapper - listeners must be top-level
// --------------------------------------------
// Install event - cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        // 1. Fetch cache manifest
        const response = await fetch("cache.json");
        if (!response.ok)
          throw new Error(`HTTP error status: ${response.status}`);

        // 2. Parse JSON list
        const FILES_TO_CACHE = await response.json();

        // 3. Convert to absolute URLs (common issue source)
        const absoluteUrls = FILES_TO_CACHE.map(
          (url) => new URL(url, self.location.href).href
        );

        // 4. Add to cache with improved error handling
        const cache = await caches.open(STATIC_CACHE_NAME);

        // Process files in batches to avoid single failure breaking all
        for (const url of absoluteUrls) {
          try {
            await cache.add(url);
          } catch (err) {
            console.error(`Failed to cache ${url}:`, err);
            // Consider skipping failed files rather than aborting
          }
        }
      } catch (err) {
        console.error("Install failed:", err);
        // Critical failure - skip waiting to avoid broken SW
        self.skipWaiting();
      }
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch event - cache-first strategy
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests and browser extensions
  if (
    event.request.method !== "GET" ||
    event.request.url.startsWith("chrome-extension://")
  ) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // 1. Try cache first
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;

        // 2. Fetch from network
        const networkResponse = await fetch(event.request);

        // 3. Cache successful responses
        if (
          (networkResponse.ok &&
            networkResponse.status !== 206 && // Skip partial content
            networkResponse.type === "basic") ||
          networkResponse.type === "cors"
        ) {
          // Only cache same-origin
          const cache = await caches.open(STATIC_CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }

        return networkResponse;
      } catch (err) {
        // Final fallback to cached response
        const fallback = await caches.match(event.request);
        return fallback || Response.error();
      }
    })()
  );
});

self.addEventListener("error", (event) => {
  console.error("Service Worker Error:", event.message);
});

self.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled Promise Rejection:", event.reason);
});
