import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeProvider';

import App from './App.tsx';
import './index.css';


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

// Start non-essential work scheduling
scheduleNonEssentialWork();

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </BrowserRouter>
);
