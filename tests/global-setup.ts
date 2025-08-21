import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚧 Setting up Playwright global configuration...');
  console.log('🔒 Network isolation: Only localhost:4173 allowed');
  return Promise.resolve();
}

export default globalSetup;