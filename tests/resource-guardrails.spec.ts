import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:4173';
const ROUTES = ['/', '/auth', '/history'];

test.describe('Resource guardrails', () => {
  test('no excessive console logging on /', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', m => { if (m.type() !== 'warning') logs.push(m.text()); });
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    expect(logs.length).toBeLessThan(25);
  });

  test('detect tight polling/intervals', async ({ page }) => {
    await page.addInitScript(() => {
      const origSetInterval = window.setInterval;
      const origSetTimeout = window.setTimeout;
      const recorded: any[] = [];
      // @ts-ignore
      window.__intervals = recorded;
      // @ts-ignore
      window.setInterval = (fn: any, ms?: number, ...rest: any[]) => {
        recorded.push({ type: 'interval', ms: Number(ms ?? 0) });
        // @ts-ignore
        return origSetInterval(fn, ms, ...rest);
      };
      // @ts-ignore
      window.setTimeout = (fn: any, ms?: number, ...rest: any[]) => {
        recorded.push({ type: 'timeout', ms: Number(ms ?? 0) });
        // @ts-ignore
        return origSetTimeout(fn, ms, ...rest);
      };
    });

    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const recorded = await page.evaluate(() => (window as any).__intervals as {type:string,ms:number}[] || []);
    const tight = recorded.filter(r => r.type === 'interval' && r.ms > 0 && r.ms < 5000);
    expect(tight.length).toBeLessThanOrEqual(3);
  });

  test('heap usage does not balloon over route loops (Chromium)', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'heap metric only in Chromium');
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    const getHeap = async () =>
      (await page.evaluate(() => (performance as any).memory?.usedJSHeapSize ?? null)) as number | null;

    const start = await getHeap();
    for (const r of ROUTES.concat(ROUTES)) {
      await page.goto(`${BASE}${r}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(150);
    }
    const end = await getHeap();

    if (start !== null && end !== null) {
      const growth = end - start;                // bytes
      const maxAllowed = 20 * 1024 * 1024;       // 20 MB
      expect(growth).toBeLessThan(maxAllowed);
    } else {
      expect(true).toBeTruthy(); // metric unavailable; do not fail
    }
  });

  test('localStorage churn is bounded during initial load', async ({ page }) => {
    await page.addInitScript(() => {
      const origSet = window.localStorage.setItem.bind(window.localStorage);
      let count = 0; let bytes = 0;
      // @ts-ignore
      window.__ls = { count: 0, bytes: 0 };
      window.localStorage.setItem = (k: string, v: string) => {
        count++; bytes += (k.length + (v?.length ?? 0));
        // @ts-ignore
        window.__ls = { count, bytes };
        return origSet(k, v);
      };
    });
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const { count, bytes } = await page.evaluate(() => (window as any).__ls || { count: 0, bytes: 0 });
    expect(count).toBeLessThan(50);
    expect(bytes).toBeLessThan(200 * 1024); // 200 KB
  });
});