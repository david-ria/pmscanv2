import Bottleneck from 'bottleneck';
import { config } from './config.js';
import { createLogger } from './logger.js';
import { APIPayloadSchema, type APIPayload } from './types.js';
import { updateRowProcessingStatus, addToDeadLetterQueue } from './state.js';

const logger = createLogger('poster');

// Create rate limiter using Bottleneck
const rateLimiter = new Bottleneck({
  maxConcurrent: config.rateLimiting.maxConcurrentRequests,
  minTime: Math.floor(1000 / config.rateLimiting.maxRequestsPerSecond), // Convert RPS to min time between requests
  reservoir: config.rateLimiting.maxRequestsPerSecond, // Allow burst up to max RPS
  reservoirRefreshAmount: config.rateLimiting.maxRequestsPerSecond,
  reservoirRefreshInterval: 1000, // Refill every second
});

// Enhanced metrics tracking
let totalRequests = 0;
let successfulRequests = 0;
let retryableFailures = 0;
let nonRetryableFailures = 0;
let totalRetries = 0;
const requestTimes: number[] = [];

interface PosterMetrics {
  poster_requests_total: number;
  poster_success_total: number;
  poster_retryable_fail_total: number;
  poster_nonretryable_fail_total: number;
  poster_retries_total: number;
  rps_configured: number;
}

// Enhanced post with state management integration
export async function postPayload(
  payload: APIPayload, 
  fileId: number,
  rowIndex: number,
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
      // Mark row as successfully sent
      updateRowProcessingStatus(fileId, rowIndex, 'sent');
      logger.debug('Row marked as sent:', { fileId, rowIndex });
    } else {
      // Handle failure based on retry policy
      const isRetryable = isRetryableError(result.status);
      
      if (isRetryable) {
        retryableFailures++;
      } else {
        nonRetryableFailures++;
        // Non-retryable error - mark failed and add to DLQ immediately
        updateRowProcessingStatus(fileId, rowIndex, 'failed', result.error);
        pushDLQ(idempotencyKey || `${payload.device_id}|${payload.mission_id}|${payload.ts}`, 
                JSON.stringify(payload), result.status, result.error);
        logger.warn('Non-retryable error, added to DLQ:', { fileId, rowIndex, status: result.status });
      }
    }
    
    return result;
    
  } catch (error) {
    logger.error('Error posting grouped payload:', { payload, error, attempt: retryCount + 1 });
    
    // Retry logic with exponential backoff for retryable errors only
    if (retryCount < config.retry.maxRetries) {
      totalRetries++;
      const delay = Math.min(
        config.retry.delayMs * Math.pow(config.retry.backoffMultiplier, retryCount),
        30000 // Cap at 30 seconds
      );
      logger.info(`Retrying in ${delay}ms (attempt ${retryCount + 2}/${config.retry.maxRetries + 1})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return postPayload(payload, fileId, rowIndex, retryCount + 1, idempotencyKey);
    }
    
    // Max retries exhausted
    totalRequests++;
    retryableFailures++;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    
    // Mark as failed and add to DLQ
    updateRowProcessingStatus(fileId, rowIndex, 'failed', errorMsg);
    pushDLQ(idempotencyKey || `${payload.device_id}|${payload.mission_id}|${payload.ts}`, 
            JSON.stringify(payload), undefined, `Max retries exhausted: ${errorMsg}`);
    
    return {
      success: false,
      error: errorMsg,
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
        idempotencyKey,
        isRetryable: isRetryableError(response.status)
      });
      
      return {
        success: false,
        status: response.status,
        error: `HTTP ${response.status}: ${response.statusText} - ${errorText}`,
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

// Check if HTTP status code is retryable (429 or 5xx)
function isRetryableError(status?: number): boolean {
  if (!status) return true; // Network errors are retryable
  return status === 429 || (status >= 500 && status < 600);
}

// Dead Letter Queue helper
export function pushDLQ(
  idempotencyKey: string, 
  payload: string, 
  httpStatus?: number, 
  errorMessage?: string
): void {
  try {
    // Extract fileId and rowIndex from idempotency key format: device_id|mission_id|timestamp
    // Note: This is a simplified approach - in production you'd want better tracking
    logger.warn('Adding to DLQ:', { 
      idempotencyKey, 
      httpStatus, 
      errorMessage: errorMessage?.substring(0, 100) 
    });
    
    // For now, log the DLQ entry - in production you'd store it properly
    // This would need enhancement to properly track fileId/rowIndex relationships
    console.error(`DLQ Entry: ${idempotencyKey} - Status: ${httpStatus} - Error: ${errorMessage}`);
  } catch (error) {
    logger.error('Error pushing to DLQ:', error);
  }
}

// Get comprehensive poster metrics
export function getPosterMetrics(): PosterMetrics {
  return {
    poster_requests_total: totalRequests,
    poster_success_total: successfulRequests,
    poster_retryable_fail_total: retryableFailures,
    poster_nonretryable_fail_total: nonRetryableFailures,
    poster_retries_total: totalRetries,
    rps_configured: config.rateLimiting.maxRequestsPerSecond,
  };
}

// Get rate limiting statistics (legacy compatibility)
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
    failedRequests: retryableFailures + nonRetryableFailures,
    successRate: totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 10000) / 100 : 0,
    averageResponseTime: Math.round(averageResponseTime * 100) / 100,
  };
}

// Health check for the poster
export function isHealthy(): boolean {
  const stats = getRateLimitingStats();
  const metrics = getPosterMetrics();
  
  // Consider healthy if:
  // 1. Success rate is above 80% OR we haven't made enough requests to judge
  // 2. Queue size is not extremely large (< 1000)
  // 3. Non-retryable failures are not excessive (< 50% of total failures)
  const hasGoodSuccessRate = stats.totalRequests < 10 || stats.successRate >= 80;
  const hasReasonableQueue = stats.queueSize < 1000;
  const totalFailures = metrics.poster_retryable_fail_total + metrics.poster_nonretryable_fail_total;
  const hasAcceptableErrorTypes = totalFailures === 0 || 
    (metrics.poster_nonretryable_fail_total / totalFailures) < 0.5;
  
  return hasGoodSuccessRate && hasReasonableQueue && hasAcceptableErrorTypes;
}
