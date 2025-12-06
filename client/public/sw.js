const CACHE_NAME = "mysnapdrop-shell-v1";
const SHELL_URLS = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_URLS);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle navigation and same-origin GET requests.
  if (request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).catch(() => {
        // For navigation failures, fall back to cached shell if available.
        if (request.mode === "navigate") {
          return caches.match("/index.html");
        }
        throw new Error("Network and cache both failed.");
      });
    })
  );
});

