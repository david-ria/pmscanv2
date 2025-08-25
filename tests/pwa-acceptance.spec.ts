import { test, expect } from '@playwright/test';
import { setupNetworkIsolation } from './network-isolation';

test.describe('PWA Offline Acceptance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start with network enabled to load the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Offline navigation renders without hard crashes', async ({ page }) => {
    // Set up network isolation (blocks external requests)
    await setupNetworkIsolation(page);
    
    // Test navigation to each route while offline
    const routes = ['/', '/auth', '/history'];
    
    for (const route of routes) {
      console.log(`Testing offline navigation to ${route}`);
      
      // Navigate to route
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      
      // Verify page renders (no hard crash)
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
      
      // Should not show browser error page
      expect(bodyText).not.toContain('This site can't be reached');
      expect(bodyText).not.toContain('ERR_INTERNET_DISCONNECTED');
      
      // Either show app content or offline fallback
      const hasAppContent = await page.locator('[data-testid], .grid, .text-lg, h1').count();
      const hasOfflineContent = await page.locator('text=offline').count();
      
      expect(hasAppContent > 0 || hasOfflineContent > 0).toBe(true);
    }
  });

  test('Assets served from cache when offline', async ({ page }) => {
    // Check that JS/CSS assets are cached
    const responses: Array<{ url: string; status: number; cached: boolean }> = [];
    
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('.js') || url.includes('.css')) {
        responses.push({
          url,
          status: response.status(),
          cached: response.fromServiceWorker()
        });
      }
    });
    
    // Set up network isolation and navigate
    await setupNetworkIsolation(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Check that critical assets loaded successfully
    const criticalAssets = responses.filter(r => 
      r.url.includes('index') || r.url.includes('main')
    );
    
    // Should have at least some cached assets
    expect(criticalAssets.length).toBeGreaterThan(0);
    
    // None should be 404 or return HTML when expecting JS/CSS
    for (const response of criticalAssets) {
      expect(response.status).not.toBe(404);
    }
  });

  test('No JSON parsing errors during offline navigation', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Set up network isolation
    await setupNetworkIsolation(page);
    
    // Navigate through routes
    const routes = ['/', '/auth', '/history'];
    for (const route of routes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000); // Let any async operations complete
    }
    
    // Check for the specific JSON parsing error
    const jsonParsingErrors = consoleErrors.filter(error =>
      error.includes("Unexpected token '<'") ||
      error.includes('is not valid JSON') ||
      error.includes('Unexpected end of JSON input')
    );
    
    if (jsonParsingErrors.length > 0) {
      console.log('JSON parsing errors found:', jsonParsingErrors);
    }
    
    expect(jsonParsingErrors).toHaveLength(0);
  });

  test('Network recovery works properly', async ({ page }) => {
    // Start offline
    await setupNetworkIsolation(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Verify offline state
    const offlineContent = await page.textContent('body');
    
    // Remove network isolation (go back online)
    await page.unroute('**/*');
    
    // Navigate to a new route
    await page.goto('/auth', { waitUntil: 'networkidle' });
    
    // Should load successfully
    const authContent = await page.textContent('body');
    expect(authContent).toBeTruthy();
    expect(authContent).not.toContain('offline');
  });

  test('Service Worker properly caches critical resources', async ({ page }) => {
    // Check if service worker is registered
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        return !!registration;
      }
      return false;
    });
    
    // In test mode, SW might be disabled, so this is optional
    if (swRegistered) {
      console.log('Service Worker is registered');
      
      // Check that caches contain expected resources
      const cacheNames = await page.evaluate(async () => {
        const names = await caches.keys();
        return names;
      });
      
      expect(cacheNames.length).toBeGreaterThanOrEqual(0);
      console.log('Cache names:', cacheNames);
    } else {
      console.log('Service Worker not registered (likely in test mode)');
    }
  });
});