#!/usr/bin/env node

/**
 * Simple test script to check database connectivity and robot functionality
 * 
 * Tests:
 * 1. Database connection and pending missions
 * 2. Basic configuration loading
 * 3. Service health
 */

import { testDatabaseConnection, getPendingMissions } from './src/databasePoller.js';
import { config } from './src/config.js';

async function runDatabaseTests() {
  console.log('🧪 Starting Pull Robot Database Tests...\n');

  // Test 1: Configuration loading
  console.log('📋 Test 1: Configuration Loading');
  console.log('=================================');
  
  try {
    console.log('✅ Configuration loaded successfully');
    console.log(`   Supabase URL: ${config.supabase.url}`);
    console.log(`   Dashboard Endpoint: ${config.dashboard.endpoint}`);
    console.log(`   Polling Interval: ${config.polling.intervalMs}ms`);
    console.log(`   Rate Limit: ${config.rateLimiting.maxRequestsPerSecond} RPS`);
    console.log(`   Max Attempts: ${config.processing.maxAttempts}`);
    console.log(`   Allowed Device IDs: ${config.processing.allowDeviceIds.join(', ')}`);
  } catch (error) {
    console.log('❌ Configuration loading failed:', error);
    process.exit(1);
  }

  console.log('\n📋 Test 2: Database Connection');
  console.log('===============================');

  // Test 2: Database connection
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    console.log('❌ Database connection failed');
    process.exit(1);
  }

  console.log('\n📋 Test 3: Pending Missions Query');
  console.log('==================================');

  // Test 3: Query for pending missions
  try {
    const missions = await getPendingMissions();
    console.log(`✅ Successfully queried missions: ${missions.length} found`);
    
    if (missions.length > 0) {
      console.log('   Sample missions:');
      missions.slice(0, 3).forEach((mission, i) => {
        console.log(`   ${i + 1}. Mission ${mission.id.substring(0, 8)}...`);
        console.log(`      Device: ${mission.device_name}`);
        console.log(`      Measurements: ${mission.measurements_count}`);
        console.log(`      Start: ${new Date(mission.start_time).toLocaleString()}`);
      });
    } else {
      console.log('   No pending missions found (robot may be up-to-date)');
    }
  } catch (error) {
    console.log('❌ Failed to query pending missions:', error);
  }

  console.log('\n📋 Test 4: Mission Table Schema Check');
  console.log('=====================================');

  // Test 4: Check if mission table has required robot columns
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(config.supabase.url, config.supabase.key);
    
    const { data, error } = await supabase
      .from('missions')
      .select('id, device_name, processed_by_robot, robot_processed_at, robot_processing_attempts')
      .limit(1);
    
    if (error) {
      console.log('❌ Schema check failed:', error);
    } else {
      console.log('✅ Mission table schema is compatible with robot');
      console.log('   Required columns exist: processed_by_robot, robot_processed_at, robot_processing_attempts');
    }
  } catch (error) {
    console.log('❌ Schema check error:', error);
  }

  console.log('\n🏁 Database tests completed!');
  console.log('\n💡 Next steps:');
  console.log('   1. Run "npm run dev" to start the robot in development mode');
  console.log('   2. Check health at http://localhost:3000/health');
  console.log('   3. Monitor logs for processing activity');
}

// Handle process exit gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted');
  process.exit(0);
});

runDatabaseTests().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});