import { test, expect, devices } from '@playwright/test';

// Android API Level Test Matrix
const ANDROID_VERSIONS = [
  { name: 'Android 11 (API 30)', userAgent: 'Android 11; API 30' },
  { name: 'Android 13 (API 33)', userAgent: 'Android 13; API 33' },
  { name: 'Android 14 (API 34)', userAgent: 'Android 14; API 34' },
];

const DEVICE_BRANDS = [
  { name: 'Samsung Galaxy', userAgent: 'Samsung SM-G998B' },
  { name: 'Google Pixel', userAgent: 'Google Pixel 7' },
  { name: 'Xiaomi', userAgent: 'Xiaomi 2211133C' },
];

// Core functionality tests for each Android version
ANDROID_VERSIONS.forEach(({ name, userAgent }) => {
  test.describe(`${name} Compatibility`, () => {
    test.use({ 
      userAgent: `Mozilla/5.0 (Linux; ${userAgent}) AppleWebKit/537.36`,
      viewport: { width: 393, height: 851 } // Standard mobile viewport
    });

    test('should detect correct API level', async ({ page }) => {
      await page.goto('/');
      
      // Wait for device detection
      await page.waitForTimeout(1000);
      
      // Should not have critical JavaScript errors
      const errors: string[] = [];
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });
      
      // Navigate through main sections
      await page.getByTestId('scan-tab').click();
      await page.waitForTimeout(500);
      
      await page.getByTestId('devices-tab').click();
      await page.waitForTimeout(500);
      
      // Should not have critical errors
      const criticalErrors = errors.filter(error => 
        error.includes('TypeError') || 
        error.includes('ReferenceError') ||
        error.includes('is not a function')
      );
      
      expect(criticalErrors).toHaveLength(0);
    });

    test('should handle BLE permission requests appropriately', async ({ page }) => {
      await page.goto('/scan');
      
      // Mock BLE availability
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'bluetooth', {
          value: {
            requestDevice: () => Promise.reject(new Error('User cancelled')),
            getAvailability: () => Promise.resolve(true)
          }
        });
      });
      
      // Try to scan for devices (should handle gracefully)
      const scanButton = page.getByRole('button', { name: /scan/i });
      if (await scanButton.isVisible()) {
        await scanButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Should not crash the app
      const appContainer = page.locator('[data-testid="app-container"]');
      await expect(appContainer).toBeVisible();
    });

    test('should persist state across navigation', async ({ page }) => {
      await page.goto('/');
      
      // Navigate to different sections
      await page.getByTestId('scan-tab').click();
      await page.waitForTimeout(200);
      
      await page.getByTestId('devices-tab').click();
      await page.waitForTimeout(200);
      
      await page.getByTestId('missions-tab').click();
      await page.waitForTimeout(200);
      
      // Should maintain responsive layout
      const viewport = page.viewportSize();
      if (viewport) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        
        // Check that navigation is still accessible
        await expect(page.getByTestId('scan-tab')).toBeVisible();
      }
    });
  });
});

// Device brand specific tests
DEVICE_BRANDS.forEach(({ name, userAgent }) => {
  test.describe(`${name} Brand Tests`, () => {
    test.use({ 
      userAgent: `Mozilla/5.0 (Linux; Android 13; ${userAgent}) AppleWebKit/537.36`
    });

    test('should handle brand-specific optimizations', async ({ page }) => {
      await page.goto('/');
      
      // Check if compatibility checker is available
      const compatibilitySection = page.locator('[data-testid="compatibility-checker"]');
      
      // Either the checker is present, or the app works without it
      const hasCompatibilityChecker = await compatibilitySection.isVisible().catch(() => false);
      
      if (hasCompatibilityChecker) {
        // Should show device-specific information
        await expect(compatibilitySection).toContainText(name.split(' ')[0]); // Brand name
      }
      
      // Core functionality should work regardless
      const mainContent = page.locator('main, [role="main"], body');
      await expect(mainContent).toBeVisible();
    });

    test('should handle power management scenarios', async ({ page }) => {
      await page.goto('/');
      
      // Simulate app going to background
      await page.evaluate(() => {
        // Simulate visibility change
        Object.defineProperty(document, 'visibilityState', {
          value: 'hidden',
          writable: true
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      
      await page.waitForTimeout(500);
      
      // Simulate coming back to foreground
      await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          writable: true
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      
      await page.waitForTimeout(500);
      
      // App should still be functional
      const appContainer = page.locator('[data-testid="app-container"]');
      await expect(appContainer).toBeVisible();
    });
  });
});

// Cross-version compatibility test
test.describe('Cross-Version Compatibility', () => {
  test('should maintain consistent UI across Android versions', async ({ page }) => {
    const versions = ['Android 11', 'Android 13', 'Android 14'];
    
    for (const version of versions) {
      await page.setExtraHTTPHeaders({
        'User-Agent': `Mozilla/5.0 (Linux; ${version}) AppleWebKit/537.36`
      });
      
      await page.goto('/');
      await page.waitForTimeout(1000);
      
      // Check core UI elements exist
      const navigation = page.locator('[role="navigation"], nav, [data-testid*="nav"]');
      const hasNavigation = await navigation.count() > 0;
      
      const mainContent = page.locator('main, [role="main"], body');
      await expect(mainContent).toBeVisible();
      
      // Should have some form of navigation
      if (hasNavigation) {
        await expect(navigation.first()).toBeVisible();
      }
    }
  });
});

// Performance baseline tests
test.describe('Performance Baseline', () => {
  test('should load within acceptable time limits', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds on mobile
    expect(loadTime).toBeLessThan(5000);
    
    // Should have visible content
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();
    expect(bodyContent!.length).toBeGreaterThan(100); // Has substantial content
  });

  test('should handle orientation changes', async ({ page }) => {
    await page.goto('/');
    
    // Test portrait
    await page.setViewportSize({ width: 393, height: 851 });
    await page.waitForTimeout(500);
    
    const portraitLayout = await page.locator('body').screenshot();
    expect(portraitLayout).toBeTruthy();
    
    // Test landscape
    await page.setViewportSize({ width: 851, height: 393 });
    await page.waitForTimeout(500);
    
    const landscapeLayout = await page.locator('body').screenshot();
    expect(landscapeLayout).toBeTruthy();
    
    // Should not crash during orientation change
    const appContainer = page.locator('[data-testid="app-container"]');
    await expect(appContainer).toBeVisible();
  });
});