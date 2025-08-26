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

// Offline fallback page 
const OFFLINE_FALLBACK_URL = '/offline.html';

// Manually precache offline.html to ensure it's always available
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('pmscan-precache-v1').then((cache) => {
      return cache.add(OFFLINE_FALLBACK_URL);
    })
  );
});

// Handle SPA navigations: try network, fall back to offline page
registerRoute(new NavigationRoute(async ({ request }) => {
  try {
    // First try to get from cache (for faster response)
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Then try network with timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const networkResponse = await fetch(request, { 
      cache: 'no-cache',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open('pmscan-navigation');
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Navigation failed, serving offline page:', error);
    
    // Try to get offline page from cache
    const offlineResponse = await caches.match(OFFLINE_FALLBACK_URL);
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Final fallback if offline.html is not cached
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head><title>Offline</title></head>
        <body>
          <h1>You're offline</h1>
          <p>The app will keep working for cached pages and assets.</p>
        </body>
      </html>
    `, {
      status: 503,
      headers: { 'Content-Type': 'text/html' }
    });
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