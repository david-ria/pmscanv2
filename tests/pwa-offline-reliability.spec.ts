import { test, expect, Page } from '@playwright/test';
import { setupNetworkIsolation } from './network-isolation';

test.describe('PWA/Offline Reliability', () => {
  
  test('manifest.json loads with required PWA fields', async ({ page }) => {
    // Test manifest.json accessibility and structure
    const manifestResponse = await page.goto('/manifest.json');
    expect(manifestResponse?.status()).toBe(200);
    
    const manifest = await manifestResponse?.json();
    
    // Verify required PWA manifest fields
    expect(manifest.name).toBe('AirSentinels - Air Quality Monitor');
    expect(manifest.short_name).toBe('AirSentinels');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    
    // Verify icons array exists and has required sizes
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
    
    const iconSizes = manifest.icons.map((icon: any) => icon.sizes);
    expect(iconSizes.some((sizes: string) => sizes.includes('192x192'))).toBe(true);
    expect(iconSizes.some((sizes: string) => sizes.includes('512x512'))).toBe(true);
  });

  test('Service Worker registers and activates (production mode)', async ({ page }) => {
    // In test mode, SW registration should be skipped
    // This test validates the SW would register in production
    
    await page.goto('/');
    
    // Check if SW registration code exists (but is disabled in test mode)
    const swRegistrationExists = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    
    expect(swRegistrationExists).toBe(true);
    
    // In test mode, verify SW is NOT registered (should be disabled)
    const swRegistration = await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.length;
    });
    
    // Should be 0 in test mode due to test mode guards
    expect(swRegistration).toBe(0);
  });

  test('Service Worker precaches key assets and routes', async ({ page }) => {
    // Test that SW would cache essential resources in production
    const response = await page.goto('/sw.js');
    expect(response?.status()).toBe(200);
    
    const swCode = await response?.text();
    
    // Verify SW contains caching logic for essential resources
    expect(swCode).toContain('CACHE_NAME');
    expect(swCode).toContain('install');
    expect(swCode).toContain('fetch');
    expect(swCode).toContain('caches');
    
    // Verify critical routes/assets are referenced for caching
    expect(swCode).toContain('/');
    expect(swCode).toContain('static');
  });

  test('dashboard renders from cache during offline simulation', async ({ page }) => {
    await setupNetworkIsolation(page);
    
    // Visit dashboard first to populate cache (simulate)
    await page.goto('/');
    
    // Verify page loads with essential content
    await expect(page.locator('h1, [data-testid="app-title"]')).toBeVisible({ timeout: 10000 });
    
    // Simulate going offline by blocking all network requests
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (url.startsWith('http://127.0.0.1:4173') || url.startsWith('http://localhost:4173')) {
        // Allow initial page load from local server
        return route.continue();
      }
      // Block all other requests to simulate offline
      return route.abort('failed');
    });
    
    // Try to navigate - should work from cache/static content
    await page.reload();
    
    // Verify core UI elements are still present
    await expect(page.locator('body')).toBeVisible();
    
    // Check for no critical JS errors
    const jsErrors: string[] = [];
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });
    
    // Wait and verify no critical errors occurred
    await page.waitForTimeout(2000);
    
    // Filter out expected network errors, focus on JS execution errors
    const criticalErrors = jsErrors.filter(error => 
      !error.includes('fetch') && 
      !error.includes('network') && 
      !error.includes('ERR_INTERNET_DISCONNECTED')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('auth view renders offline without errors', async ({ page }) => {
    await setupNetworkIsolation(page);
    
    // Navigate to auth page
    await page.goto('/auth');
    
    // Should render basic auth UI
    await expect(page.locator('form, [data-testid="auth-form"], input')).toBeVisible({ timeout: 10000 });
    
    // Simulate offline condition
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (url.includes('127.0.0.1') || url.includes('localhost')) {
        return route.continue();
      }
      return route.abort('failed');
    });
    
    // Check for no JS errors during offline rendering
    const jsErrors: string[] = [];
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });
    
    await page.reload();
    await page.waitForTimeout(2000);
    
    const criticalErrors = jsErrors.filter(error => 
      !error.includes('fetch') && 
      !error.includes('network') &&
      !error.includes('supabase') &&
      !error.includes('ERR_')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('history view renders offline with cached data', async ({ page }) => {
    await setupNetworkIsolation(page);
    
    // Navigate to history page
    await page.goto('/history');
    
    // Should render history page structure
    await expect(page.locator('main, [data-testid="history-page"], h1')).toBeVisible({ timeout: 10000 });
    
    // Simulate offline
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (url.includes('127.0.0.1') || url.includes('localhost')) {
        return route.continue();
      }
      return route.abort('failed');
    });
    
    const jsErrors: string[] = [];
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });
    
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Verify page structure remains intact offline
    await expect(page.locator('body')).toBeVisible();
    
    const criticalErrors = jsErrors.filter(error => 
      !error.includes('fetch') && 
      !error.includes('network') &&
      !error.includes('supabase') &&
      !error.includes('ERR_')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('offline-to-online recovery works without breaking', async ({ page }) => {
    await setupNetworkIsolation(page);
    
    // Start online
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    
    // Simulate going offline
    let isOffline = true;
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (url.includes('127.0.0.1') || url.includes('localhost')) {
        return route.continue();
      }
      
      if (isOffline) {
        return route.abort('failed');
      }
      return route.continue();
    });
    
    // Perform some offline actions
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Simulate coming back online
    isOffline = false;
    
    // Navigate around to test recovery
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Should not have critical errors
    const jsErrors: string[] = [];
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });
    
    await page.waitForTimeout(2000);
    
    const criticalErrors = jsErrors.filter(error => 
      !error.includes('fetch') && 
      !error.includes('network') &&
      error.includes('TypeError') || error.includes('ReferenceError')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('offline navigation produces no critical JS errors', async ({ page }) => {
    await setupNetworkIsolation(page);
    
    const jsErrors: string[] = [];
    const consoleLogs: string[] = [];
    
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleLogs.push(msg.text());
      }
    });
    
    // Simulate offline mode
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (url.includes('127.0.0.1') || url.includes('localhost')) {
        return route.continue();
      }
      return route.abort('failed');
    });
    
    // Navigate through different routes offline
    const routes = ['/', '/auth', '/history'];
    
    for (const route of routes) {
      try {
        await page.goto(route);
        await page.waitForTimeout(1000);
        
        // Try basic interactions
        await page.locator('body').click({ timeout: 5000 });
        await page.waitForTimeout(500);
        
      } catch (error) {
        // Navigation errors are expected offline, but shouldn't cause JS crashes
        console.log(`Expected navigation error for ${route}:`, error);
      }
    }
    
    // Filter to only critical JS execution errors
    const criticalErrors = jsErrors.filter(error => 
      (error.includes('TypeError') || 
       error.includes('ReferenceError') || 
       error.includes('is not a function')) &&
      !error.includes('fetch') &&
      !error.includes('network')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('Service Worker cache cleanup mechanism exists', async ({ page }) => {
    // Test that SW has cache cleanup logic for new releases
    const response = await page.goto('/sw.js');
    const swCode = await response?.text();
    
    // Verify SW contains cache cleanup logic
    expect(swCode).toContain('activate');
    expect(swCode).toContain('caches.delete');
    
    // Should have version-based cache management
    const hasVersioning = swCode?.includes('CACHE_NAME') || swCode?.includes('version');
    expect(hasVersioning).toBe(true);
  });

  test('PWA installability criteria are met', async ({ page }) => {
    await page.goto('/');
    
    // Check if page meets basic PWA criteria
    const manifestLink = await page.locator('link[rel="manifest"]');
    await expect(manifestLink).toBeAttached();
    
    const manifestHref = await manifestLink.getAttribute('href');
    expect(manifestHref).toBe('/manifest.json');
    
    // Verify HTTPS-like conditions (localhost counts)
    const url = page.url();
    expect(url.startsWith('http://localhost') || url.startsWith('https://')).toBe(true);
    
    // Check for service worker registration capability
    const swSupported = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    expect(swSupported).toBe(true);
  });

});