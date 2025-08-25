// Workbox types for service worker
declare global {
  interface ServiceWorkerGlobalScope {
    __WB_MANIFEST: Array<{
      url: string;
      revision?: string;
    }>;
  }
}

export {};