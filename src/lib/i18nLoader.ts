// Optimized i18n loader to reduce main thread blocking
import { deferredInit } from '@/lib/deferredInit';

let i18nPromise: Promise<any> | null = null;
let isInitialized = false;

/**
 * Load i18n configuration asynchronously
 */
export async function loadI18n(): Promise<any> {
  if (isInitialized) {
    return;
  }

  if (i18nPromise) {
    return i18nPromise;
  }

  i18nPromise = (async () => {
    try {
      console.debug('[PERF] 🌐 Loading i18n configuration...');
      
      // Dynamic import to reduce initial bundle size
      const i18nModule = await import('@/i18n/config');
      
      isInitialized = true;
      console.debug('[PERF] ✅ i18n configuration loaded');
      
      return i18nModule.default;
    } catch (error) {
      console.error('[PERF] ❌ Failed to load i18n:', error);
      throw error;
    }
  })();

  return i18nPromise;
}

/**
 * Initialize i18n with deferred loading
 */
export function initI18nDeferred() {
  deferredInit.addTask({
    name: 'i18n-config',
    priority: 'high',
    task: loadI18n,
    timeout: 1000
  });
}

/**
 * Get translation function with lazy loading
 */
export async function getTranslation() {
  await loadI18n();
  const { useTranslation } = await import('react-i18next');
  return useTranslation;
}

/**
 * Ensure i18n is loaded before using translations
 */
export async function ensureI18nLoaded() {
  if (!isInitialized) {
    await loadI18n();
  }
}