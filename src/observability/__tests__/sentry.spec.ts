import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as SentryModule from '@sentry/react';

// Mock Sentry module
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
  setContext: vi.fn(),
  withScope: vi.fn((callback) => callback({
    setTag: vi.fn(),
  })),
  browserTracingIntegration: vi.fn(() => ({})),
  replayIntegration: vi.fn(() => ({})),
}));

// Mock test mode
vi.mock('@/utils/testMode', () => ({
  isTestMode: vi.fn(() => false),
}));

import { isTestMode } from '@/utils/testMode';
import {
  initSentry,
  captureException,
  captureMessage,
  setUser,
  setContext,
  isSentryEnabled,
  getSentry,
} from '../sentry';

// Mock import.meta.env
const mockEnv = {
  PROD: false,
  VITE_SENTRY_ENABLED: '0',
  VITE_SENTRY_DSN: '',
  VITE_APP_VERSION: 'test-1.0.0',
};

Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: mockEnv,
    },
  },
});

describe('Sentry Observability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset environment to default (disabled) state
    mockEnv.PROD = false;
    mockEnv.VITE_SENTRY_ENABLED = '0';
    mockEnv.VITE_SENTRY_DSN = '';
    
    // Reset test mode mock
    vi.mocked(isTestMode).mockReturnValue(false);
    
    // Clear console logs
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Sentry Initialization', () => {
    it('should not initialize when not in production', () => {
      mockEnv.PROD = false;
      mockEnv.VITE_SENTRY_ENABLED = '1';
      mockEnv.VITE_SENTRY_DSN = 'https://test@sentry.io/123456';

      initSentry();

      expect(SentryModule.init).not.toHaveBeenCalled();
      expect(isSentryEnabled()).toBe(false);
      expect(console.log).toHaveBeenCalledWith('📊 Sentry: Disabled (not production environment)');
    });

    it('should not initialize when VITE_SENTRY_ENABLED is not "1"', () => {
      mockEnv.PROD = true;
      mockEnv.VITE_SENTRY_ENABLED = '0';
      mockEnv.VITE_SENTRY_DSN = 'https://test@sentry.io/123456';

      initSentry();

      expect(SentryModule.init).not.toHaveBeenCalled();
      expect(isSentryEnabled()).toBe(false);
      expect(console.log).toHaveBeenCalledWith('📊 Sentry: Disabled (VITE_SENTRY_ENABLED not set to "1")');
    });

    it('should not initialize when VITE_SENTRY_DSN is not provided', () => {
      mockEnv.PROD = true;
      mockEnv.VITE_SENTRY_ENABLED = '1';
      mockEnv.VITE_SENTRY_DSN = '';

      initSentry();

      expect(SentryModule.init).not.toHaveBeenCalled();
      expect(isSentryEnabled()).toBe(false);
      expect(console.log).toHaveBeenCalledWith('📊 Sentry: Disabled (VITE_SENTRY_DSN not provided)');
    });

    it('should not initialize in test mode', () => {
      mockEnv.PROD = true;
      mockEnv.VITE_SENTRY_ENABLED = '1';
      mockEnv.VITE_SENTRY_DSN = 'https://test@sentry.io/123456';
      vi.mocked(isTestMode).mockReturnValue(true);

      initSentry();

      expect(SentryModule.init).not.toHaveBeenCalled();
      expect(isSentryEnabled()).toBe(false);
      expect(console.log).toHaveBeenCalledWith('🧪 [TEST MODE] Sentry initialization disabled');
    });

    it('should initialize when all conditions are met', () => {
      mockEnv.PROD = true;
      mockEnv.VITE_SENTRY_ENABLED = '1';
      mockEnv.VITE_SENTRY_DSN = 'https://test@sentry.io/123456';

      initSentry();

      expect(SentryModule.init).toHaveBeenCalledWith({
        dsn: 'https://test@sentry.io/123456',
        environment: 'production',
        tracesSampleRate: 0.1,
        release: 'test-1.0.0',
        beforeSend: expect.any(Function),
        beforeBreadcrumb: expect.any(Function),
        integrations: expect.any(Array),
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
      });
      expect(isSentryEnabled()).toBe(true);
      expect(console.log).toHaveBeenCalledWith('📊 Sentry: Initialized successfully');
    });

    it('should handle initialization errors gracefully', () => {
      mockEnv.PROD = true;
      mockEnv.VITE_SENTRY_ENABLED = '1';
      mockEnv.VITE_SENTRY_DSN = 'https://test@sentry.io/123456';
      
      const initError = new Error('Sentry init failed');
      vi.mocked(SentryModule.init).mockImplementation(() => {
        throw initError;
      });

      initSentry();

      expect(isSentryEnabled()).toBe(false);
      expect(console.error).toHaveBeenCalledWith('📊 Sentry: Initialization failed:', initError);
    });
  });

  describe('Error Filtering', () => {
    it('should filter out ResizeObserver errors', () => {
      mockEnv.PROD = true;
      mockEnv.VITE_SENTRY_ENABLED = '1';
      mockEnv.VITE_SENTRY_DSN = 'https://test@sentry.io/123456';

      initSentry();

      const beforeSendCallback = vi.mocked(SentryModule.init).mock.calls[0][0].beforeSend;
      const mockEvent = {
        exception: {
          values: [{ value: 'ResizeObserver loop limit exceeded' }]
        }
      };

      const result = beforeSendCallback(mockEvent as any, {});
      expect(result).toBeNull();
    });

    it('should filter out non-error promise rejections', () => {
      mockEnv.PROD = true;
      mockEnv.VITE_SENTRY_ENABLED = '1';
      mockEnv.VITE_SENTRY_DSN = 'https://test@sentry.io/123456';

      initSentry();

      const beforeSendCallback = vi.mocked(SentryModule.init).mock.calls[0][0].beforeSend;
      const mockEvent = {
        exception: {
          values: [{ value: 'Non-Error promise rejection captured with keys: status, data' }]
        }
      };

      const result = beforeSendCallback(mockEvent as any, {});
      expect(result).toBeNull();
    });

    it('should allow other errors through', () => {
      mockEnv.PROD = true;
      mockEnv.VITE_SENTRY_ENABLED = '1';
      mockEnv.VITE_SENTRY_DSN = 'https://test@sentry.io/123456';

      initSentry();

      const beforeSendCallback = vi.mocked(SentryModule.init).mock.calls[0][0].beforeSend;
      const mockEvent = {
        exception: {
          values: [{ value: 'Actual application error' }]
        }
      };

      const result = beforeSendCallback(mockEvent as any, {});
      expect(result).toBe(mockEvent);
    });
  });

  describe('Breadcrumb Filtering', () => {
    it('should filter out console breadcrumbs', () => {
      mockEnv.PROD = true;
      mockEnv.VITE_SENTRY_ENABLED = '1';
      mockEnv.VITE_SENTRY_DSN = 'https://test@sentry.io/123456';

      initSentry();

      const beforeBreadcrumbCallback = vi.mocked(SentryModule.init).mock.calls[0][0].beforeBreadcrumb;
      const consoleBreadcrumb = { category: 'console', message: 'test log' };

      const result = beforeBreadcrumbCallback(consoleBreadcrumb);
      expect(result).toBeNull();
    });

    it('should allow other breadcrumbs through', () => {
      mockEnv.PROD = true;
      mockEnv.VITE_SENTRY_ENABLED = '1';
      mockEnv.VITE_SENTRY_DSN = 'https://test@sentry.io/123456';

      initSentry();

      const beforeBreadcrumbCallback = vi.mocked(SentryModule.init).mock.calls[0][0].beforeBreadcrumb;
      const navigationBreadcrumb = { category: 'navigation', message: 'navigate to /home' };

      const result = beforeBreadcrumbCallback(navigationBreadcrumb);
      expect(result).toBe(navigationBreadcrumb);
    });
  });

  describe('captureException', () => {
    it('should no-op when Sentry is disabled', () => {
      // Sentry not initialized (disabled by default)
      const error = new Error('Test error');
      
      captureException(error);

      expect(SentryModule.captureException).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('Error (Sentry disabled):', error, undefined);
    });

    it('should capture exception when Sentry is enabled', () => {
      // Initialize Sentry
      mockEnv.PROD = true;
      mockEnv.VITE_SENTRY_ENABLED = '1';
      mockEnv.VITE_SENTRY_DSN = 'https://test@sentry.io/123456';
      initSentry();

      const error = new Error('Test error');
      captureException(error);

      expect(SentryModule.captureException).toHaveBeenCalledWith(error);
    });

    it('should capture exception with context when Sentry is enabled', () => {
      // Initialize Sentry
      mockEnv.PROD = true;
      mockEnv.VITE_SENTRY_ENABLED = '1';
      mockEnv.VITE_SENTRY_DSN = 'https://test@sentry.io/123456';
      initSentry();

      const error = new Error('Test error');
      const context = { userId: '123', operation: 'test' };
      
      captureException(error, context);

      expect(SentryModule.withScope).toHaveBeenCalled();
      expect(SentryModule.captureException).toHaveBeenCalledWith(error);
    });

    it('should handle Sentry errors gracefully', () => {
      // Initialize Sentry
      mockEnv.PROD = true;
      mockEnv.VITE_SENTRY_ENABLED = '1';
      mockEnv.VITE_SENTRY_DSN = 'https://test@sentry.io/123456';
      initSentry();

      const error = new Error('Test error');
      const sentryError = new Error('Sentry error');
      vi.mocked(SentryModule.captureException).mockImplementation(() => {
        throw sentryError;
      });

      captureException(error);

      expect(console.error).toHaveBeenCalledWith('Failed to capture exception with Sentry:', sentryError);
      expect(console.error).toHaveBeenCalledWith('Original error:', error);
    });
  });

  describe('captureMessage', () => {
    it('should no-op when Sentry is disabled', () => {
      captureMessage('Test message', 'warning');

      expect(SentryModule.captureMessage).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('Message (Sentry disabled, warning):', 'Test message');
    });

    it('should capture message when Sentry is enabled', () => {
      // Initialize Sentry
      mockEnv.PROD = true;
      mockEnv.VITE_SENTRY_ENABLED = '1';
      mockEnv.VITE_SENTRY_DSN = 'https://test@sentry.io/123456';
      initSentry();

      captureMessage('Test message', 'error');

      expect(SentryModule.captureMessage).toHaveBeenCalledWith('Test message', 'error');
    });
  });

  describe('setUser', () => {
    it('should no-op when Sentry is disabled', () => {
      const user = { id: '123', email: 'test@example.com' };
      setUser(user);

      expect(SentryModule.setUser).not.toHaveBeenCalled();
    });

    it('should set user when Sentry is enabled', () => {
      // Initialize Sentry
      mockEnv.PROD = true;
      mockEnv.VITE_SENTRY_ENABLED = '1';
      mockEnv.VITE_SENTRY_DSN = 'https://test@sentry.io/123456';
      initSentry();

      const user = { id: '123', email: 'test@example.com' };
      setUser(user);

      expect(SentryModule.setUser).toHaveBeenCalledWith(user);
    });
  });

  describe('setContext', () => {
    it('should no-op when Sentry is disabled', () => {
      setContext('app', { version: '1.0.0' });

      expect(SentryModule.setContext).not.toHaveBeenCalled();
    });

    it('should set context when Sentry is enabled', () => {
      // Initialize Sentry
      mockEnv.PROD = true;
      mockEnv.VITE_SENTRY_ENABLED = '1';
      mockEnv.VITE_SENTRY_DSN = 'https://test@sentry.io/123456';
      initSentry();

      const context = { version: '1.0.0' };
      setContext('app', context);

      expect(SentryModule.setContext).toHaveBeenCalledWith('app', context);
    });
  });

  describe('getSentry', () => {
    it('should return null when Sentry is disabled', () => {
      expect(getSentry()).toBeNull();
    });

    it('should return Sentry when enabled', () => {
      // Initialize Sentry
      mockEnv.PROD = true;
      mockEnv.VITE_SENTRY_ENABLED = '1';
      mockEnv.VITE_SENTRY_DSN = 'https://test@sentry.io/123456';
      initSentry();

      expect(getSentry()).toBe(SentryModule);
    });
  });

  describe('Environment Variable Combinations', () => {
    const testCases = [
      { PROD: false, ENABLED: '0', DSN: '', expected: false, reason: 'not production' },
      { PROD: false, ENABLED: '1', DSN: '', expected: false, reason: 'not production' },
      { PROD: false, ENABLED: '0', DSN: 'dsn', expected: false, reason: 'not production' },
      { PROD: false, ENABLED: '1', DSN: 'dsn', expected: false, reason: 'not production' },
      { PROD: true, ENABLED: '0', DSN: '', expected: false, reason: 'not enabled' },
      { PROD: true, ENABLED: '1', DSN: '', expected: false, reason: 'no DSN' },
      { PROD: true, ENABLED: '0', DSN: 'dsn', expected: false, reason: 'not enabled' },
      { PROD: true, ENABLED: '1', DSN: 'dsn', expected: true, reason: 'all conditions met' },
      { PROD: true, ENABLED: 'true', DSN: 'dsn', expected: false, reason: 'enabled must be "1"' },
      { PROD: true, ENABLED: '1', DSN: 'https://test@sentry.io/123456', expected: true, reason: 'valid DSN' },
    ];

    testCases.forEach(({ PROD, ENABLED, DSN, expected, reason }) => {
      it(`should ${expected ? 'initialize' : 'not initialize'} when PROD=${PROD}, ENABLED=${ENABLED}, DSN=${DSN} (${reason})`, () => {
        mockEnv.PROD = PROD;
        mockEnv.VITE_SENTRY_ENABLED = ENABLED;
        mockEnv.VITE_SENTRY_DSN = DSN;

        initSentry();

        if (expected) {
          expect(SentryModule.init).toHaveBeenCalled();
          expect(isSentryEnabled()).toBe(true);
        } else {
          expect(SentryModule.init).not.toHaveBeenCalled();
          expect(isSentryEnabled()).toBe(false);
        }
      });
    });
  });
});