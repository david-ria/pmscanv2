import * as Sentry from '@sentry/react';
import { isTestMode } from '@/utils/testMode';

/**
 * Sentry observability integration
 * Only initializes in production with explicit opt-in configuration
 */

let sentryEnabled = false;

/**
 * Initialize Sentry with strict opt-in requirements
 * Only enabled when ALL conditions are met:
 * - Production environment (import.meta.env.PROD)
 * - Explicit opt-in flag (VITE_SENTRY_ENABLED === '1')
 * - DSN provided (VITE_SENTRY_DSN)
 * - Not in test mode
 */
export function initSentry(): void {
  // Never initialize in test mode
  if (isTestMode()) {
    console.log('🧪 [TEST MODE] Sentry initialization disabled');
    return;
  }

  // Check all required conditions for Sentry initialization
  const isProd = import.meta.env.PROD;
  const isEnabled = import.meta.env.VITE_SENTRY_ENABLED === '1';
  const hasDsn = !!import.meta.env.VITE_SENTRY_DSN;

  console.log('🔍 Sentry initialization check:', {
    isProd,
    isEnabled,
    hasDsn,
    testMode: isTestMode()
  });

  if (!isProd) {
    console.log('📊 Sentry: Disabled (not production environment)');
    return;
  }

  if (!isEnabled) {
    console.log('📊 Sentry: Disabled (VITE_SENTRY_ENABLED not set to "1")');
    return;
  }

  if (!hasDsn) {
    console.log('📊 Sentry: Disabled (VITE_SENTRY_DSN not provided)');
    return;
  }

  try {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: 'production',
      
      // Performance monitoring
      tracesSampleRate: 0.1, // 10% of transactions
      
      // Release tracking
      release: import.meta.env.VITE_APP_VERSION || 'unknown',
      
      // Error filtering
      beforeSend(event) {
        // Filter out common non-actionable errors
        if (event.exception?.values?.[0]?.value?.includes('ResizeObserver loop limit exceeded')) {
          return null;
        }
        
        if (event.exception?.values?.[0]?.value?.includes('Non-Error promise rejection captured')) {
          return null;
        }
        
        return event;
      },
      
      // Privacy settings
      beforeBreadcrumb(breadcrumb) {
        // Don't capture console logs in breadcrumbs
        if (breadcrumb.category === 'console') {
          return null;
        }
        return breadcrumb;
      },
      
      // Integration settings
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      
      // Session replay sampling
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of error sessions
    });

    sentryEnabled = true;
    console.log('📊 Sentry: Initialized successfully');
  } catch (error) {
    console.error('📊 Sentry: Initialization failed:', error);
    sentryEnabled = false;
  }
}

/**
 * Capture an exception with Sentry
 * No-op when Sentry is not enabled
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (!sentryEnabled) {
    // Still log to console for development debugging
    console.error('Error (Sentry disabled):', error, context);
    return;
  }

  try {
    if (context) {
      Sentry.withScope((scope) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  } catch (sentryError) {
    console.error('Failed to capture exception with Sentry:', sentryError);
    console.error('Original error:', error);
  }
}

/**
 * Capture a message with Sentry
 * No-op when Sentry is not enabled
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  if (!sentryEnabled) {
    console.log(`Message (Sentry disabled, ${level}):`, message);
    return;
  }

  try {
    Sentry.captureMessage(message, level);
  } catch (sentryError) {
    console.error('Failed to capture message with Sentry:', sentryError);
  }
}

/**
 * Add user context to Sentry
 * No-op when Sentry is not enabled
 */
export function setUser(user: { id?: string; email?: string; username?: string }): void {
  if (!sentryEnabled) {
    return;
  }

  try {
    Sentry.setUser(user);
  } catch (sentryError) {
    console.error('Failed to set user context in Sentry:', sentryError);
  }
}

/**
 * Add custom context to Sentry
 * No-op when Sentry is not enabled
 */
export function setContext(key: string, context: Record<string, any>): void {
  if (!sentryEnabled) {
    return;
  }

  try {
    Sentry.setContext(key, context);
  } catch (sentryError) {
    console.error('Failed to set context in Sentry:', sentryError);
  }
}

/**
 * Check if Sentry is currently enabled
 */
export function isSentryEnabled(): boolean {
  return sentryEnabled;
}

/**
 * Export Sentry for advanced usage when enabled
 * Returns null when disabled
 */
export function getSentry(): typeof Sentry | null {
  return sentryEnabled ? Sentry : null;
}