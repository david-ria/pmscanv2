import { AirBeamConnectionManager } from './connectionManager';
import * as logger from '@/utils/logger';

export const globalConnectionManager = new AirBeamConnectionManager();

let isGlobalRecording = false;
let isBackgroundRecording = false;
let reconnectionInterval: NodeJS.Timeout | null = null;

export const setGlobalRecording = (recording: boolean) => {
  isGlobalRecording = recording;
  logger.debug('🎯 AirBeam global recording state set to:', recording);
};

export const getGlobalRecording = () => isGlobalRecording;

export const setBackgroundRecording = (recording: boolean) => {
  isBackgroundRecording = recording;
  logger.debug('🌙 AirBeam background recording state set to:', recording);

  if (recording) {
    startAutoReconnection();
  } else {
    stopAutoReconnection();
  }
};

export const getBackgroundRecording = () => isBackgroundRecording;

const startAutoReconnection = () => {
  if (reconnectionInterval) return;

  logger.debug(
    '🔄 Starting AirBeam auto-reconnection for background recording'
  );

  reconnectionInterval = setInterval(async () => {
    if (!isBackgroundRecording) return;
    if (!globalConnectionManager.isConnected()) {
      logger.debug(
        '🔄 AirBeam disconnected during background recording, attempting reconnection...'
      );
      try {
        if (globalConnectionManager.shouldAutoConnect()) {
          await globalConnectionManager.connect();
          logger.debug('✅ AirBeam auto-reconnection successful');
        }
      } catch (error) {
        console.warn('⚠️ AirBeam auto-reconnection failed:', error);
      }
    }
  }, 10000);
};

const stopAutoReconnection = () => {
  if (reconnectionInterval) {
    clearInterval(reconnectionInterval);
    reconnectionInterval = null;
    logger.debug('🛑 Stopped AirBeam auto-reconnection');
  }
};
