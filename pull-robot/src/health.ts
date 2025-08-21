import Fastify from 'fastify';
import { config } from './config.js';
import { createLogger } from './logger.js';
import { getProcessingState, testDatabaseConnection } from './state.js';
import { testSupabaseConnection } from './supabase.js';
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
    
    const isHealthy = dbConnected && supabaseConnected;
    
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

// Metrics endpoint with more detailed information
fastify.get('/metrics', async (request, reply) => {
  try {
    const processingState = await getProcessingState();
    
    // TODO: Add rate limiting metrics when poster.ts is implemented
    const metricsResponse: MetricsResponse = {
      ...processingState,
      rateLimiting: {
        currentRPS: 0, // Will be implemented with bottleneck integration
        averageRPS: 0,
        queueSize: 0,
      },
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