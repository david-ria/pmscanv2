import { AndroidInfo } from '../hooks/useAndroidApiLevel';

export interface DeviceLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  category: 'ble' | 'permission' | 'lifecycle' | 'connection';
  message: string;
  deviceInfo?: Partial<AndroidInfo>;
  metadata?: Record<string, any>;
}

class DeviceLogger {
  private logs: DeviceLog[] = [];
  private maxLogs = 100;

  log(
    level: DeviceLog['level'],
    category: DeviceLog['category'],
    message: string,
    deviceInfo?: Partial<AndroidInfo>,
    metadata?: Record<string, any>
  ) {
    const log: DeviceLog = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      deviceInfo,
      metadata
    };

    this.logs.push(log);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with device context
    const deviceContext = deviceInfo 
      ? `[${deviceInfo.brand} ${deviceInfo.model} API${deviceInfo.apiLevel}]` 
      : '';
    
    const fullMessage = `${deviceContext} ${message}`;
    
    switch (level) {
      case 'error':
        console.error(`[${category.toUpperCase()}]`, fullMessage, metadata);
        break;
      case 'warn':
        console.warn(`[${category.toUpperCase()}]`, fullMessage, metadata);
        break;
      default:
        console.log(`[${category.toUpperCase()}]`, fullMessage, metadata);
    }

    // Store in localStorage for crash recovery
    try {
      localStorage.setItem('pmscan-device-logs', JSON.stringify(this.logs.slice(-20)));
    } catch (error) {
      console.warn('Failed to persist device logs:', error);
    }
  }

  getLogs(category?: DeviceLog['category']): DeviceLog[] {
    return category 
      ? this.logs.filter(log => log.category === category)
      : this.logs;
  }

  getCompatibilityReport(androidInfo: AndroidInfo): string {
    const connectionLogs = this.getLogs('connection');
    const bleLogs = this.getLogs('ble');
    
    const successRate = connectionLogs.length > 0 
      ? connectionLogs.filter(log => log.message.includes('success')).length / connectionLogs.length 
      : 0;

    return `
Device Compatibility Report
==========================
Device: ${androidInfo.brand} ${androidInfo.model}
Android: ${androidInfo.version} (API ${androidInfo.apiLevel})
BLE Connection Success Rate: ${(successRate * 100).toFixed(1)}%
Total BLE Events: ${bleLogs.length}
Connection Attempts: ${connectionLogs.length}

Recent Issues:
${this.logs
  .filter(log => log.level === 'error')
  .slice(-5)
  .map(log => `- ${log.message}`)
  .join('\n')}
    `.trim();
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem('pmscan-device-logs');
  }
}

export const deviceLogger = new DeviceLogger();
