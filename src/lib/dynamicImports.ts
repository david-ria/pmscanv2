/**
 * Dynamic import utilities for code splitting heavy libraries
 * Reduces initial bundle size by loading dependencies only when needed
 */

// Cache for loaded modules to avoid re-importing
const moduleCache = new Map<string, any>();

/**
 * Mapbox GL dynamic import with CSS
 */
export const loadMapboxGL = async () => {
  if (moduleCache.has('mapbox-gl')) {
    return moduleCache.get('mapbox-gl');
  }

  console.debug('[PERF] Loading Mapbox GL dynamically...');
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
 * Chart library dynamic import (Recharts)
 */
export const loadChartLibrary = async () => {
  if (moduleCache.has('recharts')) {
    return moduleCache.get('recharts');
  }

  console.debug('[PERF] Loading charts library...');
  const recharts = await import('recharts');
  moduleCache.set('recharts', recharts);
  console.debug('[PERF] Charts library loaded');
  
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
 * Date utilities dynamic import
 */
export const loadDateUtils = async () => {
  if (moduleCache.has('date-fns')) {
    return moduleCache.get('date-fns');
  }

  console.debug('[PERF] Loading date utilities...');
  const dateFns = await import('date-fns');
  moduleCache.set('date-fns', dateFns);
  console.debug('[PERF] Date utilities loaded');
  
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