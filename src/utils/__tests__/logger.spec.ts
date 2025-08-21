import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock import.meta.env before importing logger
const mockEnv = {
  DEV: true,
  PROD: false
};

vi.stubGlobal('import.meta', {
  env: mockEnv
});

describe('Logger Production Mode', () => {
  let consoleSpies: {
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    // Create spies for all console methods
    consoleSpies = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    // Clean up all spies
    Object.values(consoleSpies).forEach(spy => spy.mockRestore());
    vi.clearAllMocks();
  });

  describe('Development Mode', () => {
    beforeEach(async () => {
      // Set development mode
      mockEnv.DEV = true;
      mockEnv.PROD = false;
      
      // Clear module cache to reload with new env
      vi.resetModules();
    });

    test('should log all levels in development', async () => {
      const { debug, info, warn, error, getLogLevel, isLogLevelEnabled } = await import('../logger');

      debug('Test debug message');
      info('Test info message');
      warn('Test warn message');
      error('Test error message');

      expect(consoleSpies.debug).toHaveBeenCalledWith('[DEBUG] Test debug message');
      expect(consoleSpies.info).toHaveBeenCalledWith('[INFO] Test info message');
      expect(consoleSpies.warn).toHaveBeenCalledWith('[WARN] Test warn message');
      expect(consoleSpies.error).toHaveBeenCalledWith('[ERROR] Test error message');
      
      expect(getLogLevel()).toBe('debug');
      expect(isLogLevelEnabled('debug')).toBe(true);
      expect(isLogLevelEnabled('info')).toBe(true);
      expect(isLogLevelEnabled('warn')).toBe(true);
      expect(isLogLevelEnabled('error')).toBe(true);
    });
  });

  describe('Production Mode', () => {
    beforeEach(async () => {
      // Set production mode
      mockEnv.DEV = false;
      mockEnv.PROD = true;
      
      // Clear module cache to reload with new env
      vi.resetModules();
    });

    test('should suppress debug and info logs in production', async () => {
      const { debug, info, warn, error } = await import('../logger');

      debug('Test debug message');
      info('Test info message');  
      warn('Test warn message');
      error('Test error message');

      // debug and info should be suppressed
      expect(consoleSpies.debug).not.toHaveBeenCalled();
      expect(consoleSpies.info).not.toHaveBeenCalled();
      
      // warn and error should still work
      expect(consoleSpies.warn).toHaveBeenCalledWith('[WARN] Test warn message');
      expect(consoleSpies.error).toHaveBeenCalledWith('[ERROR] Test error message');
    });

    test('should return correct log level in production', async () => {
      const { getLogLevel, isLogLevelEnabled } = await import('../logger');

      expect(getLogLevel()).toBe('warn');
      expect(isLogLevelEnabled('debug')).toBe(false);
      expect(isLogLevelEnabled('info')).toBe(false);
      expect(isLogLevelEnabled('warn')).toBe(true);
      expect(isLogLevelEnabled('error')).toBe(true);
    });

    test('should suppress rate limited debug in production', async () => {
      const { rateLimitedDebug } = await import('../logger');

      rateLimitedDebug('test-key', 1000, 'Debug message');

      expect(consoleSpies.debug).not.toHaveBeenCalled();
    });
  });

  describe('Error Reporting', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      // Mock fetch for error reporting
      fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('', { status: 200 })
      );
      
      // Mock window object
      vi.stubGlobal('window', {
        location: { href: 'http://localhost:3000/test' }
      });
    });

    afterEach(() => {
      fetchSpy.mockRestore();
      vi.unstubAllGlobals();
    });

    test('should not send error reports in development', async () => {
      mockEnv.DEV = true;
      mockEnv.PROD = false;
      vi.resetModules();
      
      const { error } = await import('../logger');
      const testError = new Error('Test error');
      
      error('Test error message', testError);

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    test('should send error reports in production', async () => {
      mockEnv.DEV = false;
      mockEnv.PROD = true;
      vi.resetModules();
      
      const { error } = await import('../logger');
      const testError = new Error('Test error');
      
      error('Test error message', testError);

      expect(fetchSpy).toHaveBeenCalledWith('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"level":"error"')
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing arguments gracefully', async () => {
      mockEnv.DEV = true;
      mockEnv.PROD = false;
      vi.resetModules();
      
      const { debug, info, warn, error } = await import('../logger');

      // Should not throw errors
      expect(() => {
        debug('');
        info('');
        warn('');
        error('');
      }).not.toThrow();
    });

    test('should handle complex objects in log arguments', async () => {
      mockEnv.DEV = true;
      mockEnv.PROD = false;
      vi.resetModules();
      
      const { debug } = await import('../logger');

      const complexObject = {
        nested: { data: [1, 2, 3] },
        circular: {}
      };
      complexObject.circular = complexObject;

      expect(() => {
        debug('Complex object', complexObject);
      }).not.toThrow();

      expect(consoleSpies.debug).toHaveBeenCalledWith(
        '[DEBUG] Complex object',
        complexObject
      );
    });
  });
});