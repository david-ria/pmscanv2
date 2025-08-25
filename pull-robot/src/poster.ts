import Bottleneck from 'bottleneck';
import { config } from './config.js';
import { logger } from './logger.js';
import type { ATMPayload } from './databaseReader.js';

// Rate limiter
const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: Math.floor(1000 / config.polling.maxRps),
});

// Poster metrics
interface PosterMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastRequestTime: string | null;
  lastSuccessTime: string | null;
  lastErrorTime: string | null;
  lastError: string | null;
}

let posterMetrics: PosterMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  lastRequestTime: null,
  lastSuccessTime: null,
  lastErrorTime: null,
  lastError: null,
};

/**
 * Send payload to ATM API
 */
async function sendToATMAPI(payload: ATMPayload, missionId: string, measurementIndex: number): Promise<boolean> {
  const idempotencyKey = `${payload.device_id}|${missionId}|${payload.timestamp}`;
  
  try {
    posterMetrics.totalRequests++;
    posterMetrics.lastRequestTime = new Date().toISOString();

    const response = await limiter.schedule(async () => {
      return fetch(config.dashboard.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.dashboard.bearer}`,
          'User-Agent': 'pull-robot/1.0.0',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      const error = `HTTP ${response.status}: ${errorText}`;
      
      posterMetrics.failedRequests++;
      posterMetrics.lastErrorTime = new Date().toISOString();
      posterMetrics.lastError = error;
      
      logger.error(`❌ Failed to send payload ${measurementIndex} for mission ${missionId}:`, error);
      return false;
    }

    posterMetrics.successfulRequests++;
    posterMetrics.lastSuccessTime = new Date().toISOString();
    
    logger.debug(`✅ Successfully sent payload ${measurementIndex} for mission ${missionId}`);
    return true;
    
  } catch (error) {
    posterMetrics.failedRequests++;
    posterMetrics.lastErrorTime = new Date().toISOString();
    posterMetrics.lastError = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error(`❌ Network error sending payload ${measurementIndex} for mission ${missionId}:`, error);
    return false;
  }
}

/**
 * Get poster metrics
 */
function getPosterMetrics(): PosterMetrics {
  return { ...posterMetrics };
}

/**
 * Check if poster is healthy
 */
function isHealthy(): boolean {
  // Consider healthy if we haven't had errors recently or if we haven't made requests yet
  if (posterMetrics.totalRequests === 0) return true;
  
  const successRate = posterMetrics.successfulRequests / posterMetrics.totalRequests;
  return successRate >= 0.8; // 80% success rate threshold
}

/**
 * Reset poster metrics
 */
function resetPosterMetrics(): void {
  posterMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    lastRequestTime: null,
    lastSuccessTime: null,
    lastErrorTime: null,
    lastError: null,
  };
}

export {
  sendToATMAPI,
  getPosterMetrics,
  isHealthy,
  resetPosterMetrics,
  type PosterMetrics,
};