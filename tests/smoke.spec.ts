import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';
const ROUTES = ['/', '/auth', '/history'];

test.describe('Smoke', () => {
  for (const route of ROUTES) {
    test(`loads ${route} with no console errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const unhandled: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => pageErrors.push(String(err)));
      page.on('requestfailed', (req) => {
        // ignore favicon/network idle races
        const url = req.url();
        if (!/favicon\.ico$/.test(url)) consoleErrors.push(`requestfailed: ${url} - ${req.failure()?.errorText}`);
      });
      page.on('response', async (resp) => {
        const status = resp.status();
        const url = resp.url();
        if (status >= 400 && !/favicon\.ico$/.test(url)) {
          consoleErrors.push(`http${status}: ${url}`);
        }
      });
      await page.exposeFunction('__onunhandled', (e: any) => unhandled.push(String(e)));
      await page.addInitScript(() => {
        window.addEventListener('unhandledrejection', (e) => (window as any).__onunhandled?.(e?.reason || 'unhandledrejection'));
      });

      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });

      await expect(page.locator('body')).toBeVisible();
      const hasMain = await page.locator('main, [role="main"]').first().count();
      expect(hasMain).toBeGreaterThan(0);

      const benign = (msg: string) =>
        /ERR_BLOCKED_BY_CLIENT|favicon|Failed to fetch dynamically imported module/.test(msg);

      const hardErrors = [...consoleErrors, ...pageErrors, ...unhandled].filter((m) => !benign(m));
      expect(hardErrors, `Errors on ${route}:\n${hardErrors.join('\n')}`).toHaveLength(0);
    });
  }
});