import { deviceLogger, DeviceLog } from '../services/deviceLogger';
import { AndroidInfo } from '../hooks/useAndroidApiLevel';

export type BlePhase = 'INIT' | 'SCAN' | 'CONNECT' | 'NOTIFY' | 'DISCONNECT' | 'MTU' | 'CHARS' | 'SERVICE';

export interface BleDebugConfig {
  enabled: boolean;
  phases: Set<BlePhase>;
  includeTimings: boolean;
  includeMetadata: boolean;
}

class BleDebugger {
  private config: BleDebugConfig;
  private phaseTimers: Map<string, number> = new Map();

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): BleDebugConfig {
    const stored = localStorage.getItem('pmscan-ble-debug');
    const defaultConfig: BleDebugConfig = {
      enabled: false,
      phases: new Set(['CONNECT', 'DISCONNECT', 'MTU']),
      includeTimings: true,
      includeMetadata: true
    };

    if (!stored) return defaultConfig;

    try {
      const parsed = JSON.parse(stored);
      return {
        ...defaultConfig,
        ...parsed,
        phases: new Set(parsed.phases || Array.from(defaultConfig.phases))
      };
    } catch {
      return defaultConfig;
    }
  }

  private saveConfig() {
    const configToSave = {
      ...this.config,
      phases: Array.from(this.config.phases)
    };
    localStorage.setItem('pmscan-ble-debug', JSON.stringify(configToSave));
  }

  setEnabled(enabled: boolean) {
    this.config.enabled = enabled;
    this.saveConfig();
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  isPhaseEnabled(phase: BlePhase): boolean {
    return this.config.enabled && this.config.phases.has(phase);
  }

  startTimer(phase: BlePhase, operation: string): string {
    const key = `${phase}:${operation}:${Date.now()}`;
    if (this.config.includeTimings) {
      this.phaseTimers.set(key, performance.now());
    }
    return key;
  }

  endTimer(timerKey: string): number | undefined {
    if (!this.config.includeTimings) return undefined;
    
    const startTime = this.phaseTimers.get(timerKey);
    if (startTime) {
      this.phaseTimers.delete(timerKey);
      return performance.now() - startTime;
    }
    return undefined;
  }

  log(
    phase: BlePhase,
    level: DeviceLog['level'],
    message: string,
    deviceInfo?: Partial<AndroidInfo>,
    metadata?: Record<string, any>
  ) {
    if (!this.isPhaseEnabled(phase)) return;

    const formattedMessage = `[BLE:${phase}] ${message}`;
    
    const enrichedMetadata = this.config.includeMetadata ? {
      ...metadata,
      phase,
      timestamp: Date.now(),
      debugMode: true
    } : metadata;

    deviceLogger.log(level, 'ble', formattedMessage, deviceInfo, enrichedMetadata);
  }

  info(phase: BlePhase, message: string, deviceInfo?: Partial<AndroidInfo>, metadata?: Record<string, any>) {
    this.log(phase, 'info', message, deviceInfo, metadata);
  }

  warn(phase: BlePhase, message: string, deviceInfo?: Partial<AndroidInfo>, metadata?: Record<string, any>) {
    this.log(phase, 'warn', message, deviceInfo, metadata);
  }

  error(phase: BlePhase, message: string, deviceInfo?: Partial<AndroidInfo>, metadata?: Record<string, any>) {
    this.log(phase, 'error', message, deviceInfo, metadata);
  }

  // Convenience method for timed operations
  async timeOperation<T>(
    phase: BlePhase,
    operation: string,
    fn: () => Promise<T>,
    deviceInfo?: Partial<AndroidInfo>
  ): Promise<T> {
    const timerKey = this.startTimer(phase, operation);
    this.info(phase, `Starting ${operation}`, deviceInfo);

    try {
      const result = await fn();
      const duration = this.endTimer(timerKey);
      this.info(phase, `Completed ${operation}${duration ? ` (${duration.toFixed(1)}ms)` : ''}`, deviceInfo, { duration });
      return result;
    } catch (error) {
      const duration = this.endTimer(timerKey);
      this.error(phase, `Failed ${operation}${duration ? ` (${duration.toFixed(1)}ms)` : ''}: ${error}`, deviceInfo, { 
        duration, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  // Export logs for field support
  exportDebugLogs(): string {
    const bleLogs = deviceLogger.getLogs('ble');
    const debugLogs = bleLogs.filter(log => log.metadata?.debugMode);
    
    return JSON.stringify({
      exportTime: new Date().toISOString(),
      debugConfig: this.config,
      totalLogs: debugLogs.length,
      logs: debugLogs
    }, null, 2);
  }

  // Diagnostic helper for common issues
  getDiagnostics(): string {
    const bleLogs = deviceLogger.getLogs('ble');
    const errors = bleLogs.filter(log => log.level === 'error');
    const connectAttempts = bleLogs.filter(log => log.message.includes('[BLE:CONNECT]'));
    const disconnects = bleLogs.filter(log => log.message.includes('[BLE:DISCONNECT]'));

    const successRate = connectAttempts.length > 0 
      ? ((connectAttempts.length - errors.filter(e => e.message.includes('[BLE:CONNECT]')).length) / connectAttempts.length * 100).toFixed(1)
      : '0';

    return `
BLE Debug Diagnostics
====================
Debug Mode: ${this.config.enabled ? 'ENABLED' : 'DISABLED'}
Active Phases: ${Array.from(this.config.phases).join(', ')}

Connection Stats:
- Connection Attempts: ${connectAttempts.length}
- Success Rate: ${successRate}%
- Disconnections: ${disconnects.length}
- Total Errors: ${errors.length}

Recent Errors:
${errors.slice(-3).map(e => `- ${e.message}`).join('\n')}
    `.trim();
  }
}

export const bleDebugger = new BleDebugger();