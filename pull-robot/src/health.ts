import Fastify from 'fastify';
import { config } from './config.js';
import { createLogger } from './logger.js';
import { getProcessingState, testDatabaseConnection } from './state.js';
import { testSupabaseConnection } from './supabase.js';
import { getPosterMetrics, getRateLimitingStats, isHealthy as isPosterHealthy } from './poster.js';
import type { HealthResponse, MetricsResponse } from './types.js';

const logger = createLogger('health');
const fastify = Fastify({ logger: false });

const startTime = Date.now();
const version = '1.0.0'; // Could be loaded from package.json

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  try {
    const processingState = await getProcessingState();
    const dbConnected = await testDatabaseConnection();
    const supabaseConnected = await testSupabaseConnection();
    
    const isHealthy = dbConnected && supabaseConnected && isPosterHealthy();
    
    const healthResponse: HealthResponse = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version,
      uptime: Date.now() - startTime,
      database: {
        connected: dbConnected,
      },
      supabase: {
        connected: supabaseConnected,
      },
      processing: processingState,
    };
    
    reply
      .status(isHealthy ? 200 : 503)
      .header('Content-Type', 'application/json')
      .send(healthResponse);
      
  } catch (error) {
    logger.error('Health check failed:', error);
    reply
      .status(503)
      .header('Content-Type', 'application/json')
      .send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
  }
});

// Metrics endpoint with comprehensive poster metrics
fastify.get('/metrics', async (request, reply) => {
  try {
    const processingState = await getProcessingState();
    const posterMetrics = getPosterMetrics();
    const rateLimitingStats = getRateLimitingStats();
    
    const metricsResponse: MetricsResponse = {
      ...processingState,
      rateLimiting: {
        currentRPS: rateLimitingStats.currentRPS,
        averageRPS: rateLimitingStats.averageRPS,
        queueSize: rateLimitingStats.queueSize,
      },
      poster: posterMetrics,
    };
    
    reply
      .status(200)
      .header('Content-Type', 'application/json')
      .send(metricsResponse);
      
  } catch (error) {
    logger.error('Metrics fetch failed:', error);
    reply
      .status(500)
      .header('Content-Type', 'application/json')
      .send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
  }
});

// Prometheus text/plain metrics endpoint
fastify.get('/metrics.txt', async (request, reply) => {
  try {
    const processingState = await getProcessingState();
    const posterMetrics = getPosterMetrics();
    const rateLimitingStats = getRateLimitingStats();
    
    const prometheusText = `# HELP files_processed_total Total number of files processed
# TYPE files_processed_total counter
files_processed_total ${processingState.filesProcessed}

# HELP rows_processed_total Total number of rows processed
# TYPE rows_processed_total counter
rows_processed_total ${processingState.rowsProcessed}

# HELP rows_sent_total Total number of rows successfully sent
# TYPE rows_sent_total counter
rows_sent_total ${processingState.rowsSent}

# HELP rows_failed_total Total number of rows failed
# TYPE rows_failed_total counter
rows_failed_total ${processingState.rowsFailed}

# HELP dead_letter_count Current number of entries in dead letter queue
# TYPE dead_letter_count gauge
dead_letter_count ${processingState.deadLetterCount}

# HELP poster_requests_total Total HTTP requests made by poster
# TYPE poster_requests_total counter
poster_requests_total ${posterMetrics.poster_requests_total}

# HELP poster_success_total Total successful HTTP requests
# TYPE poster_success_total counter
poster_success_total ${posterMetrics.poster_success_total}

# HELP poster_retryable_fail_total Total retryable failures (429, 5xx)
# TYPE poster_retryable_fail_total counter
poster_retryable_fail_total ${posterMetrics.poster_retryable_fail_total}

# HELP poster_nonretryable_fail_total Total non-retryable failures (4xx except 429)
# TYPE poster_nonretryable_fail_total counter
poster_nonretryable_fail_total ${posterMetrics.poster_nonretryable_fail_total}

# HELP poster_retries_total Total number of retries attempted
# TYPE poster_retries_total counter
poster_retries_total ${posterMetrics.poster_retries_total}

# HELP rps_configured Configured requests per second limit
# TYPE rps_configured gauge
rps_configured ${posterMetrics.rps_configured}

# HELP current_rps Current requests per second
# TYPE current_rps gauge
current_rps ${rateLimitingStats.currentRPS}

# HELP queue_size Current rate limiter queue size
# TYPE queue_size gauge
queue_size ${rateLimitingStats.queueSize}
`;
    
    reply
      .status(200)
      .header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
      .send(prometheusText);
      
  } catch (error) {
    logger.error('Prometheus metrics fetch failed:', error);
    reply
      .status(500)
      .header('Content-Type', 'text/plain')
      .send(`# ERROR: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }
});

// Configuration endpoint
fastify.get('/config', async (request, reply) => {
  try {
    const configInfo = {
      ENABLED: true, // Always true if server is running
      ALLOW_DEVICE_IDS: config.deviceResolution.allowList,
      UNKNOWN_DEVICE_BEHAVIOR: config.deviceResolution.unknownBehavior,
      UNKNOWN_MAPPING_BEHAVIOR: config.deviceResolution.unknownMappingBehavior,
      DASHBOARD_ENDPOINT: config.api.url,
      DASHBOARD_BEARER: '***masked***',
      INCLUDE_METRICS: config.metrics.include,
      UNITS_JSON: config.metrics.units,
      SUPABASE_BUCKET: config.storage.bucket,
      SUPABASE_PREFIX: config.storage.pathPrefix,
      POLL_INTERVAL_MS: config.polling.intervalMs,
      RATE_MAX_RPS: config.rateLimiting.maxRequestsPerSecond,
    };
    
    reply
      .status(200)
      .header('Content-Type', 'application/json')
      .send(configInfo);
      
  } catch (error) {
    logger.error('Config fetch failed:', error);
    reply
      .status(500)
      .header('Content-Type', 'application/json')
      .send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
  }
});

// Start the health server
export async function startHealthServer(): Promise<void> {
  try {
    const port = Number(process.env.PORT || config.health.port);
    await fastify.listen({ 
      port, 
      host: '0.0.0.0' // Allow external connections for Docker
    });
    logger.info(`Health server listening on port ${port}`);
  } catch (error) {
    logger.error('Failed to start health server:', error);
    throw error;
  }
}