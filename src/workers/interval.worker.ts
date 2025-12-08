/**
 * Web Worker for reliable background timing
 * Ensures consistent recording intervals even when main thread is blocked
 * or the app is in background on mobile devices
 */

let intervalId: ReturnType<typeof setInterval> | null = null;

self.onmessage = (event: MessageEvent<{ type: 'START' | 'STOP'; interval?: number }>) => {
  const { type, interval } = event.data;

  switch (type) {
    case 'START':
      // Clear any existing interval
      if (intervalId !== null) {
        clearInterval(intervalId);
      }

      // Default to 10 seconds if no interval provided
      const ms = interval ?? 10000;
      
      // Send initial tick immediately
      self.postMessage({ type: 'TICK' });
      
      // Start interval
      intervalId = setInterval(() => {
        self.postMessage({ type: 'TICK' });
      }, ms);
      break;

    case 'STOP':
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      break;
  }
};

// Export empty object to make this a module
export {};
