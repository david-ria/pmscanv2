import { test, expect, type Page } from '@playwright/test';

const PERFORMANCE_BUDGETS = {
  maxRequests: 35,
  maxTransferSize: 1200000, // 1.2 MB
  maxLongTaskDuration: 250, // ms
  maxJSExecutionTime: 1500, // ms
};

const ROUTES = ['/', '/auth', '/history'];

test.describe('Performance Budgets', () => {
  test.beforeEach(async ({ page }) => {
    // Enable test mode to avoid external requests
    await page.addInitScript(() => {
      window.localStorage.setItem('testMode', 'true');
    });
  });

  for (const route of ROUTES) {
    test(`Performance budgets for ${route}`, async ({ page }) => {
      const networkRequests: any[] = [];
      const longTasks: any[] = [];
      let totalTransferSize = 0;

      // Monitor network requests
      page.on('response', async (response) => {
        const url = response.url();
        const status = response.status();
        const size = parseInt(response.headers()['content-length'] || '0');

        networkRequests.push({
          url,
          status,
          size,
        });

        if (status >= 200 && status < 300) {
          totalTransferSize += size;
        }

        // Ensure no third-party domains (except localhost and file://)
        if (!url.startsWith('http://127.0.0.1') && 
            !url.startsWith('http://localhost') && 
            !url.startsWith('file://') &&
            !url.startsWith('data:')) {
          throw new Error(`Third-party request detected: ${url}`);
        }
      });

      // Monitor long tasks via Performance Observer
      await page.addInitScript(() => {
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.duration > 250) {
                (window as any).__longTasks = (window as any).__longTasks || [];
                (window as any).__longTasks.push({
                  name: entry.name,
                  duration: entry.duration,
                  startTime: entry.startTime
                });
              }
            }
          });
          observer.observe({ entryTypes: ['longtask'] });
        }
      });

      // Navigate to route
      const startTime = Date.now();
      await page.goto(`http://127.0.0.1:4173${route}`);
      
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');
      
      // Wait a bit more to catch any lazy-loaded content
      await page.waitForTimeout(2000);

      const endTime = Date.now();
      const navigationTime = endTime - startTime;

      // Check for long tasks
      const detectedLongTasks = await page.evaluate(() => {
        return (window as any).__longTasks || [];
      });

      // Assertions
      expect(networkRequests.length, `Too many requests for ${route}`).toBeLessThanOrEqual(PERFORMANCE_BUDGETS.maxRequests);
      
      expect(totalTransferSize, `Transfer size too large for ${route}`).toBeLessThanOrEqual(PERFORMANCE_BUDGETS.maxTransferSize);
      
      expect(detectedLongTasks.length, `Long tasks detected for ${route}: ${JSON.stringify(detectedLongTasks)}`).toBe(0);

      // Log performance summary
      console.log(`📊 Performance Summary for ${route}:`);
      console.log(`   • Requests: ${networkRequests.length}/${PERFORMANCE_BUDGETS.maxRequests}`);
      console.log(`   • Transfer Size: ${(totalTransferSize / 1024).toFixed(1)}KB/${(PERFORMANCE_BUDGETS.maxTransferSize / 1024).toFixed(1)}KB`);
      console.log(`   • Navigation Time: ${navigationTime}ms`);
      console.log(`   • Long Tasks: ${detectedLongTasks.length}`);
    });
  }

  test('Code splitting verification', async ({ page }) => {
    const dynamicImports: string[] = [];

    // Monitor dynamic imports by watching for chunk loading
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('.js') && url.includes('chunk')) {
        dynamicImports.push(url);
      }
    });

    // Start on homepage
    await page.goto('http://127.0.0.1:4173/');
    await page.waitForLoadState('networkidle');
    
    const initialChunks = [...dynamicImports];

    // Navigate to different routes to trigger lazy loading
    for (const route of ['/auth', '/history']) {
      await page.goto(`http://127.0.0.1:4173${route}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }

    const totalChunks = [...dynamicImports];
    
    // Ensure additional chunks were loaded during navigation
    expect(totalChunks.length, 'No dynamic imports detected - code splitting may not be working').toBeGreaterThan(initialChunks.length);
    
    console.log(`📦 Code Splitting Summary:`);
    console.log(`   • Initial chunks: ${initialChunks.length}`);
    console.log(`   • Total chunks loaded: ${totalChunks.length}`);
    console.log(`   • Dynamic chunks: ${totalChunks.length - initialChunks.length}`);
  });

  test('Offline behavior and cache effectiveness', async ({ page }) => {
    // First, load the page normally
    await page.goto('http://127.0.0.1:4173/');
    await page.waitForLoadState('networkidle');
    
    // Go offline
    await page.context().setOffline(true);
    
    // Try to navigate - should work from cache
    await page.goto('http://127.0.0.1:4173/');
    
    // Basic content should be visible
    await expect(page.locator('body')).toBeVisible();
    
    // Check that we don't have network error messages
    const errorElements = page.locator('text=/network.*error|failed.*load/i');
    await expect(errorElements).toHaveCount(0);
    
    console.log('✅ Offline navigation successful');
  });
});