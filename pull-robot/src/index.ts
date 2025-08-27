import { logger } from './logger.js';
import { config } from './config.js';
import fastify from 'fastify';
import { startDatabaseProcessor, stopDatabaseProcessor, getProcessorStatus } from './databaseProcessor.js';
import { testDatabaseConnection } from './databasePoller.js';
import { getPosterMetrics, isHealthy } from './poster.js';

async function main() {
  logger.info('🤖 Pull Robot starting up...');
  logger.info('📋 Configuration loaded:', {
    supabase: config.supabase.url,
    dashboard: config.dashboard.endpoint,
    polling: config.polling,
    processing: config.processing,
  });

  // Create Fastify server
  const server = fastify({
    logger: false, // Use our custom logger instead
  });

  try {
    // Test configuration and connections
    logger.info('🔧 Testing database connection...');
    const dbConnected = await testDatabaseConnection();
    
    if (!dbConnected) {
      logger.error('❌ Database connection failed - exiting');
      process.exit(1);
    }
    
    // Start the database processor
    logger.info('🚀 Starting services...');
    startDatabaseProcessor();

    // Health check endpoint
    server.get('/health', async (request, reply) => {
      const processorStatus = getProcessorStatus();
      const posterMetrics = getPosterMetrics();
      const healthy = isHealthy();

      const healthData = {
        status: healthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        processor: processorStatus,
        poster: posterMetrics,
        memory: process.memoryUsage(),
      };

      reply.code(healthy ? 200 : 503).send(healthData);
    });

    // Metrics endpoint
    server.get('/metrics', async (request, reply) => {
      const processorStatus = getProcessorStatus();
      const posterMetrics = getPosterMetrics();

      const metrics = {
        timestamp: new Date().toISOString(),
        processor: processorStatus,
        poster: posterMetrics,
      };

      reply.send(metrics);
    });

    // Start the server
    await server.listen({ 
      port: config.server.port, 
      host: '0.0.0.0' 
    });

    logger.info(`✅ Health server running on port ${config.server.port}`);
    logger.info('🚀 Pull Robot is running!');
    logger.info(`📊 Health endpoint: http://localhost:${config.server.port}/health`);
    logger.info(`📈 Metrics endpoint: http://localhost:${config.server.port}/metrics`);

  } catch (error) {
    logger.error('💥 Failed to start Pull Robot:', error);
    process.exit(1);
  }

  // Graceful shutdown
  const gracefulShutdown = (signal: string) => {
    logger.info(`🛑 Received ${signal}, shutting down gracefully...`);
    
    // Stop the database processor
    stopDatabaseProcessor();
    
    server.close((err) => {
      if (err) {
        logger.error('Error during server shutdown:', err);
        process.exit(1);
      }
      
      logger.info('✅ Server closed successfully');
      process.exit(0);
    });
  };

  // Register signal handlers
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  // Handle uncaught exceptions and unhandled rejections
  process.on('uncaughtException', (error) => {
    logger.error('💥 Uncaught exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('💥 Unhandled rejection:', reason);
    process.exit(1);
  });
}

// Start the application
main().catch((error) => {
  logger.error('💥 Bootstrap failed:', error);
  process.exit(1);
});