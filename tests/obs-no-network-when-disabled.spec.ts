import { test, expect } from '@playwright/test';
import { setupNetworkIsolation } from './network-isolation';

test.describe('Observability Network Isolation - Sentry Disabled', () => {
  test.beforeEach(async ({ page }) => {
    // Set up comprehensive network monitoring
    await page.route('**/*', async (route, request) => {
      const url = request.url();
      const method = request.method();
      
      // Allow localhost preview server (our app)
      if (url.startsWith('http://127.0.0.1:4173') || url.startsWith('http://localhost:4173')) {
        return route.continue();
      }
      
      // Allow data URLs (inline assets, base64 images, etc.)
      if (url.startsWith('data:')) {
        return route.continue();
      }
      
      // Allow blob URLs (generated content like downloads)
      if (url.startsWith('blob:')) {
        return route.continue();
      }
      
      // Allow chrome-extension URLs (browser extensions)
      if (url.startsWith('chrome-extension://')) {
        return route.continue();
      }
      
      // CRITICAL: Block any Sentry-related requests
      if (
        url.includes('sentry.io') ||
        url.includes('sentry.dev') ||
        url.includes('sentry.com') ||
        url.includes('.sentry.') ||
        url.includes('dsn.sentry.') ||
        url.includes('o1.ingest.sentry.io') ||
        url.includes('browser.sentry-cdn.com') ||
        url.includes('js.sentry-cdn.com')
      ) {
        console.error(`🚨 BLOCKED Sentry request (should not happen when disabled): ${method} ${url}`);
        // Fail the test if we see any Sentry requests
        throw new Error(`Sentry request detected when disabled: ${method} ${url}`);
      }
      
      // Block all other external requests (Supabase, APIs, CDNs, etc.)
      if (
        url.includes('supabase.co') ||
        url.includes('supabase.in') ||
        url.includes('googleapis.com') ||
        url.includes('mapbox.com') ||
        url.includes('openweathermap.org') ||
        url.includes('nominatim.openstreetmap.org') ||
        url.includes('cdnjs.cloudflare.com') ||
        url.includes('jsdelivr.net') ||
        url.includes('unpkg.com') ||
        url.includes('fonts.googleapis.com') ||
        url.includes('fonts.gstatic.com') ||
        url.startsWith('https://') ||
        url.startsWith('http://') && !url.includes('127.0.0.1') && !url.includes('localhost')
      ) {
        console.log(`🚫 BLOCKED external request: ${method} ${url}`);
        return route.abort('blockedbyclient');
      }
      
      // Allow other local requests by default
      console.log(`✅ ALLOWED request: ${method} ${url}`);
      return route.continue();
    });
    
    console.log('🔒 Enhanced network isolation setup - monitoring for Sentry traffic');
  });

  test('should not make any Sentry requests on dashboard page with VITE_SENTRY_ENABLED=0', async ({ page }) => {
    console.log('🔍 Testing dashboard page with Sentry disabled...');
    
    // Navigate to dashboard with Sentry explicitly disabled
    await page.goto('/?e2e=1&VITE_SENTRY_ENABLED=0');
    
    // Wait for page to fully load
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
    console.log('✅ Dashboard loaded');
    
    // Wait additional time to ensure no delayed Sentry initialization
    await page.waitForTimeout(3000);
    
    // Trigger some interactions that might cause errors (and potentially Sentry calls)
    try {
      // Click around the interface
      const recordButton = page.locator('[data-testid="record-button"]');
      if (await recordButton.isVisible()) {
        await recordButton.click();
        await page.waitForTimeout(1000);
        await recordButton.click(); // Stop recording
      }
      
      // Navigate to different sections
      const historyButton = page.locator('[data-testid="nav-history"]');
      if (await historyButton.isVisible()) {
        await historyButton.click();
        await page.waitForTimeout(1000);
      }
      
      const analysisButton = page.locator('[data-testid="nav-analysis"]');
      if (await analysisButton.isVisible()) {
        await analysisButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Navigate back to dashboard
      const dashboardButton = page.locator('[data-testid="nav-dashboard"]');
      if (await dashboardButton.isVisible()) {
        await dashboardButton.click();
        await page.waitForTimeout(1000);
      }
    } catch (error) {
      console.log('ℹ️ Some interactions failed (expected in test mode):', error.message);
    }
    
    // Final wait to catch any delayed network requests
    await page.waitForTimeout(2000);
    
    console.log('✅ Dashboard test completed - no Sentry requests detected');
  });

  test('should not make any Sentry requests on auth page with VITE_SENTRY_ENABLED=0', async ({ page }) => {
    console.log('🔍 Testing auth page with Sentry disabled...');
    
    // Navigate to auth page with Sentry explicitly disabled
    await page.goto('/auth?e2e=1&VITE_SENTRY_ENABLED=0');
    
    // Wait for page to load
    await page.waitForSelector('h1', { timeout: 10000 });
    console.log('✅ Auth page loaded');
    
    // Wait for any initialization
    await page.waitForTimeout(2000);
    
    // Try to interact with auth forms (might trigger validation errors)
    try {
      // Try sign in with empty form
      const signInTab = page.locator('[role="tab"]').filter({ hasText: /sign.*in/i });
      if (await signInTab.isVisible()) {
        await signInTab.click();
      }
      
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();
      
      if (await emailInput.isVisible() && await passwordInput.isVisible()) {
        // Try invalid credentials
        await emailInput.fill('invalid-email');
        await passwordInput.fill('short');
        
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await page.waitForTimeout(1000);
        }
        
        // Try sign up tab
        const signUpTab = page.locator('[role="tab"]').filter({ hasText: /sign.*up/i });
        if (await signUpTab.isVisible()) {
          await signUpTab.click();
          await page.waitForTimeout(500);
          
          // Fill some fields in sign up
          const signUpEmail = page.locator('input[type="email"]').first();
          if (await signUpEmail.isVisible()) {
            await signUpEmail.fill('test@example.com');
          }
        }
      }
    } catch (error) {
      console.log('ℹ️ Some auth interactions failed (expected in test mode):', error.message);
    }
    
    // Final wait to catch any delayed network requests
    await page.waitForTimeout(2000);
    
    console.log('✅ Auth page test completed - no Sentry requests detected');
  });

  test('should not make Sentry requests during navigation and error scenarios', async ({ page }) => {
    console.log('🔍 Testing navigation and error scenarios with Sentry disabled...');
    
    await page.goto('/?e2e=1&VITE_SENTRY_ENABLED=0');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
    
    // Navigate through all available routes
    const routes = [
      { path: '/history', testId: 'nav-history' },
      { path: '/analysis', testId: 'nav-analysis' },
      { path: '/groups', testId: 'nav-groups' },
      { path: '/profile', testId: 'nav-profile' },
    ];
    
    for (const route of routes) {
      try {
        const navButton = page.locator(`[data-testid="${route.testId}"]`);
        if (await navButton.isVisible()) {
          console.log(`📍 Navigating to ${route.path}...`);
          await navButton.click();
          await page.waitForTimeout(1500);
        }
      } catch (error) {
        console.log(`ℹ️ Navigation to ${route.path} failed (may not exist in test mode):`, error.message);
      }
    }
    
    // Try to trigger JavaScript errors that might cause Sentry calls
    try {
      // Execute some code that might cause errors
      await page.evaluate(() => {
        // Try to access undefined properties
        try {
          const obj: any = null;
          obj.someProperty.nestedProperty;
        } catch (e) {
          console.log('Caught error in page evaluation:', e);
        }
        
        // Trigger a promise rejection
        Promise.reject(new Error('Test promise rejection')).catch(() => {
          console.log('Caught promise rejection');
        });
      });
      
      await page.waitForTimeout(1000);
    } catch (error) {
      console.log('ℹ️ Error injection completed:', error.message);
    }
    
    // Navigate to non-existent route to trigger 404
    try {
      await page.goto('/non-existent-route?e2e=1&VITE_SENTRY_ENABLED=0');
      await page.waitForTimeout(2000);
    } catch (error) {
      console.log('ℹ️ 404 navigation completed');
    }
    
    console.log('✅ Navigation and error scenarios test completed - no Sentry requests detected');
  });

  test('should verify no Sentry initialization in browser console', async ({ page }) => {
    console.log('🔍 Testing browser console for Sentry initialization messages...');
    
    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];
    
    // Capture console messages
    page.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      } else {
        consoleLogs.push(text);
      }
    });
    
    await page.goto('/?e2e=1&VITE_SENTRY_ENABLED=0');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Check that Sentry initialization was explicitly disabled
    const sentryDisabledLogs = consoleLogs.filter(log => 
      log.includes('Sentry: Disabled') || 
      log.includes('VITE_SENTRY_ENABLED not set to "1"') ||
      log.includes('not production environment')
    );
    
    expect(sentryDisabledLogs.length).toBeGreaterThan(0);
    console.log('✅ Found Sentry disabled log:', sentryDisabledLogs[0]);
    
    // Check that no Sentry initialization success messages appear
    const sentryInitLogs = consoleLogs.filter(log => 
      log.includes('Sentry: Initialized successfully') ||
      log.includes('Sentry initialized') ||
      log.toLowerCase().includes('sentry') && log.includes('success')
    );
    
    expect(sentryInitLogs).toHaveLength(0);
    
    // Check that no Sentry-related errors appear
    const sentryErrors = consoleErrors.filter(error => 
      error.toLowerCase().includes('sentry') &&
      !error.includes('Sentry disabled') // Allow disabled messages
    );
    
    expect(sentryErrors).toHaveLength(0);
    
    console.log('✅ Browser console verification completed - Sentry properly disabled');
  });

  test('should handle page reload without Sentry network calls', async ({ page }) => {
    console.log('🔍 Testing page reload scenarios...');
    
    await page.goto('/?e2e=1&VITE_SENTRY_ENABLED=0');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
    
    // Reload the page multiple times
    for (let i = 1; i <= 3; i++) {
      console.log(`🔄 Reload ${i}/3...`);
      await page.reload();
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
      await page.waitForTimeout(2000);
    }
    
    // Hard reload
    console.log('🔄 Hard reload...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    console.log('✅ Page reload tests completed - no Sentry requests detected');
  });
});