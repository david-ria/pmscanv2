/// <reference lib="webworker" />
import { clientsClaim, setCacheNameDetails } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

// Types
declare let self: ServiceWorkerGlobalScope;

// Take control immediately
self.skipWaiting();
clientsClaim();

// Version your caches (bump suffix when you ship breaking cache changes)
setCacheNameDetails({ prefix: 'pmscan', suffix: 'v1' });

// Injected at build time: all hashed build assets, index.html, etc.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Offline fallback page (added below in Step 3)
const OFFLINE_FALLBACK_URL = '/offline.html';

// Handle SPA navigations: try network, fall back to offline page
registerRoute(new NavigationRoute(async ({ request }) => {
  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match(OFFLINE_FALLBACK_URL);
    return cached ?? new Response('Offline', { status: 503 });
  }
}));

// Runtime cache for JS/CSS
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({ cacheName: 'pmscan-static' })
);

// Runtime cache for JSON/API (safe offline behavior)
registerRoute(
  ({ url, request }) => request.method === 'GET' && (url.pathname.endsWith('.json') || url.pathname.startsWith('/api/')),
  new NetworkFirst({
    cacheName: 'pmscan-json',
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 3600 }),
    ],
  })
);