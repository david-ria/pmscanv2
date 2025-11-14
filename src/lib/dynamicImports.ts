/**
 * Dynamic import utilities for code splitting heavy libraries
 * Reduces initial bundle size by loading dependencies only when needed
 */

// Cache for loaded modules to avoid re-importing
const moduleCache = new Map<string, any>();

// Track dynamic imports for bundle analysis
const trackImport = (moduleName: string) => {
  if (typeof window !== 'undefined') {
    if (!window.__DYNAMIC_IMPORTS__) {
      window.__DYNAMIC_IMPORTS__ = {};
    }
    window.__DYNAMIC_IMPORTS__[moduleName] = true;
  }
};

/**
 * Resilient dynamic import wrapper with error handling
 * Prevents console spam in Lovable preview environment
 */
const resilientImport = async <T>(
  importFn: () => Promise<T>,
  moduleName: string
): Promise<T | null> => {
  try {
    const module = await importFn();
    trackImport(moduleName);
    return module;
  } catch (error: any) {
    // Gracefully handle module loading errors (e.g., 404s in preview)
    if (import.meta.env.DEV) {
      console.debug(`[Dynamic Import] Failed to load ${moduleName}:`, error.message);
    }
    return null;
  }
};

/**
 * Mapbox GL dynamic import with CSS
 */
export const loadMapboxGL = async () => {
  if (moduleCache.has('mapbox-gl')) {
    return moduleCache.get('mapbox-gl');
  }

  console.debug('[PERF] Loading Mapbox GL dynamically...');
  
  const result = await resilientImport(
    async () => {
      await import('mapbox-gl/dist/mapbox-gl.css');
      const mapboxModule = await import('mapbox-gl');
      return mapboxModule.default;
    },
    'mapbox-gl'
  );
  
  if (result) {
    moduleCache.set('mapbox-gl', result);
    console.debug('[PERF] Mapbox GL and CSS loaded');
  }
  
  return result;
};

/**
 * Supabase client dynamic import - uses shared singleton
 */
export const loadSupabaseClient = async () => {
  if (moduleCache.has('supabase-client')) {
    return moduleCache.get('supabase-client');
  }

  console.debug('[PERF] Loading Supabase client dynamically...');
  
  const result = await resilientImport(
    async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      return { supabase };
    },
    'supabase'
  );
  
  if (result) {
    moduleCache.set('supabase-client', result);
    console.debug('[PERF] Supabase client loaded');
  }
  
  return result;
};

/**
 * Load Map and Data together when both are needed
 */
export const loadMapAndData = async () => {
  console.debug('[PERF] Loading Map & Data layers...');
  const [mapbox, { supabase }] = await Promise.all([
    loadMapboxGL(),
    loadSupabaseClient()
  ]);
  
  console.debug('[PERF] Map & Data layers loaded');
  return { mapbox, supabase };
};

/**
 * Chart library dynamic import (Recharts) - Individual components to reduce bundle
 */
export const loadChartLibrary = async () => {
  if (moduleCache.has('recharts')) {
    return moduleCache.get('recharts');
  }

  console.debug('[PERF] Loading charts library (optimized components)...');
  
  const result = await resilientImport(
    async () => {
      const [
        { LineChart, BarChart, PieChart, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer },
        { Cell }
      ] = await Promise.all([
        import('recharts'),
        import('recharts')
      ]);
      
      return {
        LineChart,
        BarChart, 
        PieChart,
        AreaChart,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip,
        Legend,
        ResponsiveContainer,
        Cell
      };
    },
    'recharts'
  );
  
  if (result) {
    moduleCache.set('recharts', result);
    console.debug('[PERF] Charts library loaded (optimized)');
  }
  
  return result;
};

/**
 * PDF export libraries dynamic import
 */
export const loadPDFLibrary = async () => {
  if (moduleCache.has('pdf-libs')) {
    return moduleCache.get('pdf-libs');
  }

  console.debug('[PERF] Loading PDF libraries...');
  
  const result = await resilientImport(
    async () => {
      const [jsPDF, html2canvas] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]);
      return { jsPDF: jsPDF.default, html2canvas: html2canvas.default };
    },
    'pdf'
  );
  
  if (result) {
    moduleCache.set('pdf-libs', result);
    console.debug('[PERF] PDF libraries loaded');
  }
  
  return result;
};

/**
 * TensorFlow dynamic import
 */
export const loadTensorFlow = async () => {
  if (moduleCache.has('tensorflow')) {
    return moduleCache.get('tensorflow');
  }

  console.debug('[PERF] Loading TensorFlow...');
  
  const result = await resilientImport(
    () => import('@tensorflow/tfjs'),
    'tensorflow'
  );
  
  if (result) {
    moduleCache.set('tensorflow', result);
    console.debug('[PERF] TensorFlow loaded');
  }
  
  return result;
};

