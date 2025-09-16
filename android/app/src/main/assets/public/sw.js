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
precacheAndRoute([{"revision":"784af780ada8f187193315d878e8e04b","url":"assets/index-BOVYw4lO.css"},{"revision":"0491f53b176f48f8045cd950fcc78722","url":"assets/js/activity-B8rwkEHL.js"},{"revision":"dfc040daa3ffac5da589999f12c0e6e5","url":"assets/js/AlertContext-CLzf7XqW.js"},{"revision":"4d4fb408d8d01e62e40a5964a37ccb9c","url":"assets/js/Analysis-BzNgsrkc.js"},{"revision":"cdd1b71941309e17f98880f7999ff436","url":"assets/js/AnalysisPageSkeleton-DPiDfJRB.js"},{"revision":"447c9f4c6e4d043dd7a4e3cd6b15f1d7","url":"assets/js/AppLayoutSkeleton-BF5lJuSC.js"},{"revision":"d39bd65d1781d6efe0f5ee6bfd26ee7f","url":"assets/js/arrow-left-3u0J-11_.js"},{"revision":"fa3f4d3d4633a5f0e92e8fbb6d9b49d3","url":"assets/js/Auth-CvPGQ4di.js"},{"revision":"57ae371ce01e4d5b5ef85c13c4d868b1","url":"assets/js/AutoContextDisplay-Ba7tQGL7.js"},{"revision":"e1ef6eb0d2e1efd9c426923cbc0aa43d","url":"assets/js/badge-D3qJDj1M.js"},{"revision":"0a4bcb2650ad8b90de53eed08e576a11","url":"assets/js/bell-qdBZ5gP3.js"},{"revision":"5ab3c9facabfb0c143c6673d20fd757f","url":"assets/js/bluetooth-BEoGU70i.js"},{"revision":"2d9106d349c86193ce978bb334f4dfb5","url":"assets/js/bluetooth-CRv2GwO8.js"},{"revision":"4731fdb45e8eabcf126db88f82de99ac","url":"assets/js/BottomNavigation-7qe9RlFN.js"},{"revision":"f775598060d19aee163bf2e9a28930ee","url":"assets/js/brain-BnPjMeLS.js"},{"revision":"f55c28706afb5c082cb1e89774d87771","url":"assets/js/calendar-p0zw62Sr.js"},{"revision":"4106a5e960d7cd6369b824abe9e6cd7f","url":"assets/js/card-CRF2Wp6a.js"},{"revision":"d348ca0484ba07867b835a9b270f86e9","url":"assets/js/carousel-BKpUePVD.js"},{"revision":"ddedd2da5bbea79b527b7bb4dc5e29b7","url":"assets/js/chart-column-BZUAHE40.js"},{"revision":"16bc810f1353291585ec296b3e2bdce0","url":"assets/js/charts-Do_EPC5m.js"},{"revision":"7b99b6f0b6e26edcc12663bf20bccce9","url":"assets/js/check-BbmLrf-d.js"},{"revision":"a8347f227090b6f133b08baad9939196","url":"assets/js/chevron-right-DkkaQXkL.js"},{"revision":"33108d1c8c43680ae2414a99543c05d7","url":"assets/js/circle-BxKWKjZR.js"},{"revision":"5f034020c5cc92e1f2d8d6bfe99fbde1","url":"assets/js/client-zGYq1VIw.js"},{"revision":"6652df27f03000a9eb4d5585d5e59285","url":"assets/js/clock-ipAbZE7G.js"},{"revision":"cd3a7b5a1cc0aa5fe5eb5a2dc04b7c83","url":"assets/js/ContextSelectors-BuR_LYaH.js"},{"revision":"c78965a30cde0321ffcb5b98a7e26fbf","url":"assets/js/CrashRecoveryInitializer-DJqsXaHq.js"},{"revision":"4811ed5e60b70d66c1b0a99f7cd819ca","url":"assets/js/crown-zbULqoOE.js"},{"revision":"cd7d37f29f419cb30f1ca371f0998612","url":"assets/js/CustomAlerts-DuFJz56s.js"},{"revision":"e8268eb2958e6c630b076f59b9923b29","url":"assets/js/CustomThresholds-Bg0ZDn5j.js"},{"revision":"c3d8e487f5b35ae9efd7d22899c8e2be","url":"assets/js/DataLogger-KGSUJsGo.js"},{"revision":"e989b8a2c5b07a496a53f71152fc36bf","url":"assets/js/date-CHE04W6Q.js"},{"revision":"d66e6ac6626d9a071997ae2445255db2","url":"assets/js/DateFilter-D9eU-HB0.js"},{"revision":"b1fc728bf9a146591e4c36f070ced12d","url":"assets/js/deferredInit-BxpPL51b.js"},{"revision":"e319d550a197efc61315d224efc22fa2","url":"assets/js/dialog-DfKWiEIF.js"},{"revision":"8506c8c5a7288494b9b0d6bfeb08c877","url":"assets/js/download-DC3Z7BQM.js"},{"revision":"fd86593d80cc7005818886d324f2bd0d","url":"assets/js/dropdown-menu-BEnxxNd8.js"},{"revision":"7fa49622ac1a177dae9de8b2e703f935","url":"assets/js/eventTypes-ynSrOkd7.js"},{"revision":"6a9f8be79db150eecfed527bead0f385","url":"assets/js/external-link-06QHuptX.js"},{"revision":"0cc45aa403d00c676d5f5c2d285637cf","url":"assets/js/file-x-Cfc0Kpmj.js"},{"revision":"6f7d0b011431bd78d739e1934e478da3","url":"assets/js/fr-CdMURzWB.js"},{"revision":"02379d5292daac62119c882ee7a92963","url":"assets/js/GlobalDataCollector-DdIp_XF1.js"},{"revision":"c5fb9980bd2ff9546687afb47fdb8ae2","url":"assets/js/groupConfigs-C_MEEc6R.js"},{"revision":"89604c48b6633fbba8b08f0dc4461123","url":"assets/js/GroupDetails-CJKwJ6-C.js"},{"revision":"b1c022e5d7298deb4add29b38ce7ae8b","url":"assets/js/Groups-BLNNmz9_.js"},{"revision":"15665edbcd9aba1271b4b8a8f8e6fe26","url":"assets/js/GroupsPageSkeleton-DJT4IbmB.js"},{"revision":"c03a60ddd6b34f2c8bbadf28b3608387","url":"assets/js/Header-DGUuXdrS.js"},{"revision":"df3ae119d4012e19bbddc09dcab3241c","url":"assets/js/History-DYZeKAoF.js"},{"revision":"96fa75378b5ef71c9ffc6c50dc9fce00","url":"assets/js/HistoryPageSkeleton-DE1aMLA6.js"},{"revision":"b209060117485cd3d6fdf624d607221e","url":"assets/js/i18n-DZz6YkIP.js"},{"revision":"55be1841e9802dfc29c93dec4f1ac113","url":"assets/js/index-DnKT6hDb.js"},{"revision":"4e8cf8c8b092f50dc2a71ef7524155ce","url":"assets/js/index.es-CscEBKac.js"},{"revision":"546f623ccaa3b73031c297f032f6eb6e","url":"assets/js/input-CGNY8--s.js"},{"revision":"fead11f748a3f7ffd52d530a37433312","url":"assets/js/InviteUserDialog-ItlMVMUP.js"},{"revision":"d32e9cc256a2d1e42a262c05affecc96","url":"assets/js/label-Dli8bNIx.js"},{"revision":"45b90c4bf8014b5843cd4c20699e8a67","url":"assets/js/loader-circle-CMvZ_kLu.js"},{"revision":"d2f2bdab8988ccbe823e9f2c66126141","url":"assets/js/lock-Ck1dDsWW.js"},{"revision":"63ab995513ebd6fad5406f0a37753c6f","url":"assets/js/mail-R-xk0620.js"},{"revision":"7c5165661c370c33b6b3b1498e30275d","url":"assets/js/mainThreadOptimizer-CQ0liOHA.js"},{"revision":"e26b667055567997d2dd6a10851ee375","url":"assets/js/mapbox-Dt3wmk7w.js"},{"revision":"4c1650e4f29599a75d6d3e6f156c9cd6","url":"assets/js/MapboxMapControls-DfUXW-Eh.js"},{"revision":"dd73a04dbf7de07a849cb3ba88560f4a","url":"assets/js/MapboxMapCore-DwX_lmbs.js"},{"revision":"c91324a9d071f0dd6a97931bf21db6d1","url":"assets/js/mapEventHandlers-CHIiS9qu.js"},{"revision":"a2c5dd786f77db0651cb7f310bda637a","url":"assets/js/MapGraphToggle-C7STPTe7.js"},{"revision":"5cd362eaef6234a7fe88ac31ba2c29f0","url":"assets/js/mapInitializer-BPty4L8F.js"},{"revision":"bfbcef630fc82f03b98462608995f1d7","url":"assets/js/mapLayers-C3VFlJvJ.js"},{"revision":"b47984160d8e0f3d1bc32bf71ebb3c7f","url":"assets/js/mapMarker-Dhfw_6YF.js"},{"revision":"cfc85897d00334b6685164651a1fc097","url":"assets/js/mapStyles-CsZyDteM.js"},{"revision":"f3dff2fa84cb60de99d9776bcef504ff","url":"assets/js/mapStyleToggle-97Afa0f9.js"},{"revision":"8328e6a23f5992395313742cd0ec9156","url":"assets/js/MenuPageHeader-CcnmbX7d.js"},{"revision":"4926f3537b1c2a0c7e7f3ac24d7f2160","url":"assets/js/NotFound-DnHQrc3B.js"},{"revision":"f7a31bb05600b2b68671951b0352a672","url":"assets/js/notifications-6vUXhpBr.js"},{"revision":"670bae2fd6d4fcc6863381b1897f13b5","url":"assets/js/pdf-RpjoWNzX.js"},{"revision":"834c7fb922af580bdd9df78765cbf0b5","url":"assets/js/PMLineGraph-DB5Ox9c8.js"},{"revision":"8c7f76a26b8174bc9958e262fd2aaa92","url":"assets/js/popover-C65wazzN.js"},{"revision":"ba4958c11e25a7a7ff8373922e447bc4","url":"assets/js/Profile-DpnqinQh.js"},{"revision":"534fa94345e810229076a9b54dbd733c","url":"assets/js/ProfilePageSkeleton-Bpu6t7YT.js"},{"revision":"63786d1b39a20022f785a76dd46526f3","url":"assets/js/purify.es-CQJ0hv7W.js"},{"revision":"ddcdc842be511566733ce487eb1f29d8","url":"assets/js/query-BewfWFH7.js"},{"revision":"a90beabe47056184e73146b7b0324632","url":"assets/js/RealTime-CuVN0XnM.js"},{"revision":"c19c9d8ad259e79a6ff9f55ea23ad280","url":"assets/js/rotate-ccw-oD7EDUkY.js"},{"revision":"1b6ad38f531bb35f89e7728d07b492c3","url":"assets/js/router-D6wdMmGF.js"},{"revision":"4a084beb61764640858066a5162e59e2","url":"assets/js/satellite-BoAS3NdR.js"},{"revision":"4b818f605222912c852a91b1c01a8c8d","url":"assets/js/save-DuXH8Fwl.js"},{"revision":"07e102cbfe3c0a6e8e00bf51461d0c9b","url":"assets/js/select-BZrd-goH.js"},{"revision":"e485058a58379ba49f819d5d3512dc16","url":"assets/js/separator-auhcLEBW.js"},{"revision":"80a8685f447af226814019345863bf07","url":"assets/js/skeleton-D29iA6Gg.js"},{"revision":"55a165a85e306152dce2f68849458568","url":"assets/js/SkeletonScreens-DpjwkiSQ.js"},{"revision":"6235d00144bfa32069c3f483ebcee845","url":"assets/js/speedCalculator-DnWD_VUK.js"},{"revision":"c9e997b56a19db5b13222f7fe4b0ebce","url":"assets/js/supabase--OITQzG1.js"},{"revision":"b201e1831ed3a186c10664b632c3772c","url":"assets/js/supabaseSafeWrapper-C24d6oy5.js"},{"revision":"dcd7440c01ef73693aa27a2d0255387a","url":"assets/js/switch-DiHL1fOt.js"},{"revision":"900e7db3122086c47f2fe726d2ab3b61","url":"assets/js/tabs-D4ABolrV.js"},{"revision":"2cbfcdd611bbca9d36e835ba83b7f5f9","url":"assets/js/tensorflow-BraJP5VG.js"},{"revision":"853431fc179c1ebdfeaaa7f221cb4344","url":"assets/js/theme-D-6-9UvQ.js"},{"revision":"b43e08ef5d58d548d847150ce972891c","url":"assets/js/ThresholdContext-1SyiABzf.js"},{"revision":"2210ad6ea8ec2acfd6f4ee3db7dd7912","url":"assets/js/timeFormat-CCn9v1Tp.js"},{"revision":"badab114a257ad971b4c62cf815e18fe","url":"assets/js/trash-2-fnkO6k_f.js"},{"revision":"6bc625dc17367a7cc21a771327b2719f","url":"assets/js/ui-advanced-6HbTI6G8.js"},{"revision":"72230b79cab8bc5cbba26686a87fd9a1","url":"assets/js/ui-core-CibF-ClQ.js"},{"revision":"7404e06e0105bf162a029055f13e5709","url":"assets/js/ui-forms-BvHfx7SG.js"},{"revision":"ecfc883b3fc10e4c876a1af0dc5acb61","url":"assets/js/UnifiedDataProvider-D_wn4Ile.js"},{"revision":"4d7460dd9277b537b5d9223c686514ef","url":"assets/js/useAutoContext-RU6mHgIo.js"},{"revision":"8c1aec09237eb74c98dab75c9f92017a","url":"assets/js/useDialog-D4PBCj81.js"},{"revision":"6e600e00a7e65941b621298d9bc9b223","url":"assets/js/useEvents-B2RSjdE6.js"},{"revision":"800f96692640479fa0a1f0b09349f7fa","url":"assets/js/useGroups-DlFUXECJ.js"},{"revision":"ab19a9b1a7dc23bd74d911a70a74716e","url":"assets/js/useGroupSettings-DQBWUHal.js"},{"revision":"7bc47b02ff11e443475c496f1fe2ad4f","url":"assets/js/useLocationEnrichmentSettings-CHsjhA43.js"},{"revision":"85d88231f586c0631fec91203e302cdc","url":"assets/js/useMissionSaver-CXd3xg0u.js"},{"revision":"5b78c2f43cba03d7d35205866fcb6aa1","url":"assets/js/user-BOWvM0oD.js"},{"revision":"18a7d567a2aef09e68cb9f3994cd87be","url":"assets/js/user-plus-BWbi5Krx.js"},{"revision":"71823295933e91fc50de5c85bdc4d213","url":"assets/js/users-wub0dhV2.js"},{"revision":"9b5608b3d2aba3cb05f61f8044a2bd4b","url":"assets/js/useSubscription-DJEgHQrc.js"},{"revision":"87526184a6b92e6afb1a1783b94a5911","url":"assets/js/useUserRole-B8Vd-TTd.js"},{"revision":"ce2e41beb4af3a6ef71dff68ecb3cd4c","url":"assets/js/useWeatherData-Bov5wL1Q.js"},{"revision":"1e8d0eebd9187a261c087554228c94cd","url":"assets/js/utils-EL5wpLGY.js"},{"revision":"09dae121d7029d73fd0d5f212d317540","url":"assets/js/vendor-CRCfYjC_.js"},{"revision":"6c3cf816314d56e1745581013a8ba28b","url":"assets/js/web-DN8OAU-f.js"},{"revision":"ffd0e43f847f7cefb527a4d08d7f003d","url":"assets/js/web-Q3wcRYyS.js"},{"revision":"0e6c8976e4fa05b54c8f32ef348519af","url":"assets/js/wifi-off-flOeYF_3.js"},{"revision":"d60138448ddfe6b549524d11f192875e","url":"assets/js/workbox-window.prod.es5-B9K5rw8f.js"},{"revision":"41ccc3a2f42f6bba041daee97ead70df","url":"assets/mapbox-gl-Bh_1FTD-.css"},{"revision":"7c2158fb4283c2e486bf13bf9cd1c858","url":"data-processor.js"},{"revision":"566e64364d6957715dc11845f4800700","url":"favicon.ico"},{"revision":"f8dd451e469f5ce4f2e49a2bde5bd088","url":"health.json"},{"revision":"e5507444ee687287a6487df50aa48a7d","url":"icons/icon-192.png"},{"revision":"2fc7cc8c1085d10ca7007033aba51695","url":"icons/icon-512.png"},{"revision":"967bf6ff27ce19abfdcd858513b4d3ed","url":"index.html"},{"revision":"53cdc1ce29dd412ee77969e46c94131c","url":"lovable-uploads/83ccf48a-d0be-4ac1-9039-4c4a8295958c.png"},{"revision":"9b182b0957070e93fd26cfa67428658e","url":"offline.html"},{"revision":"35707bd9960ba5281c72af927b79291f","url":"placeholder.svg"},{"revision":"d79e1f0a57d2edb303044eb517681a16","url":"static-content-handler.js"},{"revision":"5e6e4b63cb10cc8e2b8ea2b8486d7b28","url":"manifest.webmanifest"}]);
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