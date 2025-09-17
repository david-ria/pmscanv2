/**
 * Safe wrapper for BLE operations that provides fallback when bleDebugger fails
 * This prevents BLE operations from breaking due to debugging issues
 */

import * as logger from '@/utils/logger';

type BlePhase = 'INIT' | 'SCAN' | 'CONNECT' | 'NOTIFY' | 'DISCONNECT' | 'MTU' | 'CHARS' | 'SERVICE';

interface SafeBleDebugger {
  info: (phase: BlePhase, message: string, deviceInfo?: any, metadata?: Record<string, any>) => void;
  warn: (phase: BlePhase, message: string, deviceInfo?: any, metadata?: Record<string, any>) => void;
  error: (phase: BlePhase, message: string, deviceInfo?: any, metadata?: Record<string, any>) => void;
  timeOperation: <T>(phase: BlePhase, operation: string, fn: () => Promise<T>, deviceInfo?: any) => Promise<T>;
}

class SafeBleDebuggerImpl implements SafeBleDebugger {
  private realDebugger: any = null;
  private debuggerAvailable = false;

  constructor() {
    this.initializeDebugger();
  }

  private async initializeDebugger() {
    try {
      const { bleDebugger } = await import('@/lib/bleDebug');
      this.realDebugger = bleDebugger;
      this.debuggerAvailable = true;
      console.log('[BLE SAFE] Real debugger initialized successfully');
    } catch (error) {
      console.warn('[BLE SAFE] Real debugger not available, using fallback:', error);
      this.debuggerAvailable = false;
    }
  }

  info(phase: BlePhase, message: string, deviceInfo?: any, metadata?: Record<string, any>) {
    if (this.debuggerAvailable && this.realDebugger) {
      try {
        this.realDebugger.info(phase, message, deviceInfo, metadata);
      } catch (error) {
        console.warn('[BLE SAFE] Real debugger.info failed, using fallback:', error);
        this.fallbackLog('info', phase, message, metadata);
      }
    } else {
      this.fallbackLog('info', phase, message, metadata);
    }
  }

  warn(phase: BlePhase, message: string, deviceInfo?: any, metadata?: Record<string, any>) {
    if (this.debuggerAvailable && this.realDebugger) {
      try {
        this.realDebugger.warn(phase, message, deviceInfo, metadata);
      } catch (error) {
        console.warn('[BLE SAFE] Real debugger.warn failed, using fallback:', error);
        this.fallbackLog('warn', phase, message, metadata);
      }
    } else {
      this.fallbackLog('warn', phase, message, metadata);
    }
  }

  error(phase: BlePhase, message: string, deviceInfo?: any, metadata?: Record<string, any>) {
    if (this.debuggerAvailable && this.realDebugger) {
      try {
        this.realDebugger.error(phase, message, deviceInfo, metadata);
      } catch (error) {
        console.error('[BLE SAFE] Real debugger.error failed, using fallback:', error);
        this.fallbackLog('error', phase, message, metadata);
      }
    } else {
      this.fallbackLog('error', phase, message, metadata);
    }
  }

  async timeOperation<T>(
    phase: BlePhase,
    operation: string,
    fn: () => Promise<T>,
    deviceInfo?: any
  ): Promise<T> {
    if (this.debuggerAvailable && this.realDebugger) {
      try {
        return await this.realDebugger.timeOperation(phase, operation, fn, deviceInfo);
      } catch (debuggerError) {
        console.warn('[BLE SAFE] Real debugger.timeOperation failed, using fallback:', debuggerError);
        return await this.fallbackTimeOperation(phase, operation, fn);
      }
    } else {
      return await this.fallbackTimeOperation(phase, operation, fn);
    }
  }

  private fallbackLog(level: 'info' | 'warn' | 'error', phase: BlePhase, message: string, metadata?: Record<string, any>) {
    const formattedMessage = `[BLE:${phase}] ${message}`;
    
    try {
      // Try to use the regular logger if available
      if (level === 'error') {
        logger.error(formattedMessage, undefined, metadata);
      } else if (level === 'warn') {
        logger.warn(formattedMessage, metadata);
      } else {
        logger.info(formattedMessage, metadata);
      }
    } catch (loggerError) {
      // Final fallback to console
      const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      consoleMethod(`[BLE SAFE FALLBACK] ${formattedMessage}`, metadata);
    }
  }

  private async fallbackTimeOperation<T>(
    phase: BlePhase,
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    this.fallbackLog('info', phase, `Starting ${operation}`);

    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      this.fallbackLog('info', phase, `Completed ${operation} (${duration.toFixed(1)}ms)`, { duration });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.fallbackLog('error', phase, `Failed ${operation} (${duration.toFixed(1)}ms): ${error}`, { 
        duration, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }
}

// Export a singleton instance
export const safeBleDebugger = new SafeBleDebuggerImpl();