/**
 * Date utilities dynamic import - Individual functions to reduce bundle
 */
export const loadDateUtils = async () => {
  if (moduleCache.has('date-fns')) {
    return moduleCache.get('date-fns');
  }

  console.debug('[PERF] Loading date utilities (individual functions)...');
  
  const result = await resilientImport(
    async () => {
      const [
        { format },
        { parseISO },
        { subDays },
        { startOfDay },
        { endOfDay },
        { isAfter },
        { isBefore },
        { differenceInHours },
        { differenceInMinutes }
      ] = await Promise.all([
        import('date-fns/format'),
        import('date-fns/parseISO'),
        import('date-fns/subDays'),
        import('date-fns/startOfDay'),
        import('date-fns/endOfDay'),
        import('date-fns/isAfter'),
        import('date-fns/isBefore'),
        import('date-fns/differenceInHours'),
        import('date-fns/differenceInMinutes')
      ]);
      
      return {
        format,
        parseISO,
        subDays,
        startOfDay,
        endOfDay,
        isAfter,
        isBefore,
        differenceInHours,
        differenceInMinutes
      };
    },
    'date-fns'
  );
  
  if (result) {
    moduleCache.set('date-fns', result);
    console.debug('[PERF] Date utilities loaded (optimized)');
  }
  
  return result;
};

/**
 * Bluetooth LE dynamic import
 */
export const loadBluetoothLE = async () => {
  if (moduleCache.has('bluetooth-le')) {
    return moduleCache.get('bluetooth-le');
  }

  console.debug('[PERF] Loading Bluetooth LE...');
  
  const result = await resilientImport(
    () => import('@capacitor-community/bluetooth-le'),
    'bluetooth-le'
  );
  
  if (result) {
    moduleCache.set('bluetooth-le', result);
    console.debug('[PERF] Bluetooth LE loaded');
  }
  
  return result;
};

/**
 * i18n dynamic load
 */
export const loadI18n = async () => {
  console.debug('[PERF] Loading i18n configuration...');
  await import('@/i18n/config');
  console.debug('[PERF] i18n loaded');
};

/**
 * Form validation dynamic import
 */
export const loadFormValidation = async () => {
  if (moduleCache.has('form-validation')) {
    return moduleCache.get('form-validation');
  }

  console.debug('[PERF] Loading form validation...');
  
  const result = await resilientImport(
    async () => {
      const [hookForm, zod] = await Promise.all([
        import('react-hook-form'),
        import('zod')
      ]);
      return { hookForm, zod };
    },
    'forms'
  );
  
  if (result) {
    moduleCache.set('form-validation', result);
    console.debug('[PERF] Form validation loaded');
  }
  
  return result;
};

/**
 * i18n utilities dynamic import - Individual functions
 */
export const loadI18nUtils = async () => {
  if (moduleCache.has('i18n-utils')) {
    return moduleCache.get('i18n-utils');
  }

  console.debug('[PERF] Loading i18n utilities...');
  const { useTranslation } = await import('react-i18next');
  
  const i18nUtils = { useTranslation };
  moduleCache.set('i18n-utils', i18nUtils);
  console.debug('[PERF] i18n utilities loaded');
  
  return i18nUtils;
};

/**
 * Animation libraries dynamic import - Load only when needed
 */
export const loadAnimations = async () => {
  if (moduleCache.has('animations')) {
    return moduleCache.get('animations');
  }

  console.debug('[PERF] Loading animation utilities...');
  // Only import specific animation utilities that might be needed
  const animationUtils = {
    // For future use when animation libraries are added
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window)
  };
  
  moduleCache.set('animations', animationUtils);
  console.debug('[PERF] Animation utilities loaded');
  
  return animationUtils;
};

/**
 * Utility to preload critical chunks during idle time
 */
export const preloadCriticalChunks = () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      console.debug('[PERF] Preloading critical chunks during idle time...');
      // Preload commonly used modules
      Promise.all([
        loadDateUtils(),
        loadI18nUtils()
      ]).then(() => {
        console.debug('[PERF] Critical chunks preloaded');
      });
    }, { timeout: 5000 });
  }
};

/**
 * Get bundle size information (for development)
 */
export const getBundleInfo = () => {
  const cacheInfo = Array.from(moduleCache.entries()).map(([key, value]) => ({
    module: key,
    loaded: !!value,
    size: JSON.stringify(value).length // Rough size estimate
  }));
  
  console.table(cacheInfo);
  return cacheInfo;
};