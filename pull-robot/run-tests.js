#!/usr/bin/env node

/**
 * Comprehensive test runner for Pull Robot
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';

console.log('🧪 Pull Robot Test Suite');
console.log('========================\n');

// Test configuration
const tests = [
  {
    name: 'Database Connection & Schema',
    command: 'node',
    args: ['test-database.js'],
    timeout: 30000
  },
  {
    name: 'API Poster Functionality', 
    command: 'node',
    args: ['test-poster.js'],
    timeout: 60000
  }
];

let allPassed = true;

async function runTest(test) {
  return new Promise((resolve) => {
    console.log(`📋 Running: ${test.name}`);
    console.log(`   Command: ${test.command} ${test.args.join(' ')}`);
    
    const startTime = Date.now();
    const child = spawn(test.command, test.args, { 
      stdio: 'pipe',
      cwd: process.cwd()
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      process.stdout.write(output);
    });

    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      process.stderr.write(output);
    });

    // Timeout handling
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      console.log(`❌ Test "${test.name}" timed out after ${test.timeout}ms`);
      allPassed = false;
      resolve(false);
    }, test.timeout);

    child.on('close', (code) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;
      
      if (code === 0) {
        console.log(`✅ Test "${test.name}" passed (${duration}ms)\n`);
        resolve(true);
      } else {
        console.log(`❌ Test "${test.name}" failed with code ${code} (${duration}ms)\n`);
        allPassed = false;
        resolve(false);
      }
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      console.log(`💥 Test "${test.name}" encountered error:`, error.message);
      allPassed = false;
      resolve(false);
    });
  });
}

async function runAllTests() {
  console.log(`🏃 Running ${tests.length} test suites...\n`);

  // Check if test files exist
  for (const test of tests) {
    if (!existsSync(test.args[0])) {
      console.log(`❌ Test file not found: ${test.args[0]}`);
      allPassed = false;
      return;
    }
  }

  // Run tests sequentially
  for (const test of tests) {
    await runTest(test);
  }

  // Summary
  console.log('📊 Test Results Summary');
  console.log('=======================');
  
  if (allPassed) {
    console.log('✅ All tests passed!');
    console.log('\n🚀 Pull Robot is ready to deploy');
    console.log('   Next steps:');
    console.log('   1. npm run build');
    console.log('   2. npm start (or npm run dev for development)');
    console.log('   3. Monitor http://localhost:3000/health');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    console.log('\n🔧 Check the error messages above and fix the issues');
    console.log('   Common fixes:');
    console.log('   - Verify .env file has all required variables');
    console.log('   - Check database connectivity');
    console.log('   - Ensure API endpoints are accessible');
    process.exit(1);
  }
}

// Handle interruption
process.on('SIGINT', () => {
  console.log('\n🛑 Tests interrupted by user');
  process.exit(1);
});

runAllTests().catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});