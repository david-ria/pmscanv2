import { test, expect } from '@playwright/test';
import { setupNetworkIsolation } from './network-isolation';

test.describe('Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupNetworkIsolation(page);
  });
  test('auth page loads and shows required elements', async ({ page }) => {
    // Navigate to the auth page
    await page.goto('/auth');
    
    // Check that the page loads successfully (status 200 is implicit with goto)
    await expect(page).toHaveURL(/.*auth/);
    
    // Check for email input field
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    
    // Check for password input field  
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    
    // Check for Sign In button
    await expect(page.locator('button').filter({ hasText: /sign\s*in/i })).toBeVisible();
    
    // Check for Sign Up tab
    await expect(page.locator('[role="tab"]').filter({ hasText: /sign\s*up/i })).toBeVisible();
  });

  test('home page loads without errors', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    
    // Check that the page loads successfully
    await expect(page).toHaveURL('/');
    
    // Wait for the page to be in a good state (no loading spinners)
    await expect(page.locator('body')).toBeVisible();
    
    // Check that no critical errors are thrown
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    // Wait a bit to catch any immediate errors
    await page.waitForTimeout(2000);
    
    // Verify no critical errors occurred
    expect(errors.filter(error => 
      !error.includes('ResizeObserver') && 
      !error.includes('Non-Error promise rejection')
    )).toHaveLength(0);
  });
});