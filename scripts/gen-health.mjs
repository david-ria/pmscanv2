#!/usr/bin/env node

/**
 * Health manifest generator
 * Generates health.json for webapp health checks
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

function generateHealthManifest() {
  console.log('🏥 Generating health manifest...');

  // Read package.json for app metadata
  const packageJsonPath = join(projectRoot, 'package.json');
  let packageData;
  
  try {
    packageData = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  } catch (error) {
    console.error('❌ Failed to read package.json:', error);
    process.exit(1);
  }

  // Get app name and version
  const appName = packageData.name || 'unknown-app';
  const version = packageData.version || '0.0.0';

  // Get build time (current time in ISO 8601)
  const buildTime = new Date().toISOString();

  // Get commit hash from environment or fallback to local
  const commit = process.env.GITHUB_SHA || 
                process.env.VERCEL_GIT_COMMIT_SHA || 
                process.env.CI_COMMIT_SHA || 
                'local-build';

  // Create health manifest object
  const healthManifest = {
    status: 'ok',
    name: appName,
    version: version,
    buildTime: buildTime,
    commit: commit
  };

  // Generate JSON content
  const jsonContent = JSON.stringify(healthManifest, null, 2);

  // Ensure directories exist
  const publicDir = join(projectRoot, 'public');
  const distDir = join(projectRoot, 'dist');

  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
  }

  // Write to public directory (for dev server)
  const publicHealthPath = join(publicDir, 'health.json');
  try {
    writeFileSync(publicHealthPath, jsonContent, 'utf8');
    console.log(`✅ Generated health manifest: ${publicHealthPath}`);
  } catch (error) {
    console.error('❌ Failed to write to public directory:', error);
    process.exit(1);
  }

  // Write to dist directory if it exists (for production build)
  if (existsSync(distDir)) {
    const distHealthPath = join(distDir, 'health.json');
    try {
      writeFileSync(distHealthPath, jsonContent, 'utf8');
      console.log(`✅ Generated health manifest: ${distHealthPath}`);
    } catch (error) {
      console.warn('⚠️ Failed to write to dist directory:', error);
      // Don't exit, as dist might not exist during dev
    }
  }

  // Log the generated manifest for verification
  console.log('📋 Health manifest content:');
  console.log(jsonContent);

  return healthManifest;
}

// Generate health manifest when script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateHealthManifest();
}

export { generateHealthManifest };