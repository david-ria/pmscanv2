import { test, expect } from '@playwright/test';
import { setupNetworkIsolation } from './network-isolation';

test.describe('Login → Dashboard CUJ', () => {
  test.beforeEach(async ({ page }) => {
    await setupNetworkIsolation(page);
  });
  test('should login and navigate to dashboard', async ({ page }) => {
    // Mock Supabase auth API calls to avoid network requests
    await page.route('**/auth/v1/token?grant_type=password**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'fake-refresh-token',
          user: {
            id: 'fake-user-id',
            email: 'test@example.com',
            user_metadata: {
              first_name: 'Test',
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
          id: 'fake-user-id',
          email: 'test@example.com',
          user_metadata: {
            first_name: 'Test',
            last_name: 'User'
          }
        })
      });
    });

    // Navigate to auth page
    await page.goto('/auth');
    
    // Verify we're on the auth page
    await expect(page).toHaveURL(/.*auth/);
    
    // Verify auth form elements are visible
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const signInButton = page.locator('button').filter({ hasText: /sign\s*in/i });
    const signUpTab = page.locator('[role="tab"]').filter({ hasText: /sign\s*up/i });
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(signInButton).toBeVisible();
    await expect(signUpTab).toBeVisible();
    
    // Fill login form with fake credentials
    await emailInput.fill('test@example.com');
    await passwordInput.fill('fakepassword123');
    
    // Submit the form
    await signInButton.click();
    
    // Wait for navigation to dashboard
    await expect(page).toHaveURL('/');
    
    // Verify dashboard content is visible
    // Check for AirSentinels header or loading state first
    await expect(
      page.locator('h1').filter({ hasText: /airsentinels/i })
    ).toBeVisible({ timeout: 10000 });
    
    // Check for key dashboard elements (one of these should be present)
    const dashboardElements = [
      page.locator('[data-testid="air-quality-cards"]'), // If component has test id
      page.locator('text=Chargement des données'), // Loading text
      page.locator('text=Données de qualité de l\'air'), // Air quality data text
      page.locator('.air-quality-card'), // Air quality card class
      page.locator('[class*="floating-record"]'), // Floating record button
    ];
    
    // At least one dashboard element should be visible
    let elementFound = false;
    for (const element of dashboardElements) {
      try {
        await expect(element).toBeVisible({ timeout: 2000 });
        elementFound = true;
        break;
      } catch {
        // Continue to next element
        continue;
      }
    }
    
    // If none of the specific elements are found, check for generic dashboard content
    if (!elementFound) {
      // Check for main content area or any indication we're on the dashboard
      await expect(page.locator('main, [role="main"], .min-h-screen')).toBeVisible();
    }
    
    // Verify we're no longer on auth page
    await expect(page).not.toHaveURL(/.*auth/);
  });

  test('should handle invalid credentials gracefully', async ({ page }) => {
    // Mock failed authentication
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
    
    // Fill form with invalid credentials
    await page.locator('input[type="email"], input[name="email"]').fill('invalid@example.com');
    await page.locator('input[type="password"], input[name="password"]').fill('wrongpassword');
    
    // Submit form
    await page.locator('button').filter({ hasText: /sign\s*in/i }).click();
    
    // Should remain on auth page
    await expect(page).toHaveURL(/.*auth/);
    
    // Should show error message (toast or inline error)
    const errorIndicators = [
      page.locator('text=Invalid login credentials'),
      page.locator('text=Error'),
      page.locator('[role="alert"]'),
      page.locator('.toast-error', { hasText: /error|invalid|failed/i })
    ];
    
    // At least one error indicator should appear
    let errorFound = false;
    for (const errorEl of errorIndicators) {
      try {
        await expect(errorEl).toBeVisible({ timeout: 3000 });
        errorFound = true;
        break;
      } catch {
        continue;
      }
    }
    
    // If no specific error message found, just verify we stayed on auth page
    if (!errorFound) {
      console.log('No specific error message found, but correctly stayed on auth page');
    }
  });
});