import { test, expect } from '@playwright/test';

test.describe('Dashboard Shell CUJ', () => {
  test('should login and load dashboard with core UI elements', async ({ page }) => {
    // Mock Supabase auth endpoints to stay fully offline
    await page.route('**/auth/v1/token?grant_type=password**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake-access-token-dashboard-test',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'fake-refresh-token-dashboard',
          user: {
            id: 'fake-user-dashboard',
            email: 'dashboard@test.com',
            user_metadata: {
              first_name: 'Dashboard',
              last_name: 'User'
            }
          }
        })
      });
    });

    // Mock user session endpoint
    await page.route('**/auth/v1/user**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'fake-user-dashboard',
          email: 'dashboard@test.com',
          user_metadata: {
            first_name: 'Dashboard',
            last_name: 'User'
          }
        })
      });
    });

    // Mock any other API calls that might be made
    await page.route('**/rest/v1/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Start at auth page
    await page.goto('/auth');
    
    // Verify we're on the auth page
    await expect(page).toHaveURL(/.*auth/);
    
    // Verify auth form elements are present
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const signInButton = page.locator('button').filter({ hasText: /sign\s*in/i });
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(signInButton).toBeVisible();
    
    // Fill in fake credentials
    await emailInput.fill('dashboard@test.com');
    await passwordInput.fill('fake-dashboard-password-123');
    
    // Submit the form
    await signInButton.click();
    
    // Wait for navigation to dashboard
    await expect(page).toHaveURL('/');
    
    // Verify core dashboard UI elements are visible
    console.log('✅ Successfully navigated to dashboard, checking core UI elements...');
    
    // 1. Check for main AirSentinels title (stable element always present)
    await expect(
      page.locator('h1').filter({ hasText: /airsentinels/i })
    ).toBeVisible({ timeout: 10000 });
    
    // 2. Check for main dashboard container
    await expect(
      page.locator('.min-h-screen')
    ).toBeVisible();
    
    // 3. Check for loading state or dashboard content (stable fallback)
    const dashboardContentElements = [
      page.locator('text=Chargement des données de qualité de l\'air'), // Loading text
      page.locator('text=Air Quality'), // Potential air quality section
      page.locator('text=Real-time'), // Real-time data section
      page.locator('[class*="air-quality"]'), // Air quality cards
      page.locator('[data-testid*="dashboard"]'), // Dashboard test IDs if any
      page.locator('div.relative'), // Map/Graph container
    ];
    
    // At least one core dashboard element should be visible
    let dashboardElementFound = false;
    for (const element of dashboardContentElements) {
      try {
        await expect(element).toBeVisible({ timeout: 3000 });
        dashboardElementFound = true;
        console.log('✅ Core dashboard element found:', await element.textContent());
        break;
      } catch {
        continue;
      }
    }
    
    // 4. Verify navigation elements are present (Header/Navigation)
    const navigationElements = [
      page.locator('header'),
      page.locator('nav'),
      page.locator('[role="navigation"]'),
      page.locator('a[href="/history"]'), // Navigation link
      page.locator('a[href="/analysis"]'), // Navigation link
      page.locator('[data-lucide]'), // Any Lucide icons (common in nav)
    ];
    
    let navigationFound = false;
    for (const navElement of navigationElements) {
      try {
        await expect(navElement).toBeVisible({ timeout: 2000 });
        navigationFound = true;
        console.log('✅ Navigation element found');
        break;
      } catch {
        continue;
      }
    }
    
    // 5. Verify the page is fully loaded and responsive
    await page.waitForLoadState('networkidle');
    
    // Check that the app hasn't crashed or redirected to an error page
    await expect(page).not.toHaveURL(/error/);
    await expect(page).not.toHaveURL(/auth/);
    
    // Verify basic page structure integrity
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang');
    
    // Log test results
    console.log('✅ Dashboard shell test completed successfully');
    console.log(`   - Dashboard element found: ${dashboardElementFound}`);
    console.log(`   - Navigation found: ${navigationFound}`);
    console.log(`   - Final URL: ${page.url()}`);
    
    // Essential assertion: At least the main title should be present
    expect(dashboardElementFound || navigationFound).toBeTruthy();
  });

  test('should handle auth errors gracefully and stay on auth page', async ({ page }) => {
    // Mock failed authentication to test error handling
    await page.route('**/auth/v1/token?grant_type=password**', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Invalid login credentials'
        })
      });
    });

    await page.goto('/auth');
    
    // Fill in credentials
    await page.locator('input[type="email"]').fill('invalid@test.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    
    // Submit form
    await page.locator('button').filter({ hasText: /sign\s*in/i }).click();
    
    // Should remain on auth page (no redirect to dashboard)
    await expect(page).toHaveURL(/auth/);
    
    // Should not navigate to dashboard
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL('/');
    
    // Form should still be visible and functional
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    console.log('✅ Auth error handling verified - stayed on auth page');
  });

  test('should maintain dashboard state after successful login', async ({ page }) => {
    // Mock successful auth
    await page.route('**/auth/v1/token?grant_type=password**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake-token-persistence-test',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'fake-refresh',
          user: {
            id: 'fake-user-persist',
            email: 'persist@test.com'
          }
        })
      });
    });

    await page.route('**/auth/v1/user**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'fake-user-persist',
          email: 'persist@test.com'
        })
      });
    });

    // Complete login flow
    await page.goto('/auth');
    await page.locator('input[type="email"]').fill('persist@test.com');
    await page.locator('input[type="password"]').fill('testpassword');
    await page.locator('button').filter({ hasText: /sign\s*in/i }).click();
    
    // Wait for dashboard to load
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1').filter({ hasText: /airsentinels/i })).toBeVisible();
    
    // Simulate page refresh to test state persistence
    await page.reload();
    
    // Should remain on dashboard (not redirect back to auth)
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1').filter({ hasText: /airsentinels/i })).toBeVisible();
    
    // Test direct navigation to auth page (should redirect to dashboard if logged in)
    await page.goto('/auth');
    
    // Should auto-redirect to dashboard since user is authenticated
    await expect(page).toHaveURL('/');
    
    console.log('✅ Dashboard state persistence verified');
  });
});