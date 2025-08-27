import Bottleneck from 'bottleneck';
import { config } from './config.js';
import { logger } from './logger.js';

// Create rate limiter using Bottleneck
const rateLimiter = new Bottleneck({
  maxConcurrent: config.rateLimiting.maxConcurrentRequests,
  minTime: Math.floor(1000 / config.rateLimiting.maxRequestsPerSecond),
});

// Enhanced metrics tracking
let totalRequests = 0;
let successfulRequests = 0;
let retryableFailures = 0;
let nonRetryableFailures = 0;
let totalRetries = 0;

export interface PosterMetrics {
  poster_requests_total: number;
  poster_success_total: number;
  poster_retryable_fail_total: number;
  poster_nonretryable_fail_total: number;
  poster_retries_total: number;
  rps_configured: number;
}

// Post payload to API
export async function postPayload(
  payload: any, 
  fileId: number,
  rowIndex: number,
  retryCount: number = 0, 
  idempotencyKey?: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    // Transform to ATM format
    const atmPayload = {
      idSensor: payload.device_id || "PMScan3376DF",
      time: new Date(payload.ts).getTime(),
      data: {
        pm1: { value: payload.metrics.PM1 || 0, unit: "ugm3" },
        pm25: { value: payload.metrics["PM2.5"] || 0, unit: "ugm3" },
        pm10: { value: payload.metrics.PM10 || 0, unit: "ugm3" },
        ...(payload.metrics.latitude && {
          latitude: { value: payload.metrics.latitude, unit: "degrees" }
        }),
        ...(payload.metrics.longitude && {
          longitude: { value: payload.metrics.longitude, unit: "degrees" }
        })
      }
    };
    
    logger.debug('Posting ATM payload:', { 
      idSensor: atmPayload.idSensor,
      time: atmPayload.time, 
      idempotencyKey,
      attempt: retryCount + 1 
    });
    
    const result = await rateLimiter.schedule(() => makeAPIRequest(atmPayload, idempotencyKey));
    
    totalRequests++;
    
    if (result.success) {
      successfulRequests++;
      logger.debug('Payload sent successfully');
    } else {
      const isRetryable = isRetryableError(result.status);
      
      if (isRetryable && retryCount < config.retry.maxRetries) {
        totalRetries++;
        const delay = Math.min(
          config.retry.delayMs * Math.pow(config.retry.backoffMultiplier, retryCount),
          30000
        );
        logger.info(`Retryable error ${result.status}, retrying in ${delay}ms (attempt ${retryCount + 2}/${config.retry.maxRetries + 1})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return postPayload(payload, fileId, rowIndex, retryCount + 1, idempotencyKey);
        
      } else if (isRetryable) {
        retryableFailures++;
        logger.warn('Retries exhausted:', { fileId, rowIndex, status: result.status });
      } else {
        nonRetryableFailures++;
        logger.warn('Non-retryable error:', { fileId, rowIndex, status: result.status });
      }
    }
    
    return result;
    
  } catch (error: any) {
    logger.error('Error posting payload:', { error: error?.message, attempt: retryCount + 1 });
    
    if (retryCount < config.retry.maxRetries) {
      totalRetries++;
      const delay = Math.min(
        config.retry.delayMs * Math.pow(config.retry.backoffMultiplier, retryCount),
        30000
      );
      logger.info(`Retrying in ${delay}ms (attempt ${retryCount + 2}/${config.retry.maxRetries + 1})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return postPayload(payload, fileId, rowIndex, retryCount + 1, idempotencyKey);
    }
    
    totalRequests++;
    retryableFailures++;
    
    return {
      success: false,
      error: error?.message || 'Unknown error',
    };
  }
}

// Make the actual HTTP request
async function makeAPIRequest(
  payload: any, 
  idempotencyKey?: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.dashboard.bearer}`,
      'User-Agent': 'pull-robot/1.0.0',
    };
    
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.retry.timeoutMs);
    
    let response: Response;
    try {
      response = await fetch(config.dashboard.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } finally {
      clearTimeout(timeoutId);
    }
    
    const requestTime = Date.now() - startTime;
    let responseBody = '';
    
    try {
      responseBody = await response.text();
    } catch (e) {
      responseBody = 'Unable to read response body';
    }

    if (response.ok) {
      logger.info('✅ ATM API SUCCESS:', { 
        status: response.status, 
        responseBody,
        idempotencyKey,
        idSensor: payload.idSensor,
        time: requestTime + 'ms'
      });
      
      return {
        success: true,
        status: response.status,
      };
    } else {
      logger.error('❌ ATM API FAILURE:', { 
        status: response.status,
        statusText: response.statusText,
        responseBody,
        idempotencyKey,
        idSensor: payload.idSensor,
        requestTime: requestTime + 'ms',
        isRetryable: isRetryableError(response.status)
      });
      
      return {
        success: false,
        status: response.status,
        error: `HTTP ${response.status}: ${response.statusText} - ${responseBody}`,
      };
    }
    
  } catch (error: any) {
    const requestTime = Date.now() - startTime;
    
    logger.error('🔥 ATM API EXCEPTION:', { 
      error: error?.message || 'Unknown error',
      requestTime: requestTime + 'ms',
      idSensor: payload.idSensor,
      idempotencyKey 
    });
    
    return {
      success: false,
      error: error?.message || 'Network error',
    };
  }
}

// Check if HTTP status code is retryable
function isRetryableError(status?: number): boolean {
  if (!status) return true;
  return status === 429 || (status >= 500 && status < 600);
}

// Get poster metrics
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

// Health check for the poster
export function isHealthy(): boolean {
  const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100;
  return totalRequests < 10 || successRate >= 80;
}