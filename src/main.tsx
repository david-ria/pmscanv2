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

// Initialize i18n asynchronously to reduce TBT
// i18n will be loaded dynamically when needed

// Defer non-essential initialization until after critical rendering
const scheduleNonEssentialWork = () => {
  // Import and initialize non-critical features only when browser is idle
  if ('requestIdleCallback' in window) {
    requestIdleCallback(async () => {
      const [
        { initNonEssentialFeatures },
        { initI18nDeferred }
      ] = await Promise.all([
        import('@/lib/deferredInit'),
        import('@/lib/i18nLoader')
      ]);
      
      // Initialize i18n first (high priority)
      initI18nDeferred();
      
      // Then other features
      initNonEssentialFeatures();
    }, { timeout: 1000 });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(async () => {
      const [
        { initNonEssentialFeatures },
        { initI18nDeferred }
      ] = await Promise.all([
        import('@/lib/deferredInit'),
        import('@/lib/i18nLoader')
      ]);
      
      initI18nDeferred();
      initNonEssentialFeatures();
    }, 16); // One frame delay
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
