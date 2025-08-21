import { test, expect } from '@playwright/test';
import { setupNetworkIsolation } from './network-isolation';

test.describe('Energy - Console Spam Prevention', () => {
  test.beforeEach(async ({ page }) => {
    await setupNetworkIsolation(page);
    
    // Mock auth for dashboard access
    await page.route('**/auth/v1/user**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'fake-user-energy-test',
          email: 'energy@test.com',
          user_metadata: {
            first_name: 'Energy',
            last_name: 'Test'
          }
        })
      });
    });
  });

  test('should produce minimal console logs on dashboard', async ({ page }) => {
    const consoleLogs: Array<{
      type: string;
      message: string;
      timestamp: number;
    }> = [];

    // Listen to all console events
    page.on('console', msg => {
      const timestamp = Date.now();
      const message = msg.text();
      const type = msg.type();
      
      consoleLogs.push({
        type,
        message,
        timestamp
      });
      
      // Log for debugging (this won't count towards the limit as it's from test runner)
      console.log(`[${type.toUpperCase()}] ${message}`);
    });

    // Navigate to dashboard
    await page.goto('/');
    
    // Wait for initial page load
    await page.waitForLoadState('networkidle');
    
    // Wait for 3 seconds to capture any ongoing console activity
    const startTime = Date.now();
    await page.waitForTimeout(3000);
    const endTime = Date.now();
    
    // Filter logs that occurred during our observation window
    const observationLogs = consoleLogs.filter(log => 
      log.timestamp >= startTime && log.timestamp <= endTime
    );
    
    // Categorize logs
    const debugLogs = observationLogs.filter(log => 
      log.type === 'debug' || log.message.includes('[DEBUG]')
    );
    
    const infoLogs = observationLogs.filter(log => 
      log.type === 'info' || log.message.includes('[INFO]')
    );
    
    const warnLogs = observationLogs.filter(log => 
      log.type === 'warning' || log.message.includes('[WARN]')
    );
    
    const errorLogs = observationLogs.filter(log => 
      log.type === 'error' || log.message.includes('[ERROR]')
    );
    
    // Filter out acceptable logs (these don't count towards spam)
    const acceptableLogs = observationLogs.filter(log => {
      const msg = log.message.toLowerCase();
      return (
        // Browser DevTools messages
        msg.includes('devtools') ||
        // React DevTools
        msg.includes('react-devtools') ||
        // Webpack HMR (shouldn't be present in production build)
        msg.includes('hmr') ||
        msg.includes('hot reload') ||
        // Expected navigation/routing logs
        msg.includes('navigation') ||
        // Lighthouse or performance monitoring
        msg.includes('lighthouse') ||
        // Browser extension messages
        msg.includes('extension') ||
        // CORS preflight (acceptable)
        msg.includes('cors') ||
        // Service worker registration (acceptable)
        msg.includes('service worker') ||
        // ResizeObserver warnings (common browser noise)
        msg.includes('resizeobserver')
      );
    });
    
    const spamLogs = observationLogs.filter(log => !acceptableLogs.includes(log));
    
    // Report findings
    console.log('\n📊 Console Activity Report (3-second observation):');
    console.log(`   Total logs: ${observationLogs.length}`);
    console.log(`   Debug logs: ${debugLogs.length}`);
    console.log(`   Info logs: ${infoLogs.length}`);
    console.log(`   Warn logs: ${warnLogs.length}`);
    console.log(`   Error logs: ${errorLogs.length}`);
    console.log(`   Acceptable logs: ${acceptableLogs.length}`);
    console.log(`   Spam logs: ${spamLogs.length}`);
    
    if (spamLogs.length > 0) {
      console.log('\n🔍 Spam log details:');
      spamLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. [${log.type}] ${log.message}`);
      });
    }
    
    if (debugLogs.length > 0) {
      console.log('\n🐛 Debug log details:');
      debugLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. ${log.message}`);
      });
    }
    
    // Primary assertions
    expect(debugLogs.length).toBe(0); // Zero debug logs in production build
    expect(spamLogs.length).toBeLessThan(5); // Less than 5 spam logs total
    
    // Additional quality checks
    expect(errorLogs.length).toBe(0); // No errors should occur during normal dashboard usage
    
    // If there are warnings, they should be minimal
    if (warnLogs.length > 0) {
      expect(warnLogs.length).toBeLessThan(3); // Maximum 2 warnings
    }
    
    // Verify app is functional despite log restrictions
    await expect(page.locator('h1').filter({ hasText: /airsentinels/i })).toBeVisible();
  });

  test('should not spam logs during user interactions', async ({ page }) => {
    const consoleLogs: string[] = [];

    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Clear initial page load logs
    consoleLogs.length = 0;
    
    // Perform common user interactions
    const interactions = [
      // Hover over elements
      () => page.hover('h1'),
      
      // Try to navigate (if navigation elements exist)
      () => page.locator('a[href="/history"]').hover().catch(() => {}),
      
      // Scroll the page
      () => page.evaluate(() => window.scrollTo(0, 100)),
      () => page.evaluate(() => window.scrollTo(0, 0)),
      
      // Focus/blur interactions
      () => page.evaluate(() => {
        const focusable = document.querySelector('button, input, a');
        if (focusable instanceof HTMLElement) {
          focusable.focus();
          focusable.blur();
        }
      }),
      
      // Window resize simulation
      () => page.setViewportSize({ width: 800, height: 600 }),
      () => page.setViewportSize({ width: 1200, height: 800 }),
    ];
    
    // Execute interactions with short delays
    for (const interaction of interactions) {
      await interaction();
      await page.waitForTimeout(200); // Brief pause between interactions
    }
    
    // Wait for any delayed logs
    await page.waitForTimeout(1000);
    
    // Filter out acceptable interaction logs
    const spamLogs = consoleLogs.filter(log => {
      const msg = log.toLowerCase();
      return !(
        msg.includes('resizeobserver') ||
        msg.includes('focus') ||
        msg.includes('scroll') ||
        msg.includes('[debug]') || // These should be suppressed anyway
        msg.includes('[info]')     // These should be suppressed anyway
      );
    });
    
    console.log('\n🖱️ User Interaction Console Report:');
    console.log(`   Total logs during interactions: ${consoleLogs.length}`);
    console.log(`   Spam logs: ${spamLogs.length}`);
    
    if (spamLogs.length > 0) {
      console.log('\n📝 Interaction spam logs:');
      spamLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. ${log}`);
      });
    }
    
    // Interactions shouldn't generate spam
    expect(spamLogs.length).toBeLessThan(3);
    
    // App should remain functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle error scenarios without log spam', async ({ page }) => {
    const consoleLogs: string[] = [];

    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Clear initial logs
    consoleLogs.length = 0;
    
    // Trigger some potential error scenarios
    await page.evaluate(() => {
      // Try to access non-existent elements (common in dynamic apps)
      document.querySelector('#non-existent-element')?.click();
      
      // Try invalid localStorage operations
      try {
        localStorage.setItem('test-key', 'test-value');
        localStorage.removeItem('test-key');
      } catch (e) {
        // Silently handle
      }
      
      // Dispatch custom events that might not have listeners
      window.dispatchEvent(new CustomEvent('test-event'));
    });
    
    // Wait for any error handling
    await page.waitForTimeout(1000);
    
    // Count only error-related spam (warnings/errors during error scenarios are acceptable)
    const errorSpam = consoleLogs.filter(log => {
      const msg = log.toLowerCase();
      return msg.includes('uncaught') || msg.includes('unhandled') || msg.includes('failed');
    });
    
    console.log('\n⚠️ Error Scenario Console Report:');
    console.log(`   Total logs during error scenarios: ${consoleLogs.length}`);
    console.log(`   Critical error spam: ${errorSpam.length}`);
    
    // Should not have critical errors or uncaught exceptions
    expect(errorSpam.length).toBe(0);
    
    // App should remain stable
    await expect(page.locator('h1').filter({ hasText: /airsentinels/i })).toBeVisible();
  });
});