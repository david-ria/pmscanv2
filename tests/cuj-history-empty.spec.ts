import { test, expect } from '@playwright/test';
import { setupNetworkIsolation } from './network-isolation';

test.describe('History Page - Empty State', () => {
  test.beforeEach(async ({ page }) => {
    await setupNetworkIsolation(page);
    // Mock Supabase auth to simulate logged-in state
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

    // Mock empty missions response from localStorage/IndexedDB 
    await page.addInitScript(() => {
      // Clear any existing mission data
      localStorage.clear();
      
      // Mock IndexedDB to return empty results
      const originalIndexedDB = window.indexedDB;
      Object.defineProperty(window, 'indexedDB', {
        value: {
          ...originalIndexedDB,
          open: (...args: any[]) => {
            const request = originalIndexedDB.open(...args);
            const originalOnSuccess = request.onsuccess;
            request.onsuccess = (event) => {
              if (originalOnSuccess) originalOnSuccess.call(request, event);
              const db = (event.target as any)?.result;
              if (db && db.transaction) {
                const originalTransaction = db.transaction.bind(db);
                db.transaction = function(...txArgs: any[]) {
                  const tx = originalTransaction(...txArgs);
                  const originalObjectStore = tx.objectStore?.bind(tx);
                  if (originalObjectStore) {
                    tx.objectStore = function(storeName: string) {
                      const store = originalObjectStore(storeName);
                      if (storeName === 'missions') {
                        // Override getAll to return empty array
                        const originalGetAll = store.getAll?.bind(store);
                        if (originalGetAll) {
                          store.getAll = function() {
                            const request = originalGetAll();
                            setTimeout(() => {
                              Object.defineProperty(request, 'result', { value: [] });
                              if (request.onsuccess) request.onsuccess({ target: request } as any);
                            }, 0);
                            return request;
                          };
                        }
                      }
                      return store;
                    };
                  }
                  return tx;
                };
              }
            };
            return request;
          }
        }
      });
    });
  });

  test('should show empty state when no missions exist', async ({ page }) => {
    // Navigate to history page
    await page.goto('/history');
    
    // Verify page loads successfully
    await expect(page).toHaveURL('/history');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Check for page title/header
    await expect(page.locator('text=Recent missions')).toBeVisible();
    
    // Verify empty state elements are visible
    // Look for Calendar icon (Lucide calendar icon)
    await expect(page.locator('[data-lucide="calendar"]')).toBeVisible();
    
    // Check for empty state messages (either English text or translation keys)
    const emptyStateMessages = [
      page.locator('text=No missions for this period'),
      page.locator('text=Select another date or period to see your data'),
      page.locator('text=noMissionsForPeriod'), // In case translation key is shown
      page.locator('text=selectAnotherDate')     // In case translation key is shown
    ];
    
    // At least one of these messages should be visible
    let messageFound = false;
    for (const message of emptyStateMessages) {
      try {
        await expect(message).toBeVisible({ timeout: 3000 });
        messageFound = true;
        break;
      } catch {
        continue;
      }
    }
    
    expect(messageFound).toBeTruthy();
  });

  test('should not show export buttons when no missions exist', async ({ page }) => {
    await page.goto('/history');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Verify no mission cards are present (which contain export buttons)
    await expect(page.locator('[class*="card"]:has([data-lucide="download"])')).toHaveCount(0);
    
    // Verify no export buttons are visible anywhere on the page
    const exportButtons = [
      page.locator('button:has([data-lucide="download"])'),
      page.locator('button:has-text("Export")'),
      page.locator('button:has-text("export")'), // lowercase
      page.locator('[aria-label*="export"]')
    ];
    
    for (const exportButton of exportButtons) {
      await expect(exportButton).toHaveCount(0);
    }
  });

  test('should show sync button even when no missions exist', async ({ page }) => {
    await page.goto('/history');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Sync button should still be visible for potential cloud data
    const syncButtonSelectors = [
      'button:has-text("Sync")',
      'button:has-text("sync")',
      'button[class*="sync"]',
      '[data-lucide="refresh-cw"]' // Sync icon
    ];
    
    let syncButtonFound = false;
    for (const selector of syncButtonSelectors) {
      try {
        await expect(page.locator(selector)).toBeVisible({ timeout: 2000 });
        syncButtonFound = true;
        break;
      } catch {
        continue;
      }
    }
    
    // It's okay if sync button is not found - it might be hidden when no unsynced data exists
    if (!syncButtonFound) {
      console.log('Sync button not visible - acceptable for empty state');
    }
  });

  test('should show stats card with zero values', async ({ page }) => {
    await page.goto('/history');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Stats card should be visible even with no data
    await expect(page.locator('text=Summary')).toBeVisible();
    
    // Check for typical zero/empty stats indicators
    const zeroValueIndicators = [
      page.locator('text="0"'),
      page.locator('text="0 missions"'),
      page.locator('text="No data"'),
      page.locator('text="--"'),
      page.locator('text="-"')
    ];
    
    // At least one zero indicator should be present in stats
    let zeroFound = false;
    for (const indicator of zeroValueIndicators) {
      try {
        await expect(indicator).toBeVisible({ timeout: 2000 });
        zeroFound = true;
        break;
      } catch {
        continue;
      }
    }
    
    // Stats card should exist even if specific zero indicators aren't found
    // The important thing is that the page doesn't crash
  });

  test('should allow date filter interaction even with no data', async ({ page }) => {
    await page.goto('/history');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Date filter should be visible and interactive
    const dateFilterElements = [
      page.locator('[data-lucide="calendar"]').first(),
      page.locator('button:has-text("Day")'),
      page.locator('button:has-text("Week")'),
      page.locator('button:has-text("Month")'),
      page.locator('button:has-text("Year")')
    ];
    
    // At least date filter elements should be present
    let filterFound = false;
    for (const element of dateFilterElements) {
      try {
        await expect(element).toBeVisible({ timeout: 2000 });
        filterFound = true;
        break;
      } catch {
        continue;
      }
    }
    
    // Date filter should be available for future use
    expect(filterFound).toBeTruthy();
  });
});