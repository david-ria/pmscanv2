import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import App from './App.tsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
  },
});

// Defer non-critical initializations to idle time
const deferNonCriticalWork = () => {
  // Use requestIdleCallback to defer heavy work off main thread
  const scheduleWork = (work: () => void) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(work, { timeout: 2000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(work, 0);
    }
  };

  // Defer i18n initialization
  scheduleWork(() => {
    import('./i18n/config').catch(console.warn);
  });

  // Defer any analytics or monitoring setup
  scheduleWork(() => {
    // Future: Initialize analytics here
    console.debug('[PERF] Non-critical services initialized');
  });
};

// Schedule non-critical work for idle time
deferNonCriticalWork();

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
