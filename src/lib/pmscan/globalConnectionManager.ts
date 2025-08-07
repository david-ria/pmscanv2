import { PMScanConnectionManager } from './connectionManager';
import * as logger from '@/utils/logger';

// Global singleton instance to persist across component unmounts
export const globalConnectionManager = new PMScanConnectionManager();

// Track if we're currently recording to prevent disconnection during navigation
let isGlobalRecording = false;
let isBackgroundRecording = false;
let reconnectionInterval: NodeJS.Timeout | null = null;

export const setGlobalRecording = (recording: boolean) => {
  isGlobalRecording = recording;
  logger.debug('🎯 Global recording state set to:', recording);
  
  // Enable/disable auto-reconnection based on any recording activity
  if (recording || isBackgroundRecording) {
    startAutoReconnection();
  } else if (!recording && !isBackgroundRecording) {
    stopAutoReconnection();
  }
};

export const getGlobalRecording = () => isGlobalRecording;

export const setBackgroundRecording = (recording: boolean) => {
  isBackgroundRecording = recording;
  logger.debug('🌙 Background recording state set to:', recording);

  // Enable/disable auto-reconnection based on any recording activity
  if (recording || isGlobalRecording) {
    startAutoReconnection();
  } else if (!recording && !isGlobalRecording) {
    stopAutoReconnection();
  }
};

export const getBackgroundRecording = () => isBackgroundRecording;

// Auto-reconnection for any recording session with aggressive background handling
const startAutoReconnection = () => {
  if (reconnectionInterval) return;

  logger.debug('🔄 Starting PMScan auto-reconnection for recording session');

  reconnectionInterval = setInterval(async () => {
    if (!isBackgroundRecording && !isGlobalRecording) return;

    // Check if we're still connected
    if (!globalConnectionManager.isConnected()) {
      logger.debug(
        '🔄 PMScan disconnected during recording, attempting reconnection...'
      );

      try {
        // Try to reconnect
        if (globalConnectionManager.shouldAutoConnect()) {
          await globalConnectionManager.connect();
          logger.debug('✅ PMScan auto-reconnection successful');
        }
      } catch (error) {
        console.warn('⚠️ PMScan auto-reconnection failed:', error);
      }
    } else {
      // Even if connected, ping the device to keep the connection alive
      // This helps prevent browser throttling from affecting the connection
      try {
        await globalConnectionManager.keepAlive();
      } catch (error) {
        logger.debug('🔄 Keep-alive failed, connection may have been lost');
      }
    }
  }, 5000); // Check more frequently (every 5 seconds) for better responsiveness
};

const stopAutoReconnection = () => {
  if (reconnectionInterval) {
    clearInterval(reconnectionInterval);
    reconnectionInterval = null;
    logger.debug('🛑 Stopped PMScan auto-reconnection');
  }
};
