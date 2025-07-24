// Lazy load Mapbox CSS only when needed
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThresholdProvider } from '@/contexts/ThresholdContext';
import { AlertProvider } from '@/contexts/AlertContext';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import App from './App.tsx';
import './index.css';
import './i18n/config';

// Optimized QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Lazy load Mapbox CSS when needed
const loadMapboxCSS = () => {
  if (!document.querySelector('link[href*="mapbox-gl"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.13.0/mapbox-gl.css';
    document.head.appendChild(link);
  }
};

// Load Mapbox CSS on first user interaction or route change to map
if (typeof window !== 'undefined') {
  const events = ['click', 'scroll', 'keydown'];
  const loadOnce = () => {
    loadMapboxCSS();
    events.forEach(event => window.removeEventListener(event, loadOnce));
  };
  events.forEach(event => window.addEventListener(event, loadOnce, { once: true }));
}

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <ThresholdProvider>
          <AlertProvider>
            <ThemeProvider>
              <App />
              <Toaster />
            </ThemeProvider>
          </AlertProvider>
        </ThresholdProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);
