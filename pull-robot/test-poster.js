#!/usr/bin/env node

/**
 * Simple test script to demonstrate poster functionality
 * 
 * Tests:
 * 1. 429 retries (x2) then 200 success
 * 2. 400 non-retryable error → DLQ
 */

import { createServer } from 'http';
import { postPayload, getPosterMetrics, isHealthy } from './src/poster.js';

let requestCount = 0;

// Mock API server for testing
const mockServer = createServer((req, res) => {
  requestCount++;
  const body = [];
  
  req.on('data', chunk => body.push(chunk));
  req.on('end', () => {
    const payload = JSON.parse(Buffer.concat(body).toString());
    const deviceId = payload.device_id;
    
    console.log(`📨 Mock API received request #${requestCount} for device ${deviceId}`);
    console.log(`   Headers: ${JSON.stringify(req.headers)}`);
    console.log(`   Payload: ${JSON.stringify(payload, null, 2)}`);
    
    // Test scenarios based on device_id
    if (deviceId === 'test-retry-device') {
      // Return 429 twice, then 200
      if (requestCount <= 2) {
        res.writeHead(429, { 'Content-Type': 'text/plain' });
        res.end('Rate Limited - Try Again Later');
        console.log(`   Response: 429 (retry ${requestCount}/2)`);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, id: `processed-${requestCount}` }));
        console.log(`   Response: 200 (success after retries)`);
      }
    } else if (deviceId === 'test-dlq-device') {
      // Return 400 - non-retryable
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad Request - Invalid Data Format');
      console.log(`   Response: 400 (non-retryable → DLQ)`);
    } else {
      // Default success
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      console.log(`   Response: 200 (success)`);
    }
  });
});

async function runTests() {
  // Start mock server
  await new Promise(resolve => {
    mockServer.listen(8080, () => {
      console.log('🎭 Mock API server started on http://localhost:8080');
      resolve();
    });
  });

  // Override config for testing
  process.env.DASHBOARD_ENDPOINT = 'http://localhost:8080';
  process.env.DASHBOARD_BEARER = 'test-bearer-token';
  process.env.RATE_MAX_RPS = '10';
  process.env.MAX_ATTEMPTS = '3';
  process.env.RETRY_DELAY_MS = '500';
  process.env.BACKOFF_MULTIPLIER = '2';

  console.log('\n🧪 Starting Poster Tests...\n');

  // Test 1: Retry scenario (429 → 429 → 200)
  console.log('📋 Test 1: Retry Logic (429 x2 → 200)');
  console.log('==========================================');
  
  const retryPayload = {
    device_id: 'test-retry-device',
    mission_id: 'mission-test-retry',
    ts: new Date().toISOString(),
    metrics: { pm25: 15.5, pm10: 25.2 }
  };

  requestCount = 0; // Reset for this test
  const retryResult = await postPayload(
    retryPayload, 
    1, // fileId
    1, // rowIndex
    0, // retryCount
    'test-retry-device|mission-test-retry|' + retryPayload.ts
  );

  console.log(`✅ Retry test result:`, retryResult);
  console.log(`📊 Total requests made: ${requestCount}`);

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Non-retryable error → DLQ
  console.log('\n📋 Test 2: Non-Retryable Error → DLQ (400)');
  console.log('===============================================');
  
  const dlqPayload = {
    device_id: 'test-dlq-device',
    mission_id: 'mission-test-dlq',
    ts: new Date().toISOString(),
    metrics: { pm25: 8.3, pm10: 12.1 }
  };

  requestCount = 0; // Reset for this test
  const dlqResult = await postPayload(
    dlqPayload,
    2, // fileId
    1, // rowIndex
    0, // retryCount
    'test-dlq-device|mission-test-dlq|' + dlqPayload.ts
  );

  console.log(`❌ DLQ test result:`, dlqResult);
  console.log(`📊 Total requests made: ${requestCount} (should be 1 - no retries for 400)`);

  // Display final metrics
  console.log('\n📊 Final Poster Metrics:');
  console.log('=========================');
  const metrics = getPosterMetrics();
  Object.entries(metrics).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });

  console.log(`\n🏥 Health Status: ${isHealthy() ? '✅ Healthy' : '❌ Unhealthy'}`);

  // Cleanup
  mockServer.close();
  console.log('\n🏁 Tests completed!');
}

// Handle process exit gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted');
  mockServer.close();
  process.exit(0);
});

runTests().catch(error => {
  console.error('💥 Test failed:', error);
  mockServer.close();
  process.exit(1);
});