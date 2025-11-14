/**
 * Environment detection utilities for conditionally enabling features
 */

/**
 * Detects if the app is running inside Lovable preview iframe
 */
export const isLovablePreview = (): boolean => {
  try {
    return (
      window.location.hostname.includes('lovable.app') ||
      window.location.hostname.includes('lovableproject.com') ||
      window.self !== window.top // Running in iframe
    );
  } catch {
    return false;
  }
};

/**
 * Detects if the app is in development mode
 */
export const isDevelopment = (): boolean => {
  return import.meta.env.DEV;
};

/**
 * Detects if the app is in production mode
 */
export const isProduction = (): boolean => {
  return import.meta.env.PROD && !isLovablePreview();
};

/**
 * Should external services be initialized?
 * Skips in Lovable preview to avoid CSP violations
 */
export const shouldInitExternalServices = (): boolean => {
  return !isLovablePreview();
};
