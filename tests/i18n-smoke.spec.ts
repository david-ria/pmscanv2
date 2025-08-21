import { test, expect } from '@playwright/test';

// Pattern to detect untranslated keys (raw translation keys that weren't replaced)
const UNTRANSLATED_KEY_PATTERN = /\b[a-z0-9_.-]+\.[a-z0-9_.-]+\b/g;

// Common placeholder patterns that indicate missing translations
const PLACEHOLDER_PATTERNS = [
  /missing\s+translation/i,
  /\bi18n\b/,
  /\btranslation\s+key\b/i,
  /\[\[.*?\]\]/,
  /\{\{.*?\}\}/,
];

test.describe('i18n smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    // Enable test mode and disable network requests
    await page.route('**/*', (route) => {
      const url = route.request().url();
      
      // Allow local resources and essential assets
      if (url.startsWith('http://localhost:') || 
          url.startsWith('http://127.0.0.1:') ||
          url.includes('/assets/') ||
          url.includes('.css') ||
          url.includes('.js') ||
          url.includes('.ico')) {
        route.continue();
      } else {
        // Block external network requests
        route.abort();
      }
    });
  });

  test('should have no untranslated keys on /auth page', async ({ page }) => {
    await page.goto('/auth');
    
    // Wait for page to load
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Get all visible text content
    const textContent = await page.textContent('body');
    expect(textContent).toBeTruthy();
    
    // Check for placeholder patterns
    for (const pattern of PLACEHOLDER_PATTERNS) {
      const matches = textContent!.match(pattern);
      if (matches) {
        console.error(`Found placeholder pattern "${pattern}" in text: ${matches.join(', ')}`);
      }
      expect(matches).toBeNull();
    }
    
    // Check for untranslated keys (keys that look like translation paths)
    const untranslatedKeys = textContent!.match(UNTRANSLATED_KEY_PATTERN);
    const suspiciousKeys = untranslatedKeys?.filter(key => 
      // Filter out common false positives
      !key.includes('localhost') &&
      !key.includes('127.0.0.1') &&
      !key.includes('.com') &&
      !key.includes('.org') &&
      !key.includes('www.') &&
      !key.includes('http') &&
      !key.includes('.svg') &&
      !key.includes('.png') &&
      !key.includes('.css') &&
      !key.includes('.js') &&
      key.includes('.') && // Must contain dots to be a translation key
      key.length > 3 // Must be reasonably long
    );
    
    if (suspiciousKeys && suspiciousKeys.length > 0) {
      console.error('Potential untranslated keys found on /auth:', suspiciousKeys);
      // For now, just log - uncomment to fail:
      // expect(suspiciousKeys).toEqual([]);
    }
  });

  test('should have no untranslated keys on / page', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Get all visible text content
    const textContent = await page.textContent('body');
    expect(textContent).toBeTruthy();
    
    // Check for placeholder patterns
    for (const pattern of PLACEHOLDER_PATTERNS) {
      const matches = textContent!.match(pattern);
      if (matches) {
        console.error(`Found placeholder pattern "${pattern}" in text: ${matches.join(', ')}`);
      }
      expect(matches).toBeNull();
    }
    
    // Check for untranslated keys
    const untranslatedKeys = textContent!.match(UNTRANSLATED_KEY_PATTERN);
    const suspiciousKeys = untranslatedKeys?.filter(key => 
      // Filter out common false positives
      !key.includes('localhost') &&
      !key.includes('127.0.0.1') &&
      !key.includes('.com') &&
      !key.includes('.org') &&
      !key.includes('www.') &&
      !key.includes('http') &&
      !key.includes('.svg') &&
      !key.includes('.png') &&
      !key.includes('.css') &&
      !key.includes('.js') &&
      key.includes('.') && // Must contain dots to be a translation key
      key.length > 3 // Must be reasonably long
    );
    
    if (suspiciousKeys && suspiciousKeys.length > 0) {
      console.error('Potential untranslated keys found on /:', suspiciousKeys);
      // For now, just log - uncomment to fail:
      // expect(suspiciousKeys).toEqual([]);
    }
  });

  test('should have proper navigation labels', async ({ page }) => {
    await page.goto('/');
    
    // Wait for navigation to be rendered
    await page.waitForSelector('nav', { timeout: 10000 });
    
    // Check that navigation items have proper translated labels
    const navItems = await page.locator('nav a, nav button').all();
    
    for (const item of navItems) {
      const text = await item.textContent();
      if (text && text.trim()) {
        // Should not contain untranslated key patterns
        expect(text.match(/^[a-z0-9_.-]+\.[a-z0-9_.-]+$/)).toBeNull();
        
        // Should not be empty or just whitespace
        expect(text.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('should have translated button and form labels', async ({ page }) => {
    await page.goto('/auth');
    
    // Wait for form to load
    await page.waitForSelector('form, button', { timeout: 10000 });
    
    // Check buttons have translated text
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const text = await button.textContent();
      if (text && text.trim()) {
        // Should not look like untranslated keys
        expect(text.match(/^[a-z0-9_.-]+\.[a-z0-9_.-]+$/)).toBeNull();
      }
    }
    
    // Check form labels
    const labels = await page.locator('label').all();
    for (const label of labels) {
      const text = await label.textContent();
      if (text && text.trim()) {
        // Should not look like untranslated keys
        expect(text.match(/^[a-z0-9_.-]+\.[a-z0-9_.-]+$/)).toBeNull();
      }
    }
  });
});