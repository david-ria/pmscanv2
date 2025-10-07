import { PMScanData } from '@/lib/pmscan/types';
import * as logger from '@/utils/logger';

interface BufferedReading {
  data: PMScanData;
  timestamp: number;
}

/**
 * Rolling Buffer Service for Recording Frequency Averaging
 * 
 * Maintains a 60-second circular buffer of raw sensor readings.
 * When recording is active, calculates running averages over user-selected windows.
 * 
 * Example: If user selects "10s" frequency:
 * - Buffer continuously collects all incoming readings
 * - When recording triggers, returns 10-second average of pm1/pm25/pm10/temp/humidity
 * - Battery/charging use latest values (not averaged)
 */
class RollingBufferService {
  private buffer: BufferedReading[] = [];
  private readonly MAX_BUFFER_DURATION_MS = 60000; // 60 seconds

  /**
   * Add a new reading to the buffer
   * Automatically prunes readings older than 60 seconds
   */
  addReading(data: PMScanData): void {
    const now = Date.now();
    
    // Add new reading
    this.buffer.push({
      data,
      timestamp: now,
    });

    // Prune old readings (keep last 60 seconds)
    const cutoffTime = now - this.MAX_BUFFER_DURATION_MS;
    this.buffer = this.buffer.filter(reading => reading.timestamp >= cutoffTime);

    logger.rateLimitedDebug(
      'rolling-buffer-add',
      5000,
      `📊 Buffer updated: ${this.buffer.length} readings, pm25=${data.pm25.toFixed(1)}`
    );
  }

  /**
   * Calculate running average over specified window
   * 
   * @param windowSeconds - Averaging window (e.g., 10 for 10-second average)
   * @returns Averaged PMScanData with current timestamp
   */
  getAverage(windowSeconds: number): PMScanData | null {
    if (this.buffer.length === 0) {
      logger.warn('⚠️ Buffer is empty, cannot calculate average');
      return null;
    }

    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const cutoffTime = now - windowMs;

    // Filter readings within the window
    const windowReadings = this.buffer.filter(
      reading => reading.timestamp >= cutoffTime
    );

    if (windowReadings.length === 0) {
      // Fallback: use all available readings if window is empty
      logger.debug(`⚠️ No readings in ${windowSeconds}s window, using all ${this.buffer.length} available`);
      return this.calculateAverage(this.buffer);
    }

    logger.debug(
      `📊 Calculating ${windowSeconds}s average from ${windowReadings.length} readings`
    );
    return this.calculateAverage(windowReadings);
  }

  /**
   * Calculate average values from a set of readings
   */
  private calculateAverage(readings: BufferedReading[]): PMScanData {
    const count = readings.length;
    
    const sums = readings.reduce(
      (acc, { data }) => ({
        pm1: acc.pm1 + data.pm1,
        pm25: acc.pm25 + data.pm25,
        pm10: acc.pm10 + data.pm10,
        temp: acc.temp + data.temp,
        humidity: acc.humidity + data.humidity,
      }),
      { pm1: 0, pm25: 0, pm10: 0, temp: 0, humidity: 0 }
    );

    // Get latest reading for battery/charging status (not averaged)
    const latestReading = readings[readings.length - 1].data;

    return {
      pm1: sums.pm1 / count,
      pm25: sums.pm25 / count,
      pm10: sums.pm10 / count,
      temp: sums.temp / count,
      humidity: sums.humidity / count,
      battery: latestReading.battery,
      charging: latestReading.charging,
      timestamp: new Date(), // Use current time (end of averaging window)
      location: latestReading.location,
    };
  }

  /**
   * Clear the buffer
   * Called when recording starts or device disconnects
   */
  clear(): void {
    logger.debug('🧹 Clearing rolling buffer');
    this.buffer = [];
  }

  /**
   * Get current buffer size (for debugging)
   */
  getBufferSize(): number {
    return this.buffer.length;
  }
}

// Export singleton instance
export const rollingBufferService = new RollingBufferService();
