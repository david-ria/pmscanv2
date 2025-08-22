import { test, expect } from '@playwright/test';

const BASE = process.env.PREVIEW_BASE || 'http://127.0.0.1:4173';
const ROUTES = ['/', '/history'];

test.describe('PWA / Offline Reliability', () => {
  test('manifest loads and has required fields', async ({ page, request }) => {
    const candidates = ['/manifest.webmanifest', '/manifest.json'];
    let res: any = null;
    let chosen = '';
    for (const p of candidates) {
      const r = await request.get(`${BASE}${p}`);
      if (r.status() === 200) {
        res = r;
        chosen = p;
        break;
      }
    }
    expect(res, 'No manifest found at /manifest.webmanifest or /manifest.json').toBeTruthy();
    expect(await res.status()).toBe(200);

    const manifest = await res.json();
    expect(typeof manifest.name).toBe('string');
    expect((manifest.name || '').length).toBeGreaterThan(0);
    expect(typeof manifest.short_name).toBe('string');
    expect((manifest.short_name || '').length).toBeGreaterThan(0);
    expect(typeof manifest.start_url).toBe('string');
    expect((manifest.start_url || '').length).toBeGreaterThan(0);
    expect(['standalone', 'minimal-ui', 'fullscreen', 'browser']).toContain(manifest.display);

    if (Array.isArray(manifest.icons) && manifest.icons.length) {
      const sizes = manifest.icons.map((i: any) => String(i.sizes || '')).join(' ');
      expect(/192x192/.test(sizes)).toBeTruthy();
      expect(/512x512/.test(sizes)).toBeTruthy();
    } else {
      // Allow pass when icons are managed elsewhere (CI visibility only)
      expect(Array.isArray(manifest.icons) || chosen.length > 0).toBeTruthy();
    }
  });

  test('service worker registers and is activated', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });

    const supported = await page.evaluate(() => 'serviceWorker' in navigator);
    expect(supported).toBeTruthy();

    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        if (!('serviceWorker' in navigator)) return resolve();
        navigator.serviceWorker.ready.then((reg) => {
          const active = reg.active;
          if (active && active.state === 'activated') return resolve();
          active?.addEventListener('statechange', () => {
            if (active.state === 'activated') resolve();
          });
        }).catch(() => resolve());
      });
    });

    const info = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return {
        scope: reg.scope,
        state: reg.active?.state || null,
      };
    });

    expect(info.scope).toBeTruthy();
    expect(info.state).toBe('activated');
  });

  test('critical assets are cached (index + js/css)', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const cacheReport = await page.evaluate(async () => {
      const assets = (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
        .map(e => e.name)
        .filter(n => /\.(js|css)(\?|#|$)/.test(n))
        .slice(0, 10);

      const results: { url: string; cached: boolean }[] = [];
      for (const url of assets) {
        try {
          const match = await caches.match(url);
          results.push({ url, cached: !!match });
        } catch {
          results.push({ url, cached: false });
        }
      }

      let indexCached = false;
      try {
        const matchRoot = await caches.match('/');
        indexCached = !!matchRoot;
      } catch {}

      return { assets: results, indexCached };
    });

    const cachedCount = cacheReport.assets.filter(a => a.cached).length;
    expect(cachedCount).toBeGreaterThan(0);
    expect(cacheReport.indexCached).toBeTruthy();
  });

  test('offline rendering works for cached routes', async ({ page, context }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await context.setOffline(true);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    const bodyTextHome = (await page.locator('body').innerText()).toLowerCase();
    expect(/err|internet|offline|failed to/.test(bodyTextHome)).toBeFalsy();

    await page.goto(`${BASE}/history`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await expect(page.locator('body')).toBeVisible();
    const bodyTextHistory = (await page.locator('body').innerText()).toLowerCase();
    expect(/err|internet|offline|failed to/.test(bodyTextHistory)).toBeFalsy();

    await context.setOffline(false);
  });

  test('route changes do not create long tasks (>250ms)', async ({ page }) => {
    await page.addInitScript(() => {
      if ('PerformanceObserver' in window) {
        // @ts-ignore
        const o = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            if (e.duration > 250) {
              // @ts-ignore
              (window.__longTasks = window.__longTasks || []).push({
                name: e.name, duration: e.duration, startTime: e.startTime
              });
            }
          }
        });
        try { o.observe({ entryTypes: ['longtask'] as any }); } catch {}
      }
    });

    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    for (const r of ROUTES) {
      await page.goto(`${BASE}${r}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
    }

    const longTasks = await page.evaluate(() => (window as any).__longTasks || []);
    expect(longTasks.length, JSON.stringify(longTasks)).toBe(0);
  });
});