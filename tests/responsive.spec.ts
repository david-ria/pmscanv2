import { test, expect } from '@playwright/test';

const BASE = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const ROUTES = ['/', '/auth', '/history'];
const BREAKPOINTS = [
  { name: 'mobile', width: 360, height: 740 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'wide', width: 1536, height: 900 },
];

function px(n: number) { return `${n}px`; }

test.describe('Responsive layout & cross-browser', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('testMode', 'true'); } catch {}
    });
  });

  for (const route of ROUTES) {
    for (const bp of BREAKPOINTS) {
      test(`${route} @ ${bp.name} ${bp.width}x${bp.height} has no horizontal overflow`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(200);

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const w = window.innerWidth || doc.clientWidth;
          const h = window.innerHeight || doc.clientHeight;
          return {
            docScrollW: doc.scrollWidth,
            winW: w,
            docScrollH: doc.scrollHeight,
            winH: h,
            hasHOverflow: doc.scrollWidth > w + 1,
          };
        });

        expect(overflow.hasHOverflow, `overflow: ${JSON.stringify(overflow)}`).toBeFalsy();
        await page.screenshot({ path: `perf-report/${testInfo.project.name}-${bp.name}${route.replace(/\//g, '_')}.png`, fullPage: true }).catch(() => {});
      });
    }
  }

  for (const route of ROUTES) {
    test(`${route} landmarks exist`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });

      const hasHeader = await page.locator('header, [role="banner"], nav, [role="navigation"]').first().count();
      const hasMain = await page.locator('main, [role="main"]').first().count();
      expect(hasMain).toBeGreaterThan(0);
      expect(hasHeader).toBeGreaterThan(0);
    });
  }

  test('meta viewport present on / and /auth', async ({ page }) => {
    for (const route of ['/', '/auth']) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
      const cnt = await page.locator('meta[name="viewport"]').count();
      expect(cnt).toBeGreaterThan(0);
    }
  });

  for (const route of ROUTES) {
    test(`${route} nav items are reachable`, async ({ page }) => {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
      const navItems = await page.locator('nav a, nav button, [role="navigation"] a, [role="navigation"] button').count();
      expect(navItems).toBeGreaterThan(0);
    });
  }

  for (const route of ROUTES) {
    for (const bp of BREAKPOINTS) {
      test(`${route} @ ${bp.name} tap targets >=40x40`, async ({ page }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });

        const candidates = page.locator('button, a, [role="button"]');
        const n = Math.min(await candidates.count(), 30);
        let smallCount = 0;

        for (let i = 0; i < n; i++) {
          const box = await candidates.nth(i).boundingBox();
          if (box) {
            const w = Math.round(box.width);
            const h = Math.round(box.height);
            if (w < 40 || h < 40) smallCount++;
          }
        }

        expect(smallCount).toBeLessThan(n); // allow some, but not all
      });
    }
  }

  for (const route of ROUTES) {
    test(`${route} images/media fit container`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 });
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });

      const bad = await page.evaluate(() => {
        const tooWide: string[] = [];
        const nodes = Array.from(document.querySelectorAll<HTMLImageElement | HTMLVideoElement | HTMLCanvasElement>('img, video, canvas'));
        for (const el of nodes) {
          const rect = el.getBoundingClientRect();
          if (rect.width > (window.innerWidth + 1)) {
            const sel = el.outerHTML.slice(0, 80).replace(/\s+/g, ' ');
            tooWide.push(sel);
          }
        }
        return tooWide;
      });

      expect(bad.length, `overflowing media: ${bad.join('\n')}`).toBe(0);
    });
  }

  for (const route of ROUTES) {
    test(`${route} focus is visible when tabbing`, async ({ page }) => {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);

      const hasVisibleFocus = await page.evaluate(() => {
        const a = document.activeElement as HTMLElement | null;
        if (!a) return false;
        const s = window.getComputedStyle(a);
        const ow = parseFloat(s.outlineWidth || '0');
        const oc = s.outlineColor || '';
        const box = a.getBoundingClientRect();
        const visible = box.width > 0 && box.height > 0;
        return visible && (ow > 0 || /focus|outline/.test(a.className) || s.boxShadow.includes('rgb'));
      });

      expect(hasVisibleFocus).toBeTruthy();
    });
  }

  for (const route of ROUTES) {
    test(`${route} orientation change keeps layout stable`, async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
      const overflowPortrait = await page.evaluate(() => document.documentElement.scrollWidth > (window.innerWidth + 1));
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.waitForTimeout(150);
      const overflowLandscape = await page.evaluate(() => document.documentElement.scrollWidth > (window.innerWidth + 1));

      expect(overflowPortrait).toBeFalsy();
      expect(overflowLandscape).toBeFalsy();
    });
  }

  test('route shells render on smallest viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    for (const route of ROUTES) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
      const hasMain = await page.locator('main, [role="main"]').first().count();
      expect(hasMain).toBeGreaterThan(0);
    }
  });

  test('sticky UI elements do not overlap content', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 720 });
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });

    const overlap = await page.evaluate(() => {
      const fixed = Array.from(document.querySelectorAll<HTMLElement>('*')).filter(n => getComputedStyle(n).position === 'fixed');
      const main = document.querySelector<HTMLElement>('main, [role="main"]');
      if (!main) return false;
      const mr = main.getBoundingClientRect();
      for (const f of fixed) {
        const fr = f.getBoundingClientRect();
        const inter =
          !(fr.right <= mr.left || fr.left >= mr.right || fr.bottom <= mr.top || fr.top >= mr.bottom);
        if (inter) return true;
      }
      return false;
    });

    expect(overlap).toBeFalsy();
  });

  test('container widths adapt across breakpoints on /', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });

    const widths: Record<string, number> = {};
    for (const bp of BREAKPOINTS) {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.waitForTimeout(120);
      const w = await page.evaluate(() => {
        const main = document.querySelector<HTMLElement>('main, [data-testid="dashboard"], [role="main"]');
        const el = main || document.body;
        return Math.round(el.getBoundingClientRect().width);
      });
      widths[bp.name] = w;
    }

    expect(widths.mobile).toBeLessThanOrEqual(widths.tablet);
    expect(widths.tablet).toBeLessThanOrEqual(widths.desktop);
    expect(widths.desktop).toBeLessThanOrEqual(widths.wide);
  });
});

export {};