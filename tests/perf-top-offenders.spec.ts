import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://127.0.0.1:4173';
const ROUTES = ['/', '/auth', '/history'];

test.describe('Perf Top Offenders Reporter', () => {
  for (const route of ROUTES) {
    test(`report largest/slowest resources on ${route}`, async ({ page }) => {
      await page.route('**/*', (route) => {
        const url = route.request().url();
        if (url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost') || url.startsWith('file:') || url.startsWith('data:') || url.startsWith('blob:')) {
          return route.continue();
        }
        return route.abort(); // block 3rd-party
      });

      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);

      const resources = await page.evaluate(() => {
        const perf = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        // best-effort transfer size using 'decodedBodySize' when available
        return perf.map((e) => ({
          name: e.name,
          type: (e as any).initiatorType || 'other',
          duration: e.duration,
          size: (e as any).transferSize || (e as any).decodedBodySize || 0,
        }));
      });

      const bySize = [...resources].sort((a, b) => b.size - a.size).slice(0, 8);
      const byDuration = [...resources].sort((a, b) => b.duration - a.duration).slice(0, 8);

      console.log(`\n=== Top Resource Sizes on ${route} ===`);
      bySize.forEach((r) => console.log(`• ${(r.size/1024).toFixed(1)} KB  ${r.type}  ${r.name}`));

      console.log(`\n=== Top Resource Durations on ${route} ===`);
      byDuration.forEach((r) => console.log(`• ${r.duration.toFixed(1)} ms  ${r.type}  ${r.name}`));

      // basic sanity: page loaded some resources
      expect(resources.length).toBeGreaterThan(0);
    });
  }
});