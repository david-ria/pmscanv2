import Bottleneck from 'bottleneck';
import { logger } from './logger.js';
import type { Config } from './config.js';
import type { ATMPayload } from './databaseReader.js';

// Rate limiter and config
let limiter: Bottleneck | null = null;
let appConfig: Config | null = null;

/**
 * Initialize the poster with configuration
 */
export function initializePoster(config: Config) {
  appConfig = config;
  
  // Initialize rate limiter
  limiter = new Bottleneck({
    maxConcurrent: 1,
    minTime: Math.floor(1000 / config.polling.maxRps),
  });
}

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
export async function sendToATMAPI(payload: ATMPayload): Promise<boolean> {
  if (!limiter || !appConfig) {
    throw new Error('Poster not initialized');
  }
  
  return limiter.schedule(async () => {
    posterMetrics.totalRequests++;
    posterMetrics.lastRequestTime = new Date().toISOString();

    try {
      const response = await fetch(appConfig.dashboard.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${appConfig.dashboard.bearer}`,
          'User-Agent': 'pull-robot/1.0.0',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        const error = `HTTP ${response.status}: ${errorText}`;
        
        posterMetrics.failedRequests++;
        posterMetrics.lastErrorTime = new Date().toISOString();
        posterMetrics.lastError = error;
        
        logger.error(`❌ Failed to send payload to ATM API:`, error);
        return false;
      }

      posterMetrics.successfulRequests++;
      posterMetrics.lastSuccessTime = new Date().toISOString();
      
      logger.debug(`✅ Successfully sent payload to ATM API`);
      return true;
      
    } catch (error) {
      posterMetrics.failedRequests++;
      posterMetrics.lastErrorTime = new Date().toISOString();
      posterMetrics.lastError = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error(`❌ Network error sending payload to ATM API:`, error);
      return false;
    }
  });
}

/**
 * Get poster metrics
 */
export function getPosterMetrics(): PosterMetrics {
  return { ...posterMetrics };
}

/**
 * Check if poster is healthy
 */
export function isHealthy(): boolean {
  // Consider healthy if we haven't had errors recently or if we haven't made requests yet
  if (posterMetrics.totalRequests === 0) return true;
  
  const successRate = posterMetrics.successfulRequests / posterMetrics.totalRequests;
  return successRate >= 0.8; // 80% success rate threshold
}

/**
 * Reset poster metrics
 */
export function resetPosterMetrics(): void {
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

export type { PosterMetrics };