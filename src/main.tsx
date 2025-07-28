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

// Initialize i18n immediately for proper app functionality
import './i18n/config';

// Load non-critical CSS asynchronously after initial paint
const loadNonCriticalCSS = () => {
  const link = document.createElement('link') as HTMLLinkElement;
  link.rel = 'stylesheet';
  link.href = '/src/styles/non-critical.css';
  link.media = 'print';
  link.onload = function() {
    (this as HTMLLinkElement).media = 'all';
  };
  document.head.appendChild(link);
};

// Defer non-essential initialization until after critical rendering
const scheduleNonEssentialWork = () => {
  // Load non-critical CSS immediately after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNonCriticalCSS);
  } else {
    loadNonCriticalCSS();
  }
  
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
