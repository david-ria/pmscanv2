import { config } from './config.js';
import { logger } from './logger.js';

export interface ATMPayload {
  device: string;
  timestamp: string;
  values: {
    pm1?: number;
    pm25?: number;
    pm10?: number;
    latitude?: number;
    longitude?: number;
  };
  units: {
    pm1?: string;
    pm25?: string;
    pm10?: string;
    latitude?: string;
    longitude?: string;
  };
}

export async function postToATM(payload: ATMPayload): Promise<boolean> {
  try {
    logger.info(`📤 Posting to ATM API: ${payload.device} at ${payload.timestamp}`);
    
    const response = await fetch(config.dashboard.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.dashboard.bearer}`
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      logger.info(`✅ Successfully posted to ATM API (${response.status})`);
      return true;
    } else {
      const errorText = await response.text();
      logger.error(`❌ ATM API returned error ${response.status}: ${errorText}`);
      return false;
    }
  } catch (error) {
    logger.error('❌ Network error posting to ATM API:', error);
    return false;
  }
}