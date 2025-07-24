// Service Worker for background data collection
const CACHE_NAME = 'pmscan-v1';
const DATA_STORE = 'pmscan-background-data';

// Install event
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  // Don't auto-activate to prevent conflicts
  // self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  // Only claim clients if we're in the right context
  if (self.location.hostname !== 'localhost' && !self.location.hostname.includes('lovableproject.com')) {
    event.waitUntil(self.clients.claim());
  }
});

// Background sync for data collection
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);

  if (event.tag === 'background-data-collection') {
    event.waitUntil(handleBackgroundDataCollection());
  }

  if (event.tag === 'sync-pending-missions') {
    event.waitUntil(syncPendingMissions());
  }
});

// Handle background data collection
async function handleBackgroundDataCollection() {
  console.log('📊 Handling background data collection...');

  try {
    // Notify main app that background sync is running
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_RUNNING',
        timestamp: Date.now(),
      });
    });

    // Check if we have any pending data to process
    const db = await openDB();
    const pendingData = await getPendingBackgroundData(db);

    if (pendingData.length > 0) {
      console.log(`📋 Processing ${pendingData.length} pending data points`);

      // Process pending data
      for (const dataPoint of pendingData) {
        await processDataPoint(dataPoint);
      }

      // Clear processed data
      await clearProcessedData(db);

      // Notify completion
      clients.forEach((client) => {
        client.postMessage({
          type: 'BACKGROUND_SYNC_COMPLETE',
          processedCount: pendingData.length,
          timestamp: Date.now(),
        });
      });
    }
  } catch (error) {
    console.error('❌ Background sync error:', error);

    // Notify error
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_ERROR',
        error: error.message,
        timestamp: Date.now(),
      });
    });
  }
}

// Sync pending missions to database
async function syncPendingMissions() {
  console.log('🔄 Syncing pending missions...');

  try {
    // Send message to main app to handle sync
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_PENDING_MISSIONS',
        timestamp: Date.now(),
      });
    });
  } catch (error) {
    console.error('❌ Mission sync error:', error);
  }
}

// IndexedDB helpers
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATA_STORE, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create stores if they don't exist
      if (!db.objectStoreNames.contains('backgroundData')) {
        const store = db.createObjectStore('backgroundData', {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('processed', 'processed');
      }
    };
  });
}

async function getPendingBackgroundData(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['backgroundData'], 'readonly');
    const store = transaction.objectStore('backgroundData');
    const index = store.index('processed');
    const request = index.getAll(false); // Get unprocessed data

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function processDataPoint(dataPoint) {
  // In a real implementation, this would process the data
  // For now, we just mark it as processed
  console.log('🎯 Processing data point:', dataPoint);
  return Promise.resolve();
}

async function clearProcessedData(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['backgroundData'], 'readwrite');
    const store = transaction.objectStore('backgroundData');
    const index = store.index('processed');
    const request = index.getAll(false);

    request.onsuccess = () => {
      const dataToUpdate = request.result;
      const updatePromises = dataToUpdate.map((item) => {
        item.processed = true;
        return new Promise((res, rej) => {
          const updateRequest = store.put(item);
          updateRequest.onerror = () => rej(updateRequest.error);
          updateRequest.onsuccess = () => res();
        });
      });

      Promise.all(updatePromises)
        .then(() => resolve())
        .catch(reject);
    };

    request.onerror = () => reject(request.error);
  });
}

// Handle messages from main app
self.addEventListener('message', (event) => {
  console.log('📨 Service Worker received message:', event.data);

  if (event.data.type === 'STORE_BACKGROUND_DATA') {
    storeBackgroundData(event.data.payload);
  }

  if (event.data.type === 'SCHEDULE_BACKGROUND_SYNC') {
    scheduleBackgroundSync();
  }
});

// Store data for background processing
async function storeBackgroundData(data) {
  try {
    const db = await openDB();
    const transaction = db.transaction(['backgroundData'], 'readwrite');
    const store = transaction.objectStore('backgroundData');

    const dataPoint = {
      ...data,
      timestamp: Date.now(),
      processed: false,
    };

    await new Promise((resolve, reject) => {
      const request = store.add(dataPoint);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });

    console.log('💾 Stored background data point');
  } catch (error) {
    console.error('❌ Error storing background data:', error);
  }
}

// Schedule background sync
function scheduleBackgroundSync() {
  if (
    'serviceWorker' in navigator &&
    'sync' in window.ServiceWorkerRegistration.prototype
  ) {
    navigator.serviceWorker.ready
      .then((registration) => {
        return registration.sync.register('background-data-collection');
      })
      .catch((error) => {
        console.error('❌ Background sync registration failed:', error);
      });
  }
}

// Push notifications for background alerts
self.addEventListener('push', (event) => {
  console.log('🔔 Push notification received');

  const options = {
    body: 'PMScan background recording has stopped. Please check the app.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/favicon.ico',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification('PMScan Background Alert', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked');

  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(self.clients.openWindow('/'));
  }
});
