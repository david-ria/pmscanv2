import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE = 'http://127.0.0.1:4173';
const ROUTES = ['/', '/auth', '/history'];

test.describe('Accessibility', () => {
  for (const route of ROUTES) {
    test(`axe scan on ${route}`, async ({ page }) => {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      expect(results.violations, JSON.stringify(results.violations, null, 2)).toHaveLength(0);
    });
  }

  test('form elements have accessible labels on /auth', async ({ page }) => {
    await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded' });
    const inputs = page.locator('input, textarea, select');
    const n = await inputs.count();
    for (let i = 0; i < n; i++) {
      const el = inputs.nth(i);
      if (await el.isVisible()) {
        const id = await el.getAttribute('id');
        const aria = (await el.getAttribute('aria-label')) || '';
        const labelled = id ? await page.locator(`label[for="${id}"]`).count() : 0;
        expect(labelled > 0 || aria.length > 0).toBeTruthy();
      }
    }
  });
});