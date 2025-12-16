const CACHE_VERSION = "v1";
const CACHE_NAME = `pwa-cache-${CACHE_VERSION}`;

// ここに「アプリ起動に必要なファイル」を列挙
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",

  // JS（あなたの構成に合わせて src を列挙）
  "./src/main.js",
  "./src/Engine.js",
  "./src/Player.js",
  "./src/Level.js",
  "./src/Hazards.js",
  "./src/Particles.js",
  "./src/Audio.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("pwa-cache-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// fetch戦略：HTMLはネット優先、それ以外はキャッシュ優先
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // GET以外は触らない
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 他ドメインは触らない（CDN等で事故らないように）
  if (url.origin !== self.location.origin) return;

  // HTML（ナビゲーション）はネット優先
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // JS/CSS/画像などはキャッシュ優先
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      });
    })
  );
});
