// Workbox-powered Service Worker (used by scripts/inject-sw.mjs)
// Plain JS only (no TS syntax) because Workbox copies this file as-is to dist/sw.js

self.skipWaiting();

// Load Workbox runtime from CDN (match version with workbox-window dependency)
// eslint-disable-next-line no-undef
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js');

// @ts-ignore - self.workbox provided by the script above
if (self.workbox) {
  // @ts-ignore
  const { workbox } = self;
  workbox.core.clientsClaim();
  workbox.precaching.cleanupOutdatedCaches();

  // Precache files injected by workbox-build (injectManifest)
  // __WB_MANIFEST will be replaced at build time
  // @ts-ignore
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

  // App Shell-style navigation fallback to index.html
  const appShellHandler = workbox.precaching.createHandlerBoundToURL('/index.html');
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    async (args) => {
      try {
        return await appShellHandler(args);
      } catch (err) {
        // Optional offline fallback if offline.html exists and was precached
        const cache = await caches.open(workbox.core.cacheNames.precache);
        const offline = await cache.match('/offline.html');
        return offline || Response.error();
      }
    }
  );

  // Images: Stale-While-Revalidate
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.StaleWhileRevalidate({ cacheName: 'images' })
  );

  // Static resources (CSS/JS/Workers): Stale-While-Revalidate
  workbox.routing.registerRoute(
    ({ request }) => ['style', 'script', 'worker'].includes(request.destination),
    new workbox.strategies.StaleWhileRevalidate({ cacheName: 'static-resources' })
  );
} else {
  // Fallback minimal SW if CDN failed
  self.addEventListener('install', (event) => {
    event.waitUntil(
      (async () => {
        const cache = await caches.open('precache-fallback');
        // @ts-ignore
        const urls = (self.__WB_MANIFEST || []).map((e) => e.url);
        if (urls.length) await cache.addAll(urls);
      })()
    );
  });

  self.addEventListener('activate', (event) => {
    // @ts-ignore
    event.waitUntil(self.clients.claim());
  });
}
