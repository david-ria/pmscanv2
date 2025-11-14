/**
 * Global error handler to filter out CSP and network-related errors in preview environments
 */

import { isLovablePreview } from './environmentDetection';

const CSP_ERROR_PATTERNS = [
  'Content Security Policy',
  'CSP',
  'blocked by CSP',
  'net::ERR_BLOCKED_BY_CLIENT',
];

const NETWORK_ERROR_PATTERNS = [
  'Failed to fetch',
  'NetworkError',
  'net::ERR_',
  'Load failed',
];

const IGNORED_MODULES = [
  'dev-sw/runtime',
  '@radix-ui/react-dialog',
];

/**
 * Checks if an error should be filtered out in preview environment
 */
const shouldFilterError = (error: any): boolean => {
  if (!isLovablePreview()) {
    return false; // Don't filter in production
  }

  const errorString = error?.toString?.() || error?.message || '';
  const stack = error?.stack || '';
  const combined = `${errorString} ${stack}`;

  // Filter CSP violations
  if (CSP_ERROR_PATTERNS.some(pattern => combined.includes(pattern))) {
    return true;
  }

  // Filter network errors
  if (NETWORK_ERROR_PATTERNS.some(pattern => combined.includes(pattern))) {
    return true;
  }

  // Filter known module loading issues in preview
  if (IGNORED_MODULES.some(module => combined.includes(module))) {
    return true;
  }

  return false;
};

/**
 * Initialize global error handlers
 */
export const initGlobalErrorHandler = () => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (shouldFilterError(event.reason)) {
      event.preventDefault(); // Suppress the error
      return;
    }
    // Let genuine errors through
    console.error('[Unhandled Rejection]', event.reason);
  });

  // Handle global errors
  window.addEventListener('error', (event) => {
    if (shouldFilterError(event.error || event.message)) {
      event.preventDefault(); // Suppress the error
      return;
    }
    // Let genuine errors through
  });
};
