import { logger } from './logger.js';
import fastify from 'fastify';
import { startDatabaseProcessor, stopDatabaseProcessor, getProcessorStatus, initializeDatabaseProcessor } from './databaseProcessor.js';
import { testDatabaseConnection, initializeDatabasePoller } from './databasePoller.js';
import { getPosterMetrics, isHealthy } from './poster.js';
import { loadConfig } from './config.js';

async function main() {
  logger.info('🤖 Pull Robot starting up...');
  
  // Load configuration asynchronously
  const config = await loadConfig();
  
  logger.info('📋 Configuration loaded:', {
    supabase: config.supabase.url,
    dashboard: config.dashboard.endpoint,
    polling: config.polling,
    processing: config.processing,
  });

  // Initialize database poller for connection test
  initializeDatabasePoller(config);
  
  // Test database connection
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    logger.error('❌ Database connection failed. Exiting...');
    process.exit(1);
  }

  // Initialize all services with config
  initializeDatabaseProcessor(config);

  // Start database processor
  startDatabaseProcessor();

  // Create Fastify server
  const server = fastify({
    logger: false, // Use our custom logger instead
  });

  try {
    // Health check endpoint
    server.get('/health', async (request, reply) => {
      const processorStatus = getProcessorStatus();
      const posterMetrics = getPosterMetrics();
      const isSystemHealthy = isHealthy();

      const healthData = {
        status: isSystemHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        processor: processorStatus,
        poster: posterMetrics,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
      };

      reply.code(isSystemHealthy ? 200 : 503).send(healthData);
    });

    // Metrics endpoint  
    server.get('/metrics', async (request, reply) => {
      const processorStatus = getProcessorStatus();
      const posterMetrics = getPosterMetrics();

      const metrics = {
        processor: processorStatus,
        poster: posterMetrics,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };

      reply.send(metrics);
    });

    // Start the server
    await server.listen({
      port: config.server.port,
      host: '0.0.0.0', // Listen on all interfaces for Docker
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

  // Handle shutdown signals
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  // Handle uncaught exceptions and rejections
  process.on('uncaughtException', (error) => {
    logger.error('💥 Uncaught exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });
}

// Start the application
main().catch((error) => {
  logger.error('💥 Failed to start application:', error);
  process.exit(1);
});