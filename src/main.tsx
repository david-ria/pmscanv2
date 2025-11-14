import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import { AppProviders } from '@/components/AppProviders';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Import utilities
import { shouldInitExternalServices } from '@/utils/environmentDetection';
import { initGlobalErrorHandler } from '@/utils/globalErrorHandler';
import { initSentry } from '@/observability/sentry';

import App from './App.tsx';
import './index.css';
import { PreviewModeIndicator } from '@/components/PreviewModeIndicator';

// Initialize global error handler first to catch and filter preview errors
initGlobalErrorHandler();

// Initialize Sentry only in production (skip in Lovable preview to avoid CSP errors)
if (shouldInitExternalServices()) {
  initSentry();
}

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
            <PreviewModeIndicator />
          </AppProviders>
          <Toaster />
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);
