
const CACHE_NAME = "schoko-tetris-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./sketch.js",
  "./manifest.json",
  "./GOTHICB.TTF",
  "./Vollmilchstück.png",
  "./dunkle Schoki.png",
  "./weiße Schoki.png",
  "https://cdn.jsdelivr.net/npm/p5@2.3.4/lib/p5.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(
        ASSETS.map(url =>
          cache.add(url).catch(error => {
            console.warn("Datei konnte nicht gespeichert werden:", url, error);
          })
        )
      )
    )
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (response.ok && new URL(event.request.url).origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
