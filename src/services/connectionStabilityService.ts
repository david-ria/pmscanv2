import { globalConnectionManager } from '@/lib/pmscan/globalConnectionManager';
import * as logger from '@/utils/logger';

class ConnectionStabilityService {
  private static instance: ConnectionStabilityService;
  private stabilityInterval: NodeJS.Timeout | null = null;
  private reconnectionAttempts = 0;
  private maxReconnectionAttempts = 5;
  private isActive = false;
  private lastConnectionCheck = 0;
  private connectionCheckThrottle = 3000; // 3 seconds

  static getInstance(): ConnectionStabilityService {
    if (!ConnectionStabilityService.instance) {
      ConnectionStabilityService.instance = new ConnectionStabilityService();
    }
    return ConnectionStabilityService.instance;
  }

  /**
   * Start enhanced connection stability monitoring
   */
  startStabilityMonitoring(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.reconnectionAttempts = 0;
    logger.debug('🔗 Starting enhanced connection stability monitoring');

    // Clear any existing interval
    if (this.stabilityInterval) {
      clearInterval(this.stabilityInterval);
    }

    // Set up aggressive connection monitoring
    this.stabilityInterval = setInterval(async () => {
      await this.performStabilityCheck();
    }, 2000); // Check every 2 seconds for maximum responsiveness

    // Also set up page visibility monitoring for additional stability
    this.setupVisibilityMonitoring();
  }

  /**
   * Stop stability monitoring
   */
  stopStabilityMonitoring(): void {
    if (!this.isActive) return;

    this.isActive = false;
    logger.debug('🔗 Stopping connection stability monitoring');

    if (this.stabilityInterval) {
      clearInterval(this.stabilityInterval);
      this.stabilityInterval = null;
    }

    this.reconnectionAttempts = 0;
    this.cleanup();
  }

  /**
   * Perform comprehensive stability check
   */
  private async performStabilityCheck(): Promise<void> {
    if (!this.isActive) return;

    const now = Date.now();
    
    // Throttle connection checks to prevent excessive calls
    if (now - this.lastConnectionCheck < this.connectionCheckThrottle) {
      return;
    }

    this.lastConnectionCheck = now;

    try {
      // Check if we should be connected but aren't
      const shouldBeConnected = globalConnectionManager.shouldAutoConnect();
      const isConnected = globalConnectionManager.isConnected();

      if (shouldBeConnected && !isConnected) {
        logger.debug('🔗 Connection stability: Device should be connected but isn\'t');
        await this.attemptReconnection();
      } else if (isConnected) {
        // Test connection health with keep-alive
        const isHealthy = await globalConnectionManager.keepAlive();
        
        if (!isHealthy) {
          logger.debug('🔗 Connection stability: Keep-alive failed, connection may be unstable');
          await this.attemptReconnection();
        } else {
          // Reset reconnection attempts on successful health check
          this.reconnectionAttempts = 0;
        }
      }
    } catch (error) {
      logger.debug('🔗 Connection stability check failed:', error);
    }
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private async attemptReconnection(): Promise<void> {
    if (this.reconnectionAttempts >= this.maxReconnectionAttempts) {
      logger.debug('🔗 Max reconnection attempts reached, pausing...');
      
      // Reset after a longer pause
      setTimeout(() => {
        this.reconnectionAttempts = 0;
        logger.debug('🔗 Reconnection attempts reset');
      }, 30000); // 30 seconds pause
      
      return;
    }

    this.reconnectionAttempts++;
    
    try {
      logger.debug(`🔗 Attempting reconnection (attempt ${this.reconnectionAttempts}/${this.maxReconnectionAttempts})`);
      
      await globalConnectionManager.connect();
      
      logger.debug('✅ Reconnection successful');
      this.reconnectionAttempts = 0; // Reset on success
      
    } catch (error) {
      const backoffDelay = Math.min(1000 * Math.pow(2, this.reconnectionAttempts - 1), 10000);
      logger.debug(`⚠️ Reconnection failed, retrying in ${backoffDelay}ms:`, error);
      
      // Wait before next attempt
      setTimeout(() => {
        // Will be handled by next stability check
      }, backoffDelay);
    }
  }

  /**
   * Set up page visibility monitoring for additional stability
   */
  private setupVisibilityMonitoring(): void {
    const handleVisibilityChange = () => {
      if (this.isActive && !document.hidden) {
        // When page becomes visible, immediately check connection
        setTimeout(() => {
          this.performStabilityCheck();
        }, 1000);
      }
    };

    const handlePageShow = () => {
      if (this.isActive) {
        // When page is shown, perform immediate stability check
        setTimeout(() => {
          this.performStabilityCheck();
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    // Store cleanup functions
    this.cleanupVisibilityListeners = () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }

  private cleanupVisibilityListeners: (() => void) | null = null;

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.cleanupVisibilityListeners) {
      this.cleanupVisibilityListeners();
      this.cleanupVisibilityListeners = null;
    }
  }

  /**
   * Force immediate connection check (public method for external triggers)
   */
  forceConnectionCheck(): void {
    if (this.isActive) {
      this.lastConnectionCheck = 0; // Reset throttle
      this.performStabilityCheck();
    }
  }

  /**
   * Get current status
   */
  getStatus(): {
    isActive: boolean;
    reconnectionAttempts: number;
    maxReconnectionAttempts: number;
  } {
    return {
      isActive: this.isActive,
      reconnectionAttempts: this.reconnectionAttempts,
      maxReconnectionAttempts: this.maxReconnectionAttempts,
    };
  }
}

// Export singleton instance
export const connectionStabilityService = ConnectionStabilityService.getInstance();

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    connectionStabilityService.stopStabilityMonitoring();
  });
}
