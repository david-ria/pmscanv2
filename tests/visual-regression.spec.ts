import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:4173';
const ROUTES = ['/', '/auth', '/history'];

const VIEWPORTS = [
  { name: 'mobile', width: 360, height: 740 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

test.describe('Visual baseline', () => {
  for (const route of ROUTES) {
    for (const vp of VIEWPORTS) {
      test(`${route} @ ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.addStyleTag({ content: `
          * { animation: none !important; transition: none !important; }
          html { scroll-behavior: auto !important; }
          @media (prefers-reduced-motion: no-preference) {
            * { animation-duration: 0s !important; }
          }
        `});
        await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(200);

        const masks = [
          page.locator('video'),
          page.locator('[data-testid="dynamic-time"], time'),
          page.locator('canvas'),
        ];

        await expect(page).toHaveScreenshot(
          `${route.replace(/\//g, '_')}-${vp.name}.png`,
          { fullPage: true, maxDiffPixelRatio: 0.01, mask: masks }
        );
      });
    }
  }
});