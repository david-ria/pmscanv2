import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import { AppProviders } from '@/components/AppProviders';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Import and initialize Sentry observability
import { initSentry } from '@/observability/sentry';

import App from './App.tsx';
import './index.css';

// Initialize Sentry (only in production with explicit opt-in)
initSentry();

// Global error handlers for production debugging
window.addEventListener('error', (event) => {
  console.error('🔴 Global error:', event.error || event.message);
  console.error('🔴 Error details:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🔴 Unhandled promise rejection:', event.reason);
  console.error('🔴 Promise:', event.promise);
});

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

// Service Worker registration handled by deferredInit

// Start non-essential work scheduling
if (import.meta.env.DEV) {
  // DEV: Initialize immediately to see SW in DevTools
  import('./lib/deferredInit').then(({ initNonEssentialFeatures }) => {
    initNonEssentialFeatures();
  });
} else {
  // PROD: Defer initialization
  scheduleNonEssentialWork();
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary
    onError={(error, errorInfo) => {
      console.error('🔴 Root Error Boundary caught error:', error);
      console.error('🔴 Component Stack:', errorInfo.componentStack);
    }}
  >
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AppProviders>
            <App />
          </AppProviders>
          <Toaster />
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);
