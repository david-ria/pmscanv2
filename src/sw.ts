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

// =============================================================================
// BACKGROUND RECORDING & SYNC FEATURES
// =============================================================================

const BACKGROUND_CACHE = 'pmscan-background-v1';
const DATA_CACHE = 'pmscan-data-v1';

// Background sync event handler
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'background-data-collection') {
    event.waitUntil(handleBackgroundDataCollection());
  } else if (event.tag === 'sync-pending-missions') {
    event.waitUntil(syncPendingMissions());
  }
});

// Handle background data collection
async function handleBackgroundDataCollection() {
  try {
    console.log('[SW] Starting background data collection...');
    
    // Get pending data from IndexedDB
    const pendingData = await getPendingBackgroundData();
    
    if (pendingData.length === 0) {
      console.log('[SW] No pending data to process');
      return;
    }
    
    console.log(`[SW] Processing ${pendingData.length} pending data points`);
    
    // Process each data point
    for (const dataPoint of pendingData) {
      try {
        await processDataPoint(dataPoint);
        await clearProcessedData(dataPoint.id);
      } catch (error) {
        console.error('[SW] Error processing data point:', error);
      }
    }
    
    // Notify main app about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_COMPLETE',
        processed: pendingData.length
      });
    });
    
  } catch (error) {
    console.error('[SW] Background data collection failed:', error);
    
    // Notify main app about sync failure
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_FAILED',
        error: error.message
      });
    });
  }
}

// Handle pending missions sync
async function syncPendingMissions() {
  try {
    console.log('[SW] Syncing pending missions...');
    
    // Notify main app to handle mission sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_PENDING_MISSIONS'
      });
    });
    
  } catch (error) {
    console.error('[SW] Mission sync failed:', error);
  }
}

// IndexedDB helpers
async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PMScanBackgroundDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('backgroundData')) {
        const store = db.createObjectStore('backgroundData', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('processed', 'processed');
      }
    };
  });
}

async function getPendingBackgroundData(): Promise<any[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['backgroundData'], 'readonly');
    const store = transaction.objectStore('backgroundData');
    const index = store.index('processed');
    const request = index.getAll(IDBKeyRange.only(false));
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function processDataPoint(dataPoint: any): Promise<void> {
  // Stub for now - can be enhanced later
  console.log('[SW] Processing data point:', dataPoint.id);
  // In a real implementation, this might upload to a server or perform calculations
  await new Promise<void>(resolve => setTimeout(resolve, 100));
}

async function clearProcessedData(id: number): Promise<void> {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(['backgroundData'], 'readwrite');
    const store = transaction.objectStore('backgroundData');
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Message handler for background data storage
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'STORE_BACKGROUND_DATA') {
    await storeBackgroundData(event.data.payload);
    event.ports[0]?.postMessage({ success: true });
  } else if (event.data && event.data.type === 'SCHEDULE_BACKGROUND_SYNC') {
    await scheduleBackgroundSync();
    event.ports[0]?.postMessage({ success: true });
  }
});

async function storeBackgroundData(data: any): Promise<void> {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(['backgroundData'], 'readwrite');
    const store = transaction.objectStore('backgroundData');
    
    const dataToStore = {
      ...data,
      timestamp: Date.now(),
      processed: false
    };
    
    const request = store.add(dataToStore);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function scheduleBackgroundSync() {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('background-data-collection');
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Background data collection alert',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    actions: [
      {
        action: 'open-app',
        title: 'Open App'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('PMScan Background Alert', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open-app') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
    );
  }
});