import { PMScanConnectionManager } from './connectionManager';

// Global singleton instance to persist across component unmounts
export const globalConnectionManager = new PMScanConnectionManager();

// Track if we're currently recording to prevent disconnection during navigation
let isGlobalRecording = false;
let isBackgroundRecording = false;
let reconnectionInterval: NodeJS.Timeout | null = null;

export const setGlobalRecording = (recording: boolean) => {
  isGlobalRecording = recording;
  console.log('🎯 Global recording state set to:', recording);
};

export const getGlobalRecording = () => isGlobalRecording;

export const setBackgroundRecording = (recording: boolean) => {
  isBackgroundRecording = recording;
  console.log('🌙 Background recording state set to:', recording);
  
  if (recording) {
    startAutoReconnection();
  } else {
    stopAutoReconnection();
  }
};

export const getBackgroundRecording = () => isBackgroundRecording;

// Auto-reconnection for background recording
const startAutoReconnection = () => {
  if (reconnectionInterval) return;
  
  console.log('🔄 Starting PMScan auto-reconnection for background recording');
  
  reconnectionInterval = setInterval(async () => {
    if (!isBackgroundRecording) return;
    
    // Check if we're still connected
    if (!globalConnectionManager.isConnected()) {
      console.log('🔄 PMScan disconnected during background recording, attempting reconnection...');
      
      try {
        // Try to reconnect
        if (globalConnectionManager.shouldAutoConnect()) {
          await globalConnectionManager.connect();
          console.log('✅ PMScan auto-reconnection successful');
        }
      } catch (error) {
        console.warn('⚠️ PMScan auto-reconnection failed:', error);
      }
    }
  }, 10000); // Check every 10 seconds
};

const stopAutoReconnection = () => {
  if (reconnectionInterval) {
    clearInterval(reconnectionInterval);
    reconnectionInterval = null;
    console.log('🛑 Stopped PMScan auto-reconnection');
  }
};
