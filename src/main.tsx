import 'mapbox-gl/dist/mapbox-gl.css';
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
  },
});

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
