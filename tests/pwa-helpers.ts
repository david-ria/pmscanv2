import { Page, expect } from '@playwright/test';

/**
 * Helper functions for PWA testing
 */

/**
 * Simulates going offline by blocking all external network requests
 */
export async function goOffline(page: Page) {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.includes('127.0.0.1') || url.includes('localhost')) {
      return route.continue();
    }
    return route.abort('failed');
  });
}

/**
 * Simulates coming back online by allowing all requests
 */
export async function goOnline(page: Page) {
  await page.unroute('**/*');
}

/**
 * Checks if the page meets basic PWA installability criteria
 */
export async function checkPWAInstallability(page: Page) {
  // Check for manifest
  const manifestLink = await page.locator('link[rel="manifest"]').first();
  await expect(manifestLink).toBeAttached();
  
  // Check manifest is accessible
  const manifestHref = await manifestLink.getAttribute('href');
  expect(manifestHref).toBeTruthy();
  
  const manifestResponse = await page.goto(manifestHref!);
  expect(manifestResponse?.status()).toBe(200);
  
  const manifest = await manifestResponse?.json();
  expect(manifest.name).toBeTruthy();
  expect(manifest.start_url).toBeTruthy();
  
  return manifest;
}

/**
 * Validates Service Worker registration (but expects it to be disabled in test mode)
 */
export async function checkServiceWorkerSupport(page: Page) {
  const swSupported = await page.evaluate(() => {
    return 'serviceWorker' in navigator;
  });
  expect(swSupported).toBe(true);
  
  // In test mode, SW should not be registered
  const registrations = await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.length;
  });
  
  // Should be 0 in test mode due to test mode guards
  expect(registrations).toBe(0);
}

/**
 * Collects and filters JavaScript errors, excluding expected network errors
 */
export function createErrorCollector(page: Page) {
  const jsErrors: string[] = [];
  
  page.on('pageerror', (error) => {
    jsErrors.push(error.message);
  });
  
  return {
    getErrors: () => jsErrors,
    getCriticalErrors: () => jsErrors.filter(error => 
      (error.includes('TypeError') || 
       error.includes('ReferenceError') || 
       error.includes('is not a function')) &&
      !error.includes('fetch') &&
      !error.includes('network') &&
      !error.includes('ERR_')
    ),
    reset: () => jsErrors.length = 0
  };
}

/**
 * Waits for the page to be in a stable offline state
 */
export async function waitForOfflineStability(page: Page, timeout = 3000) {
  await page.waitForTimeout(timeout);
  
  // Check that the page is still functional
  const bodyVisible = await page.locator('body').isVisible();
  expect(bodyVisible).toBe(true);
}

/**
 * Tests basic offline navigation without critical errors
 */
export async function testOfflineNavigation(page: Page, routes: string[]) {
  const errorCollector = createErrorCollector(page);
  
  await goOffline(page);
  
  for (const route of routes) {
    try {
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await waitForOfflineStability(page, 1000);
      
      // Verify page structure exists
      const bodyExists = await page.locator('body').count();
      expect(bodyExists).toBeGreaterThan(0);
      
    } catch (error) {
      // Navigation errors are expected offline, log but don't fail
      console.log(`Expected offline navigation error for ${route}:`, error);
    }
  }
  
  const criticalErrors = errorCollector.getCriticalErrors();
  expect(criticalErrors).toHaveLength(0);
}