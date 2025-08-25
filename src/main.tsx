import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';

// Import and initialize Sentry observability
import { initSentry } from '@/observability/sentry';

import App from './App.tsx';
import './index.css';

// Initialize Sentry (only in production with explicit opt-in)
initSentry();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
  },
});

// Initialize i18n immediately for proper app functionality
import './i18n/config';

// Defer non-essential initialization until after critical rendering
const scheduleNonEssentialWork = () => {
  // Import and initialize non-critical features only when browser is idle
  if ('requestIdleCallback' in window) {
    requestIdleCallback(async () => {
      const { initNonEssentialFeatures } = await import('@/lib/deferredInit');
      initNonEssentialFeatures();
    }, { timeout: 3000 });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(async () => {
      const { initNonEssentialFeatures } = await import('@/lib/deferredInit');
      initNonEssentialFeatures();
    }, 100);
  }
};

// Register Workbox service worker with better lifecycle management
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const { Workbox } = await import('workbox-window');
      const wb = new Workbox('/sw.js');
      
      wb.addEventListener('activated', () => {
        console.debug('[PWA] Workbox Service Worker activated');
      });
      
      wb.addEventListener('waiting', () => {
        console.debug('[PWA] New Service Worker waiting, refresh to update');
      });
      
      await wb.register();
    } catch (error) {
      console.error('[PWA] Workbox Service Worker registration failed:', error);
    }
  });
}

// Start non-essential work scheduling
scheduleNonEssentialWork();

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ThemeProvider>
        <App />
        <Toaster />
      </ThemeProvider>
    </BrowserRouter>
  </QueryClientProvider>
);
