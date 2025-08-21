import Bottleneck from 'bottleneck';
import { config } from './config.js';
import { createLogger } from './logger.js';
import { APIPayloadSchema, type APIPayload } from './types.js';

const logger = createLogger('poster');

// Create rate limiter using Bottleneck
const rateLimiter = new Bottleneck({
  maxConcurrent: config.rateLimiting.maxConcurrentRequests,
  minTime: Math.floor(1000 / config.rateLimiting.maxRequestsPerSecond), // Convert RPS to min time between requests
  reservoir: config.rateLimiting.maxRequestsPerSecond, // Allow burst up to max RPS
  reservoirRefreshAmount: config.rateLimiting.maxRequestsPerSecond,
  reservoirRefreshInterval: 1000, // Refill every second
});

// Track statistics
let totalRequests = 0;
let successfulRequests = 0;
let failedRequests = 0;
const requestTimes: number[] = [];

// Post payload to external API with retries and idempotency key
export async function postPayload(
  payload: APIPayload, 
  retryCount: number = 0, 
  idempotencyKey?: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    // Validate payload structure
    const validatedPayload = APIPayloadSchema.parse(payload);
    
    logger.debug('Posting grouped payload:', { 
      deviceId: validatedPayload.device_id,
      missionId: validatedPayload.mission_id, 
      timestamp: validatedPayload.ts, 
      idempotencyKey,
      attempt: retryCount + 1 
    });
    
    // Use rate limiter to control request rate
    const result = await rateLimiter.schedule(() => makeAPIRequest(validatedPayload, idempotencyKey));
    
    totalRequests++;
    if (result.success) {
      successfulRequests++;
    } else {
      failedRequests++;
    }
    
    return result;
    
  } catch (error) {
    logger.error('Error posting grouped payload:', { payload, error, attempt: retryCount + 1 });
    
    // Retry logic with exponential backoff
    if (retryCount < config.retry.maxRetries) {
      const delay = config.retry.delayMs * Math.pow(config.retry.backoffMultiplier, retryCount);
      logger.info(`Retrying in ${delay}ms (attempt ${retryCount + 2}/${config.retry.maxRetries + 1})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return postPayload(payload, retryCount + 1, idempotencyKey);
    }
    
    totalRequests++;
    failedRequests++;
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Make the actual HTTP request with idempotency key
async function makeAPIRequest(
  payload: APIPayload, 
  idempotencyKey?: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.api.key}`,
      'User-Agent': 'pull-robot/1.0.0',
    };
    
    // Add idempotency key header if provided
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    
    const response = await fetch(config.api.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    
    const requestTime = Date.now() - startTime;
    requestTimes.push(requestTime);
    
    // Keep only last 100 request times for averaging
    if (requestTimes.length > 100) {
      requestTimes.shift();
    }
    
    if (response.ok) {
      logger.debug('API request successful:', { 
        status: response.status, 
        time: requestTime,
        deviceId: payload.device_id,
        idempotencyKey 
      });
      
      return {
        success: true,
        status: response.status,
      };
    } else {
      const errorText = await response.text().catch(() => 'Unable to read response');
      
      logger.warn('API request failed:', { 
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        deviceId: payload.device_id,
        idempotencyKey 
      });
      
      return {
        success: false,
        status: response.status,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
    
  } catch (error) {
    const requestTime = Date.now() - startTime;
    requestTimes.push(requestTime);
    
    logger.error('API request failed with exception:', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      time: requestTime,
      deviceId: payload.device_id,
      idempotencyKey 
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Get rate limiting statistics
export function getRateLimitingStats(): {
  currentRPS: number;
  averageRPS: number;
  queueSize: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  averageResponseTime: number;
} {
  const queueSize = rateLimiter.queued() + rateLimiter.running();
  const averageResponseTime = requestTimes.length > 0 
    ? requestTimes.reduce((a, b) => a + b, 0) / requestTimes.length 
    : 0;
  
  // Calculate current RPS (approximate based on recent activity)
  const recentRequests = requestTimes.slice(-10); // Last 10 requests
  const currentRPS = recentRequests.length > 1 ? 1000 / (averageResponseTime || 100) : 0;
  
  return {
    currentRPS: Math.round(currentRPS * 100) / 100,
    averageRPS: Math.round((successfulRequests / Math.max(1, Date.now() / 1000)) * 100) / 100,
    queueSize,
    totalRequests,
    successfulRequests,
    failedRequests,
    successRate: totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 10000) / 100 : 0,
    averageResponseTime: Math.round(averageResponseTime * 100) / 100,
  };
}

// Health check for the poster
export function isHealthy(): boolean {
  const stats = getRateLimitingStats();
  
  // Consider healthy if:
  // 1. Success rate is above 80% OR we haven't made enough requests to judge
  // 2. Queue size is not extremely large (< 1000)
  const hasGoodSuccessRate = stats.totalRequests < 10 || stats.successRate >= 80;
  const hasReasonableQueue = stats.queueSize < 1000;
  
  return hasGoodSuccessRate && hasReasonableQueue;
}
