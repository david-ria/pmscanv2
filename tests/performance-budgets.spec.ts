import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const budgets = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'perf-report', 'budgets.json'), 'utf8'));
const ROUTES = ['/', '/auth', '/history'];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('testMode', 'true');
  });
});

for (const route of ROUTES) {
  test(`Performance budgets for ${route}`, async ({ page }) => {
    const networkRequests: { url: string; status: number; size: number }[] = [];
    let totalTransferSize = 0;

    page.on('response', async (response) => {
      const url = response.url();
      const status = response.status();
      const size = parseInt(response.headers()['content-length'] || '0', 10);
      networkRequests.push({ url, status, size });
      if (status >= 200 && status < 300) totalTransferSize += size;
      const isLocal = url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost') || url.startsWith('file://') || url.startsWith('data:') || url.startsWith('blob:');
      if (!isLocal) throw new Error(`Third-party request detected: ${url}`);
    });

    await page.addInitScript(() => {
      if ('PerformanceObserver' in window) {
        const o = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            if (e.duration > 250) {
              (window as any).__longTasks = (window as any).__longTasks || [];
              (window as any).__longTasks.push({ name: e.name, duration: e.duration, startTime: e.startTime });
            }
          }
        });
        try { o.observe({ entryTypes: ['longtask'] as any }); } catch {}
      }
      (window as any).__vitals = {};
      (window as any).__mark = (name: string) => performance.mark(name);
      (window as any).__measure = (name: string, start: string, end: string) => {
        try { performance.measure(name, start, end); } catch {}
      };
    });

    const navStart = Date.now();
    await page.goto(`http://127.0.0.1:4173${route}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const navEnd = Date.now();
    const navigationTime = navEnd - navStart;

    const longTasks = await page.evaluate(() => (window as any).__longTasks || []);
    expect(networkRequests.length).toBeLessThanOrEqual(budgets.network.maxRequests);
    expect(totalTransferSize).toBeLessThanOrEqual(budgets.network.maxTransferBytes);
    expect(longTasks.length, JSON.stringify(longTasks)).toBe(0);
    console.log(JSON.stringify({ route, requests: networkRequests.length, transferKB: +(totalTransferSize / 1024).toFixed(1), navigationTimeMS: navigationTime, longTasks: longTasks.length }));
  });
}

test('Code splitting verification', async ({ page }) => {
  const chunks: Set<string> = new Set();
  page.on('response', async (r) => {
    const u = r.url();
    if (u.includes('.js') && (u.includes('chunk') || u.includes('/assets/'))) chunks.add(u);
  });
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForLoadState('networkidle');
  const initial = chunks.size;
  for (const r of ['/auth', '/history']) {
    await page.goto(`http://127.0.0.1:4173${r}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  }
  const total = chunks.size;
  expect(total).toBeGreaterThan(initial);
  console.log(JSON.stringify({ initialChunks: initial, totalChunks: total, dynamicLoaded: total - initial }));
});

test('Offline navigation produces no critical JS errors', async ({ page }) => {
  const jsErrors: string[] = [];
  page.on('pageerror', (e) => jsErrors.push(e.message || String(e)));
  await page.context().setOffline(true);
  for (const r of ['/', '/auth', '/history']) {
    try {
      await page.goto(`http://127.0.0.1:4173${r}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.locator('body').first().waitFor({ state: 'visible', timeout: 2000 });
    } catch {}
  }
  const critical = jsErrors.filter((m) => (m.includes('TypeError') || m.includes('ReferenceError') || m.includes('is not a function')) && !/network|fetch|ERR_/i.test(m));
  expect(critical).toHaveLength(0);
});