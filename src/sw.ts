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

// ============================================================================
// BACKGROUND RECORDING SYSTEM
// ============================================================================

const DB_NAME = 'pmscan-background';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

let heartbeatTimer: number | null = null;

// Initialize IndexedDB - Always open fresh connection
async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[SW] IndexedDB error:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      const database = request.result;
      console.log('[SW] IndexedDB opened successfully');
      resolve(database);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        console.log('[SW] IndexedDB store created:', STORE_NAME);
      }
    };
  });
}

// Store data in IndexedDB
async function storeData(data: any): Promise<void> {
  let database: IDBDatabase | null = null;
  
  try {
    database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const entry = {
      ...data,
      timestamp: Date.now(),
      stored: new Date().toISOString(),
    };
    
    await new Promise((resolve, reject) => {
      const request = store.add(entry);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      
      transaction.oncomplete = () => {
        console.log('[SW] ✅ Data stored successfully:', entry.type || 'unknown');
        resolve(undefined);
      };
      
      transaction.onerror = () => {
        console.error('[SW] ❌ Transaction error:', transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('[SW] ❌ Failed to store data:', error);
  } finally {
    // Close connection after operation
    if (database) {
      database.close();
    }
  }
}

// Get all stored data
async function getAllData(): Promise<any[]> {
  let database: IDBDatabase | null = null;
  
  try {
    database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        database?.close();
        resolve(request.result);
      };
      request.onerror = () => {
        database?.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[SW] Failed to get data:', error);
    if (database) database.close();
    return [];
  }
}

// Clear old data (keep last 1000 entries)
async function cleanupOldData(): Promise<void> {
  let database: IDBDatabase | null = null;
  
  try {
    database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    
    const allKeys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const request = index.getAllKeys();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    if (allKeys.length > 1000) {
      const keysToDelete = allKeys.slice(0, allKeys.length - 1000);
      for (const key of keysToDelete) {
        store.delete(key);
      }
      console.log('[SW] Cleaned up', keysToDelete.length, 'old entries');
    }
  } catch (error) {
    console.error('[SW] Failed to cleanup data:', error);
  } finally {
    if (database) database.close();
  }
}

// Heartbeat function
async function sendHeartbeat(): Promise<void> {
  try {
    const clients = await self.clients.matchAll({ type: 'window' });
    
    if (clients.length === 0) {
      console.log('[SW] No clients connected, stopping heartbeat');
      stopHeartbeat();
      return;
    }
    
    // Send heartbeat to all clients
    for (const client of clients) {
      client.postMessage({
        type: 'HEARTBEAT',
        timestamp: Date.now(),
      });
    }
    
    // Store heartbeat record
    await storeData({
      type: 'heartbeat',
      clientCount: clients.length,
    });
    
    // Cleanup old data periodically
    if (Math.random() < 0.1) { // 10% chance each heartbeat
      await cleanupOldData();
    }
    
    console.log('[SW] Heartbeat sent to', clients.length, 'client(s)');
  } catch (error) {
    console.error('[SW] Heartbeat error:', error);
  }
}

// Start heartbeat
function startHeartbeat(): void {
  if (heartbeatTimer) return;
  
  console.log('[SW] Starting heartbeat (interval:', HEARTBEAT_INTERVAL, 'ms)');
  heartbeatTimer = self.setInterval(() => {
    sendHeartbeat();
  }, HEARTBEAT_INTERVAL) as unknown as number;
  
  // Send first heartbeat immediately
  sendHeartbeat();
}

// Stop heartbeat
function stopHeartbeat(): void {
  if (heartbeatTimer) {
    console.log('[SW] Stopping heartbeat');
    self.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

// Message handler
self.addEventListener('message', (event) => {
  console.log('[SW] Received message:', event.data.type);
  
  switch (event.data.type) {
    case 'START_BACKGROUND_RECORDING':
      startHeartbeat();
      storeData({
        type: 'recording_started',
        frequency: event.data.payload?.frequency,
      });
      break;
      
    case 'STOP_BACKGROUND_RECORDING':
      stopHeartbeat();
      storeData({
        type: 'recording_stopped',
      });
      break;
      
    case 'STORE_BACKGROUND_DATA':
      storeData({
        type: 'recording_data',
        ...event.data.payload,
      });
      break;
      
    case 'EMERGENCY_SAVE':
      console.log('[SW] 🚨 Emergency save triggered');
      const emergencyData = event.data.payload;
      
      // Store each data point from emergency save
      if (emergencyData.recordingData && Array.isArray(emergencyData.recordingData)) {
        emergencyData.recordingData.forEach((dataPoint: any) => {
          storeData({
            type: 'recording_data',
            ...dataPoint,
            emergencySave: true,
            interruptionType: emergencyData.interruptionType
          });
        });
      }
      
      // Store emergency event marker
      storeData({
        type: 'emergency_save',
        dataPointCount: emergencyData.recordingData?.length || 0,
        interruptionType: emergencyData.interruptionType,
        missionContext: emergencyData.missionContext,
        timestamp: emergencyData.timestamp
      });
      break;
      
    case 'SCHEDULE_BACKGROUND_SYNC':
      if ('sync' in self.registration) {
        self.registration.sync.register('background-sync')
          .then(() => {
            console.log('[SW] Background sync scheduled');
            storeData({
              type: 'sync_scheduled',
            });
          })
          .catch((error) => {
            console.error('[SW] Background sync registration failed:', error);
          });
      }
      break;
      
    case 'GET_STORED_DATA':
      getAllData().then((data) => {
        event.ports[0]?.postMessage({ data });
      });
      break;
      
    default:
      console.warn('[SW] Unknown message type:', event.data.type);
  }
});

// Background sync event handler
self.addEventListener('sync', (event: any) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      getAllData().then((data) => {
        console.log('[SW] Background sync - found', data.length, 'entries');
        storeData({
          type: 'sync_completed',
          entryCount: data.length,
        });
      })
    );
  }
});

// Initialize DB when SW activates
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated, initializing IndexedDB');
  event.waitUntil(initDB());
});

console.log('[SW] Background recording system initialized');