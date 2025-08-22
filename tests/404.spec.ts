import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';

test.describe('404 page', () => {
  test('unknown route renders graceful 404 without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const unhandled: string[] = [];

    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => pageErrors.push(String(err)));
    await page.exposeFunction('__onunhandled', (e: any) => unhandled.push(String(e)));
    await page.addInitScript(() => {
      window.addEventListener('unhandledrejection', (e) => (window as any).__onunhandled?.(e?.reason || 'unhandledrejection'));
    });

    await page.goto(`${BASE}/this-route-does-not-exist-404-test`, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('body')).toBeVisible();
    const hasMainOrMessage =
      (await page.locator('main, [role="main"]').first().count()) > 0 ||
      (await page.locator('text=/404|not found/i').first().count()) > 0;
    expect(hasMainOrMessage).toBeTruthy();

    const benign = (m: string) => /favicon|ERR_BLOCKED_BY_CLIENT/.test(m);
    const hardErrors = [...consoleErrors, ...pageErrors, ...unhandled].filter((m) => !benign(m));
    expect(hardErrors, `Errors on 404: \n${hardErrors.join('\n')}`).toHaveLength(0);
  });
});