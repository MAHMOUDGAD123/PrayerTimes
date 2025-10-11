const STATIC_CACHE_NAME = "static-v1";

// Remove the IIFE wrapper - listeners must be top-level
// --------------------------------------------

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

// Fetch & Cache
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests and browser extensions
  function shouldHandle(request) {
    return (
      request.method === "GET" &&
      !request.url.startsWith("chrome-extension://") &&
      request.url.startsWith(self.location.origin)
    );
  }

  function isCacheable(response) {
    return (
      response?.ok && // Cache successful responses
      response.status !== 206 && // ignore partial content
      ["basic", "cors"].includes(response.type) // Only cache same-origin
    );
  }

  if (!shouldHandle(event.request)) return;

  console.log(event.url);

  event.respondWith(
    (async () => {
      try {
        // Use cache-first strategy
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;

        // Fetch from network
        const networkResponse = await fetch(event.request);

        if (isCacheable(networkResponse)) {
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
