import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://127.0.0.1:4173';
const ROUTES = ['/', '/auth', '/history'];

test.describe('Energy & Background Resource Guardrails', () => {
  test('no auto-permission prompts on load (/)', async ({ page }) => {
    const prompts: string[] = [];
    await page.addInitScript(() => {
      const origNotif = Notification.requestPermission?.bind(Notification);
      // @ts-ignore
      Notification.requestPermission = (...args: any[]) => {
        // @ts-ignore
        (window.__prompts = window.__prompts || []).push('notification');
        // @ts-ignore
        return origNotif?.(...args);
      };
      const origGeo = navigator.geolocation?.getCurrentPosition?.bind(navigator.geolocation);
      // @ts-ignore
      navigator.geolocation.getCurrentPosition = (...args: any[]) => {
        // @ts-ignore
        (window.__prompts = window.__prompts || []).push('geolocation');
        // @ts-ignore
        return origGeo?.(...args);
      };
    });

    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const recorded = await page.evaluate(() => (window as any).__prompts || []);
    prompts.push(...recorded);
    expect(prompts, `Unexpected permission prompts: ${prompts.join(', ')}`).toHaveLength(0);
  });

  for (const route of ROUTES) {
    test(`${route} idle rAF/polling bounded and no runaway WebSockets`, async ({ page }) => {
      await page.addInitScript(() => {
        // rAF tracking
        let rafCount = 0;
        const origRAF = window.requestAnimationFrame.bind(window);
        // @ts-ignore
        window.requestAnimationFrame = (cb: FrameRequestCallback) => {
          rafCount++;
          // @ts-ignore
          (window.__energy = window.__energy || { raf: 0, intervals: [], sockets: 0 });
          // @ts-ignore
          window.__energy.raf = rafCount;
          return origRAF(cb);
        };

        // Interval tracking
        const recorded: Array<{ type: 'interval' | 'timeout'; ms: number }> = [];
        const oSetInterval = window.setInterval.bind(window);
        const oSetTimeout = window.setTimeout.bind(window);
        // @ts-ignore
        window.setInterval = (fn: any, ms?: number, ...rest: any[]) => {
          recorded.push({ type: 'interval', ms: Number(ms ?? 0) });
          // @ts-ignore
          (window.__energy = window.__energy || { raf: 0, intervals: [], sockets: 0 }).intervals = recorded;
          // @ts-ignore
          return oSetInterval(fn, ms, ...rest);
        };
        // @ts-ignore
        window.setTimeout = (fn: any, ms?: number, ...rest: any[]) => {
          recorded.push({ type: 'timeout', ms: Number(ms ?? 0) });
          // @ts-ignore
          (window.__energy = window.__energy || { raf: 0, intervals: [], sockets: 0 }).intervals = recorded;
          // @ts-ignore
          return oSetTimeout(fn, ms, ...rest);
        };

        // WebSocket tracking
        const OrigWS = window.WebSocket;
        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).WebSocket = function (...args: any[]) {
          // @ts-ignore
          (window.__energy = window.__energy || { raf: 0, intervals: [], sockets: 0 }).sockets++;
          // @ts-ignore
          return new OrigWS(...args);
        } as unknown as typeof WebSocket;
      });

      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });

      // Observe ~2 seconds of idle time for background activity
      await page.waitForTimeout(2000);

      const energy = await page.evaluate(() => (window as any).__energy || { raf: 0, intervals: [], sockets: 0 });

      // rAF should not explode while idle (allow small activity for charts/animations)
      expect(energy.raf).toBeLessThanOrEqual(240); // ~120fps * 2s upper bound

      // Tight polling detection: intervals < 1000ms should be minimal
      const tightIntervals = (energy.intervals || []).filter((e: any) => e.type === 'interval' && e.ms > 0 && e.ms < 1000);
      expect(tightIntervals.length).toBeLessThanOrEqual(3);

      // Too many simultaneous sockets is suspicious (allow 1 live subscription max)
      expect(energy.sockets).toBeLessThanOrEqual(2);
    });
  }

  test('Chromium: CPU time bounded over navigation loop', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'CPU metric only in Chromium via performance API proxies');
    await page.addInitScript(() => {
      // Basic CPU estimator based on long task count & total duration
      // Requires Long Task API; may be empty on some runs.
      if ('PerformanceObserver' in window) {
        // @ts-ignore
        (window.__cpu = { longTasks: 0, totalLongTaskTime: 0 });
        const o = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            if (e.duration > 50) {
              // @ts-ignore
              window.__cpu.longTasks++;
              // @ts-ignore
              window.__cpu.totalLongTaskTime += e.duration;
            }
          }
        });
        try { o.observe({ entryTypes: ['longtask'] as any }); } catch {}
      }
    });

    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    for (const r of ROUTES.concat(ROUTES)) {
      await page.goto(`${BASE}${r}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(150);
    }
    const cpu = await page.evaluate(() => (window as any).__cpu || { longTasks: 0, totalLongTaskTime: 0 });
    // Guardrails: few long tasks total and < 800ms accumulated across loop
    expect(cpu.longTasks).toBeLessThanOrEqual(6);
    expect(cpu.totalLongTaskTime).toBeLessThanOrEqual(800);
  });
});