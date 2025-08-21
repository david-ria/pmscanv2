#!/usr/bin/env node

import { config } from './config.js';
import { createLogger } from './logger.js';
import { startHealthServer } from './health.js';
import { initializeDatabase } from './state.js';
import { startPoller } from './poller.js';

const logger = createLogger('main');

async function bootstrap() {
  logger.info('🤖 Pull Robot starting up...');
  logger.info('📋 Configuration loaded', {
    supabaseUrl: config.supabase.url,
    storageBucket: config.storage.bucket,
    apiUrl: config.api.url,
    pollInterval: config.polling.intervalMs,
    healthPort: config.health.port,
  });

  try {
    // Initialize SQLite database
    logger.info('💾 Initializing database...');
    await initializeDatabase();
    logger.info('✅ Database initialized');

    // Start health/metrics server
    logger.info('🏥 Starting health server...');
    await startHealthServer();
    logger.info(`✅ Health server running on port ${config.health.port}`);

    // Start the main polling loop
    logger.info('🔄 Starting poller...');
    await startPoller();
    logger.info('✅ Poller started');

    logger.info('🚀 Pull Robot is running!');
    logger.info('📊 Health endpoint: http://localhost:' + config.health.port + '/health');
    logger.info('📈 Metrics endpoint: http://localhost:' + config.health.port + '/metrics');

  } catch (error) {
    logger.error('💥 Failed to start Pull Robot:', error);
    process.exit(1);
  }
}

// Graceful shutdown handling
async function shutdown() {
  logger.info('🛑 Shutting down Pull Robot...');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught exception:', error);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error('💥 Unhandled rejection:', reason);
  process.exit(1);
});

// Start the application
bootstrap().catch((error) => {
  logger.error('💥 Bootstrap failed:', error);
  process.exit(1);
});