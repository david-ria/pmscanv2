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
 * Mapbox GL dynamic import with CSS
 */
export const loadMapboxGL = async () => {
  if (moduleCache.has('mapbox-gl')) {
    return moduleCache.get('mapbox-gl');
  }

  console.debug('[PERF] Loading Mapbox GL dynamically...');
  trackImport('mapbox-gl');
  const [mapboxgl] = await Promise.all([
    import('mapbox-gl'),
    import('mapbox-gl/dist/mapbox-gl.css') // Load CSS alongside JS
  ]);
  
  const mapbox = mapboxgl.default;
  moduleCache.set('mapbox-gl', mapbox);
  console.debug('[PERF] Mapbox GL loaded');
  
  return mapbox;
};

/**
 * Supabase client dynamic import
 */
export const loadSupabaseClient = async () => {
  if (moduleCache.has('supabase-client')) {
    return moduleCache.get('supabase-client');
  }

  console.debug('[PERF] Loading Supabase client dynamically...');
  trackImport('supabase');
  const { createClient } = await import('@supabase/supabase-js');

  const SUPABASE_URL = "https://shydpfwuvnlzdzbubmgb.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoeWRwZnd1dm5semR6YnVibWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NzM1MjcsImV4cCI6MjA2NzU0OTUyN30.l_PAPBy1hlb4J-amKx7qPJ1lPIFseA9GznwL6CcyaQQ";

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  });

  const client = { createClient, supabase };
  moduleCache.set('supabase-client', client);
  console.debug('[PERF] Supabase client loaded');
  
  return client;
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
  trackImport('recharts');
  
  // Import only the specific components we need instead of the entire library
  const [
    { LineChart, BarChart, PieChart, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer },
    { Cell }
  ] = await Promise.all([
    import('recharts'),
    import('recharts')
  ]);
  
  const recharts = {
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
  
  moduleCache.set('recharts', recharts);
  console.debug('[PERF] Charts library loaded (optimized)');
  
  return recharts;
};

/**
 * PDF export libraries dynamic import
 */
export const loadPDFLibrary = async () => {
  if (moduleCache.has('pdf-libs')) {
    return moduleCache.get('pdf-libs');
  }

  console.debug('[PERF] Loading PDF libraries...');
  const [jsPDF, html2canvas] = await Promise.all([
    import('jspdf'),
    import('html2canvas')
  ]);
  
  const pdfLibs = { jsPDF: jsPDF.default, html2canvas: html2canvas.default };
  moduleCache.set('pdf-libs', pdfLibs);
  console.debug('[PERF] PDF libraries loaded');
  
  return pdfLibs;
};

/**
 * TensorFlow dynamic import
 */
export const loadTensorFlow = async () => {
  if (moduleCache.has('tensorflow')) {
    return moduleCache.get('tensorflow');
  }

  console.debug('[PERF] Loading TensorFlow...');
  const tf = await import('@tensorflow/tfjs');
  moduleCache.set('tensorflow', tf);
  console.debug('[PERF] TensorFlow loaded');
  
  return tf;
};

/**
 * Date utilities dynamic import - Individual functions to reduce bundle
 */
export const loadDateUtils = async () => {
  if (moduleCache.has('date-fns')) {
    return moduleCache.get('date-fns');
  }

  console.debug('[PERF] Loading date utilities (individual functions)...');
  
  // Import only the specific date-fns functions we need
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
  
  const dateFns = {
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
  
  moduleCache.set('date-fns', dateFns);
  console.debug('[PERF] Date utilities loaded (optimized)');
  
  return dateFns;
};

/**
 * Bluetooth LE dynamic import
 */
export const loadBluetoothLE = async () => {
  if (moduleCache.has('bluetooth-le')) {
    return moduleCache.get('bluetooth-le');
  }

  console.debug('[PERF] Loading Bluetooth LE...');
  const bluetoothLE = await import('@capacitor-community/bluetooth-le');
  moduleCache.set('bluetooth-le', bluetoothLE);
  console.debug('[PERF] Bluetooth LE loaded');
  
  return bluetoothLE;
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
  const [hookForm, zod] = await Promise.all([
    import('react-hook-form'),
    import('zod')
  ]);
  
  const validation = { hookForm, zod };
  moduleCache.set('form-validation', validation);
  console.debug('[PERF] Form validation loaded');
  
  return validation;
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