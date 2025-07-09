import { PMScanConnectionManager } from './connectionManager';

// Global singleton instance to persist across component unmounts
export const globalConnectionManager = new PMScanConnectionManager();

// Track if we're currently recording to prevent disconnection during navigation
let isGlobalRecording = false;

export const setGlobalRecording = (recording: boolean) => {
  isGlobalRecording = recording;
  console.log('🎯 Global recording state set to:', recording);
};

export const getGlobalRecording = () => isGlobalRecording;