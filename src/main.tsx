console.log('🔧 main.tsx loading...');

import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';

console.log('🔧 Imports loaded successfully');

// Simple fallback if React fails to load
const renderFallback = () => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8f9fa; font-family: system-ui;">
        <div style="text-align: center; padding: 2rem;">
          <h1 style="color: #333; margin-bottom: 1rem;">AirSentinels</h1>
          <p style="color: #666;">Loading application...</p>
          <div style="width: 40px; height: 40px; border: 3px solid #e0e0e0; border-top: 3px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; margin: 1rem auto;"></div>
        </div>
      </div>
      <style>
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    `;
  }
};

let App: any;
try {
  console.log('🔧 Loading App component...');
  App = (await import('./App.tsx')).default;
  console.log('🔧 App component loaded successfully');
} catch (error) {
  console.error('💥 Failed to load App component:', error);
  renderFallback();
  throw error;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
  },
});

console.log('🔧 QueryClient created');

// Initialize i18n immediately for proper app functionality
try {
  console.log('🔧 Loading i18n...');
  await import('./i18n/config');
  console.log('🔧 i18n loaded successfully');
} catch (error) {
  console.error('💥 Failed to load i18n:', error);
}

// Defer non-essential initialization until after critical rendering
const scheduleNonEssentialWork = () => {
  // Import and initialize non-critical features only when browser is idle
  if ('requestIdleCallback' in window) {
    requestIdleCallback(async () => {
      try {
        const { initNonEssentialFeatures } = await import('@/lib/deferredInit');
        initNonEssentialFeatures();
      } catch (error) {
        console.error('💥 Failed to load non-essential features:', error);
      }
    }, { timeout: 3000 });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(async () => {
      try {
        const { initNonEssentialFeatures } = await import('@/lib/deferredInit');
        initNonEssentialFeatures();
      } catch (error) {
        console.error('💥 Failed to load non-essential features:', error);
      }
    }, 100);
  }
};

// Start non-essential work scheduling
scheduleNonEssentialWork();

console.log('🔧 About to render React app...');

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  console.log('🔧 Root element found, creating React root...');
  const root = createRoot(rootElement);
  
  console.log('🔧 Rendering app...');
  root.render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <App />
          <Toaster />
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
  
  console.log('✅ React app rendered successfully!');
} catch (error) {
  console.error('💥 Failed to render React app:', error);
  renderFallback();
}
