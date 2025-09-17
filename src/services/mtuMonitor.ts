import { MtuManager, FragmentManager, type MtuInfo } from '@/lib/pmscan/mtuManager';
import * as logger from '@/utils/logger';

/**
 * MTU and fragmentation monitoring service for diagnostics
 */
export class MtuMonitorService {
  private static fragmentStats = {
    totalNotifications: 0,
    fragmentedNotifications: 0,
    fragmentsReceived: 0,
    fragmentationRate: 0,
    lastUpdate: Date.now(),
  };

  private static performanceMetrics = {
    avgNotificationSize: 0,
    maxNotificationSize: 0,
    fragmentationOverhead: 0,
  };

  /**
   * Start monitoring MTU and fragmentation performance
   */
  public static startMonitoring(): void {
    // Clean up expired fragments every 10 seconds
    setInterval(() => {
      FragmentManager.cleanupExpiredFragments();
    }, 10000);

    // Log performance stats every minute
    setInterval(() => {
      this.logPerformanceStats();
    }, 60000);

    logger.debug('📊 MTU monitoring service started');
  }

  /**
   * Record notification statistics
   */
  public static recordNotification(
    characteristicUuid: string,
    dataSize: number,
    wasFragmented: boolean = false
  ): void {
    this.fragmentStats.totalNotifications++;
    this.fragmentStats.fragmentsReceived += wasFragmented ? 2 : 1; // Assume 2 fragments on average
    
    if (wasFragmented) {
      this.fragmentStats.fragmentedNotifications++;
    }

    // Update fragmentation rate
    this.fragmentStats.fragmentationRate = 
      (this.fragmentStats.fragmentedNotifications / this.fragmentStats.totalNotifications) * 100;

    // Update performance metrics
    this.updatePerformanceMetrics(dataSize);
    this.fragmentStats.lastUpdate = Date.now();
  }

  /**
   * Get current MTU and fragmentation statistics
   */
  public static getStats(): {
    mtu: MtuInfo | null;
    fragmentation: typeof MtuMonitorService.fragmentStats;
    performance: typeof MtuMonitorService.performanceMetrics;
  } {
    return {
      mtu: MtuManager.getCurrentMtu(),
      fragmentation: { ...this.fragmentStats },
      performance: { ...this.performanceMetrics },
    };
  }

  /**
   * Check if current performance is optimal
   */
  public static isPerformanceOptimal(): boolean {
    const mtu = MtuManager.getCurrentMtu();
    if (!mtu) return false;

    // Performance is considered optimal if:
    // 1. MTU is at least 185 bytes (common Android negotiated size)
    // 2. Fragmentation rate is below 10%
    return mtu.negotiated >= 185 && this.fragmentStats.fragmentationRate < 10;
  }

  /**
   * Get performance recommendations
   */
  public static getRecommendations(): string[] {
    const recommendations: string[] = [];
    const mtu = MtuManager.getCurrentMtu();
    
    if (!mtu || mtu.negotiated <= 23) {
      recommendations.push('MTU negotiation failed - data transmission will be slow');
    }

    if (this.fragmentStats.fragmentationRate > 20) {
      recommendations.push('High fragmentation rate - consider reducing data payload size');
    }

    if (!mtu?.supportsExtended) {
      recommendations.push('Extended data will require fragmentation - expect slower transfers');
    }

    if (this.performanceMetrics.fragmentationOverhead > 30) {
      recommendations.push('High fragmentation overhead - optimize data packet structure');
    }

    return recommendations;
  }

  /**
   * Reset monitoring statistics
   */
  public static reset(): void {
    this.fragmentStats = {
      totalNotifications: 0,
      fragmentedNotifications: 0,
      fragmentsReceived: 0,
      fragmentationRate: 0,
      lastUpdate: Date.now(),
    };

    this.performanceMetrics = {
      avgNotificationSize: 0,
      maxNotificationSize: 0,
      fragmentationOverhead: 0,
    };

    logger.debug('🔄 MTU monitoring statistics reset');
  }

  /**
   * Update performance metrics with new data point
   */
  private static updatePerformanceMetrics(dataSize: number): void {
    // Update average notification size
    const totalSize = this.performanceMetrics.avgNotificationSize * (this.fragmentStats.totalNotifications - 1) + dataSize;
    this.performanceMetrics.avgNotificationSize = totalSize / this.fragmentStats.totalNotifications;

    // Update max notification size
    this.performanceMetrics.maxNotificationSize = Math.max(
      this.performanceMetrics.maxNotificationSize,
      dataSize
    );

    // Calculate fragmentation overhead
    const mtu = MtuManager.getCurrentMtu();
    if (mtu && dataSize > mtu.effective) {
      const fragments = Math.ceil(dataSize / mtu.effective);
      const overhead = ((fragments * 3) / dataSize) * 100; // 3 bytes BLE overhead per fragment
      this.performanceMetrics.fragmentationOverhead = Math.max(
        this.performanceMetrics.fragmentationOverhead,
        overhead
      );
    }
  }

  /**
   * Log performance statistics to console
   */
  private static logPerformanceStats(): void {
    const stats = this.getStats();
    
    if (stats.fragmentation.totalNotifications === 0) return;

    logger.debug('📊 MTU Performance Stats:');
    logger.debug(`   MTU: ${stats.mtu?.negotiated || 'unknown'} bytes (${stats.mtu?.effective || 'unknown'} effective)`);
    logger.debug(`   Notifications: ${stats.fragmentation.totalNotifications}`);
    logger.debug(`   Fragmentation Rate: ${stats.fragmentation.fragmentationRate.toFixed(1)}%`);
    logger.debug(`   Avg Size: ${stats.performance.avgNotificationSize.toFixed(1)} bytes`);
    logger.debug(`   Max Size: ${stats.performance.maxNotificationSize} bytes`);

    const recommendations = this.getRecommendations();
    if (recommendations.length > 0) {
      logger.warn('⚠️ Performance Recommendations:');
      recommendations.forEach(rec => logger.warn(`   • ${rec}`));
    }
  }
}