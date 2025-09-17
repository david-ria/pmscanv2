/**
 * Safe wrapper for BLE operations that provides fallback when bleDebugger fails
 * This prevents BLE operations from breaking due to debugging issues
 */

import * as logger from '@/utils/logger';
import { Capacitor } from '@capacitor/core';

export type BlePhase = 'INIT' | 'SCAN' | 'CONNECT' | 'NOTIFY' | 'DISCONNECT' | 'MTU' | 'CHARS' | 'SERVICE' | 'PICKER' | 'VALIDATE';

interface SafeBleDebugger {
  info: (phase: BlePhase, message: string, deviceInfo?: any, metadata?: Record<string, any>) => void;
  warn: (phase: BlePhase, message: string, deviceInfo?: any, metadata?: Record<string, any>) => void;
  error: (phase: BlePhase, message: string, deviceInfo?: any, metadata?: Record<string, any>) => void;
  timeOperation: <T>(phase: BlePhase, operation: string, fn: () => Promise<T>, deviceInfo?: any) => Promise<T>;
  // Extended management API for UI components (no-op fallbacks when real debugger is absent)
  setEnabled?: (enabled: boolean) => void;
  isEnabled?: () => boolean;
  isPhaseEnabled?: (phase: BlePhase) => boolean;
  exportDebugLogs?: () => string;
  getDiagnostics?: () => string;
}

class SafeBleDebuggerImpl implements SafeBleDebugger {
  private realDebugger: any = null;
  private debuggerAvailable = false;
  private enabled = false;
  private phases = new Set<BlePhase>(['CONNECT', 'DISCONNECT', 'MTU', 'PICKER', 'VALIDATE']);

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
    // Always mirror to console on native for Logcat visibility
    if (Capacitor.isNativePlatform()) {
      this.fallbackLog('info', phase, message, metadata);
      return;
    }
    
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
    // Always mirror to console on native for Logcat visibility
    if (Capacitor.isNativePlatform()) {
      this.fallbackLog('warn', phase, message, metadata);
      return;
    }
    
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
    // Always mirror to console on native for Logcat visibility
    if (Capacitor.isNativePlatform()) {
      this.fallbackLog('error', phase, message, metadata);
      return;
    }
    
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
    
    // Always mirror to console for Android/Capacitor Logcat visibility
    const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    
    try {
      // For Android, always use console to ensure Logcat visibility
      if (typeof (globalThis as any).Capacitor !== 'undefined') {
        consoleMethod(formattedMessage, metadata ? JSON.stringify(metadata, null, 2) : '');
      } else {
        // Web: try logger first, fallback to console
        if (level === 'error') {
          logger.error(formattedMessage, undefined, metadata);
        } else if (level === 'warn') {
          logger.warn(formattedMessage, metadata);
        } else {
          logger.info(formattedMessage, metadata);
        }
      }
    } catch (loggerError) {
      // Final fallback to console
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

  // Management API (fallbacks when real debugger missing)
  setEnabled(enabled: boolean) {
    if (this.debuggerAvailable && this.realDebugger?.setEnabled) {
      try {
        this.realDebugger.setEnabled(enabled);
        return;
      } catch (error) {
        console.warn('[BLE SAFE] setEnabled failed on real debugger, using fallback');
      }
    }
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    if (this.debuggerAvailable && this.realDebugger?.isEnabled) {
      try {
        return this.realDebugger.isEnabled();
      } catch {}
    }
    return this.enabled;
  }

  isPhaseEnabled(phase: BlePhase): boolean {
    const enabled = this.isEnabled();
    if (!enabled) return false;
    if (this.debuggerAvailable && this.realDebugger?.isPhaseEnabled) {
      try {
        return this.realDebugger.isPhaseEnabled(phase);
      } catch {}
    }
    return this.phases.has(phase);
  }

  exportDebugLogs(): string {
    if (this.debuggerAvailable && this.realDebugger?.exportDebugLogs) {
      try {
        return this.realDebugger.exportDebugLogs();
      } catch (error) {
        console.warn('[BLE SAFE] exportDebugLogs failed on real debugger, using fallback');
      }
    }
    return JSON.stringify({
      exportTime: new Date().toISOString(),
      debugConfig: { enabled: this.enabled, phases: Array.from(this.phases) },
      totalLogs: 0,
      logs: []
    }, null, 2);
  }

  getDiagnostics(): string {
    if (this.debuggerAvailable && this.realDebugger?.getDiagnostics) {
      try {
        return this.realDebugger.getDiagnostics();
      } catch (error) {
        console.warn('[BLE SAFE] getDiagnostics failed on real debugger, using fallback');
      }
    }
    return [
      'BLE Debug Diagnostics',
      '====================',
      `Debug Mode: ${this.isEnabled() ? 'ENABLED' : 'DISABLED'}`,
      `Active Phases: ${Array.from(this.phases).join(', ')}`,
      '',
      'Note: Using safe fallback logger; detailed metrics require full debugger.'
    ].join('\n');
  }
}

// Export a singleton instance
export const safeBleDebugger = new SafeBleDebuggerImpl();