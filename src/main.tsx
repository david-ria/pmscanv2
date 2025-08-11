console.log('🔧 main.tsx starting...');

import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import App from './App.tsx';
import './index.css';

console.log('🔧 All imports loaded successfully');

// Create a simple loading fallback
const showLoadingFallback = () => {
  const root = document.getElementById('root');
  if (root) {
    console.log('🔧 Showing loading fallback...');
    root.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8f9fa; font-family: system-ui;">
        <div style="text-align: center; padding: 2rem;">
          <h1 style="color: #333; margin-bottom: 1rem; font-size: 2rem;">AirSentinels</h1>
          <p style="color: #666; margin-bottom: 1rem;">Initializing React application...</p>
          <div style="width: 40px; height: 40px; border: 3px solid #e0e0e0; border-top: 3px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; margin: 1rem auto;"></div>
          <p style="color: #999; font-size: 0.8rem; margin-top: 1rem; max-width: 300px;">Please wait while we load the application. If this takes more than 10 seconds, try refreshing the page.</p>
        </div>
      </div>
      <style>
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    `;
  }
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

console.log('🔧 QueryClient created');

// Initialize i18n
try {
  console.log('🔧 Loading i18n...');
  await import('./i18n/config');
  console.log('🔧 i18n loaded successfully');
} catch (error) {
  console.warn('⚠️ i18n failed to load:', error);
}

// Show loading state first
showLoadingFallback();

console.log('🔧 About to render React app...');

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  console.log('🔧 Root element found, creating React root...');
  const root = createRoot(rootElement);
  
  console.log('🔧 Rendering React app...');
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
  console.error('💥 Fatal error rendering React app:', error);
  
  // Final fallback with error message
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8f9fa; font-family: system-ui;">
        <div style="text-align: center; padding: 2rem; max-width: 500px;">
          <h1 style="color: #dc3545; margin-bottom: 1rem; font-size: 2rem;">Loading Error</h1>
          <p style="color: #666; margin-bottom: 1rem;">The application failed to start. This might be due to a network issue or browser compatibility.</p>
          <button 
            onclick="window.location.reload()" 
            style="background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 1rem;"
          >
            Refresh Page
          </button>
          <p style="color: #999; font-size: 0.8rem; margin-top: 1rem;">Error: ${String(error)}</p>
        </div>
      </div>
    `;
  }
}