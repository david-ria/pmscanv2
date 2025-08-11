/**
 * One-time fix for corrupted ALERT_SETTINGS data
 */

import { STORAGE_KEYS } from '@/lib/versionedStorage';
import * as logger from '@/utils/logger';

export function clearCorruptedAlertSettings(): void {
  try {
    // Clear both old and new storage keys for ALERT_SETTINGS
    const keysToCheck = [
      'alertSettings',
      'alertSettings_v3',
      STORAGE_KEYS.ALERT_SETTINGS
    ];
    
    keysToCheck.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        logger.info(`Cleared corrupted alert settings from key: ${key}`);
      }
    });
    
    logger.info('Alert settings cleanup completed');
  } catch (error) {
    logger.error('Failed to clear corrupted alert settings:', error);
  }
}

// Auto-run the fix once
if (typeof window !== 'undefined') {
  clearCorruptedAlertSettings();
}