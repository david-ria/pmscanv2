import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  
  globalSetup: require.resolve('./tests/global-setup'),
  
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/*.spec.ts', '!**/compatibility-matrix.spec.ts']
    },
    
    // Mobile compatibility tests
    {
      name: 'android-api-30',
      use: {
        ...devices['Galaxy S21'],
        userAgent: 'Mozilla/5.0 (Linux; Android 11; API 30) AppleWebKit/537.36',
      },
      testMatch: ['**/compatibility-matrix.spec.ts']
    },
    
    {
      name: 'android-api-33',
      use: {
        ...devices['Galaxy S21'],
        userAgent: 'Mozilla/5.0 (Linux; Android 13; API 33) AppleWebKit/537.36',
      },
      testMatch: ['**/compatibility-matrix.spec.ts']
    },
    
    {
      name: 'android-api-34',
      use: {
        ...devices['Galaxy S21'],
        userAgent: 'Mozilla/5.0 (Linux; Android 14; API 34) AppleWebKit/537.36',
      },
      testMatch: ['**/compatibility-matrix.spec.ts']
    },

    // Brand-specific tests
    {
      name: 'samsung-device',
      use: {
        ...devices['Galaxy S21'],
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Samsung SM-G998B) AppleWebKit/537.36',
      },
      testMatch: ['**/compatibility-matrix.spec.ts']
    },
    
    {
      name: 'pixel-device',
      use: {
        ...devices['Pixel 5'],
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Google Pixel 7) AppleWebKit/537.36',
      },
      testMatch: ['**/compatibility-matrix.spec.ts']
    },
    
    {
      name: 'xiaomi-device',
      use: {
        ...devices['Galaxy S21'], // Use as base
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Xiaomi 2211133C) AppleWebKit/537.36',
      },
      testMatch: ['**/compatibility-matrix.spec.ts']
    },

    // PWA tests
    {
      name: 'pwa-tests',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/pwa.spec.ts']
    },
  ],

  webServer: {
    command: 'npm run build && npm run preview',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});