/**
 * Dynamic import utilities for code splitting heavy libraries
 */

// Mapbox GL dynamic import
export const loadMapboxGL = async () => {
  const [mapboxgl, mapboxCSS] = await Promise.all([
    import('mapbox-gl'),
    import('mapbox-gl/dist/mapbox-gl.css')
  ]);
  return mapboxgl.default;
};

// Supabase client dynamic import
export const loadSupabaseClient = async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const { supabase } = await import('@/integrations/supabase/client');
  return { createClient, supabase };
};

// Chart library dynamic import
export const loadChartLibrary = async () => {
  const recharts = await import('recharts');
  return recharts;
};

// PDF export dynamic import
export const loadPDFLibrary = async () => {
  const [jsPDF, html2canvas] = await Promise.all([
    import('jspdf'),
    import('html2canvas')
  ]);
  return { jsPDF: jsPDF.default, html2canvas: html2canvas.default };
};

// TensorFlow dynamic import
export const loadTensorFlow = async () => {
  const tf = await import('@tensorflow/tfjs');
  return tf;
};

// Date utilities dynamic import
export const loadDateUtils = async () => {
  const dateFns = await import('date-fns');
  return dateFns;
};

// Bluetooth LE dynamic import
export const loadBluetoothLE = async () => {
  const bluetoothLE = await import('@capacitor-community/bluetooth-le');
  return bluetoothLE;
};

// i18n dynamic load
export const loadI18n = async () => {
  await import('@/i18n/config');
};

// Form validation dynamic import
export const loadFormValidation = async () => {
  const [hookForm, zod] = await Promise.all([
    import('react-hook-form'),
    import('zod')
  ]);
  return { hookForm, zod };
};