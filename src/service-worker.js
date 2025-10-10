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

// Fetch event - network-first strategy
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests and browser extensions
  const shouldHandle = (request) => {
    return (
      request.method === "GET" &&
      !request.url.startsWith("chrome-extension://") &&
      request.url.startsWith(self.location.origin)
    );
  };

  // Cache successful responses
  const isCacheable = (response) => {
    return (
      response?.ok &&
      response.status !== 206 &&
      ["basic", "cors"].includes(response.type)
    );
  };

  if (!shouldHandle(event.request)) return;

  event.respondWith(
    (async () => {
      // 1. Start network request immediately
      const networkFetch = fetch(event.request.clone(), {
        cache: "no-store", // Bypass HTTP cache
      });

      // 2. Always check cache in parallel
      const cacheMatch = caches.match(event.request);

      try {
        // 3. Create proper race with timeout
        const networkPromise = Promise.race([
          networkFetch,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Network timeout")), 10000)
          ),
        ]);

        // 4. Get fastest response (network vs cache)
        const response = await networkPromise.catch(() => cacheMatch);

        // 5. Update cache only AFTER successful response
        if (response instanceof Response && isCacheable(response)) {
          const cache = await caches.open(STATIC_CACHE_NAME);
          cache.put(event.request, response.clone());
        }

        return response;
      } catch (error) {
        // 6. Ultimate fallback - shouldn't happen with above logic
        return (await cacheMatch) || Response.error();
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
