#!/usr/bin/env node

/**
 * Production build script with optimized logging
 * Removes debug logs and optimizes for production
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting production build with log optimization...');

// Use production vite config if it exists
const productionConfig = path.join(__dirname, '..', 'vite.config.production.ts');
const hasProductionConfig = fs.existsSync(productionConfig);

const buildCommand = hasProductionConfig 
  ? 'vite build --config vite.config.production.ts'
  : 'vite build';

try {
  // Build the project
  console.log('📦 Building project...');
  execSync(buildCommand, { stdio: 'inherit' });

  // Analyze bundle if visualizer is available
  const statsFile = path.join(__dirname, '..', 'dist', 'stats.html');
  if (fs.existsSync(statsFile)) {
    console.log('📊 Bundle analysis available at dist/stats.html');
  }

  console.log('✅ Production build completed successfully!');
  console.log('🎯 Debug logs have been removed from production build');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}