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
// Check if manifest exists before precaching
const manifest = (self as any).__WB_MANIFEST;
if (manifest && Array.isArray(manifest)) {
  precacheAndRoute(manifest);
  cleanupOutdatedCaches();
} else {
  console.warn('[SW] No manifest found, skipping precaching');
}

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

// Runtime cache for JSON/API with enhanced offline behavior
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

// Cache user preferences and settings for offline access
registerRoute(
  ({ url }) => url.pathname.includes('/settings') || url.pathname.includes('/preferences'),
  new StaleWhileRevalidate({
    cacheName: 'pmscan-settings',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 30 * 24 * 3600 }),
    ],
  })
);

// Cache air quality data for offline access
registerRoute(
  ({ url }) => url.pathname.includes('/air-quality') || url.pathname.includes('/missions'),
  new NetworkFirst({
    cacheName: 'pmscan-data',
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 24 * 3600 }),
    ],
  })
);

// Background sync for data synchronization
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-air-quality') {
    event.waitUntil(syncAirQualityData());
  }
  if (event.tag === 'background-sync-missions') {
    event.waitUntil(syncMissionData());
  }
});

// Background sync functions
async function syncAirQualityData() {
  try {
    // Get offline data from IndexedDB and sync when online
    const offlineData = await getOfflineData('air-quality');
    if (offlineData.length > 0) {
      await Promise.all(offlineData.map(data => syncDataToServer(data)));
      await clearOfflineData('air-quality');
    }
  } catch (error) {
    console.error('[SW] Air quality sync failed:', error);
  }
}

async function syncMissionData() {
  try {
    const offlineData = await getOfflineData('missions');
    if (offlineData.length > 0) {
      await Promise.all(offlineData.map(data => syncDataToServer(data)));
      await clearOfflineData('missions');
    }
  } catch (error) {
    console.error('[SW] Mission sync failed:', error);
  }
}

// IndexedDB helper functions for offline data storage
async function getOfflineData(storeName: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pmscan-offline', 1);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    request.onerror = () => reject(request.error);
  });
}

async function clearOfflineData(storeName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pmscan-offline', 1);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    };
    request.onerror = () => reject(request.error);
  });
}

async function syncDataToServer(data: any) {
  try {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.ok;
  } catch (error) {
    console.error('[SW] Failed to sync data:', error);
    return false;
  }
}