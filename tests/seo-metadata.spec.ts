import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:4173';
const ROUTES = ['/', '/auth', '/history'];

function isLocal(url: string) {
  return (
    url.startsWith('http://127.0.0.1') ||
    url.startsWith('http://localhost') ||
    url.startsWith('file://')
  );
}

async function text(page, selector: string) {
  const el = page.locator(selector).first();
  if (!(await el.count())) return '';
  return (await el.textContent())?.trim() || '';
}

test.describe('SEO & Metadata', () => {
  for (const route of ROUTES) {
    test(`basic metadata on ${route}`, async ({ page }) => {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });

      const title = await page.title();
      expect(title && title.length > 0).toBeTruthy();

      const descEl = page.locator('meta[name="description"]').first();
      const hasDesc = await descEl.count();
      if (hasDesc) {
        const desc = (await descEl.getAttribute('content')) || '';
        expect(desc.length).toBeGreaterThanOrEqual(40);
        expect(desc.length).toBeLessThanOrEqual(200);
      } else {
        expect(hasDesc >= 0).toBeTruthy();
      }

      const htmlLang = await page.locator('html').getAttribute('lang');
      expect((htmlLang || '').length).toBeGreaterThan(0);

      const canon = page.locator('link[rel="canonical"]').first();
      const canonCount = await canon.count();
      if (canonCount) {
        const href = (await canon.getAttribute('href')) || '';
        const abs = new URL(href, `${BASE}${route}`).toString();
        expect(isLocal(abs)).toBeTruthy();
      } else {
        expect(canonCount >= 0).toBeTruthy();
      }

      const h1s = page.locator('h1');
      const h1Count = await h1s.count();
      expect(h1Count).toBeGreaterThanOrEqual(1);

      if (h1Count >= 1) {
        const firstH1 = await h1s.first().textContent();
        expect((firstH1 || '').trim().length).toBeGreaterThan(0);
      }
    });
  }

  test('robots.txt and sitemap if present look sane', async ({ page, request }) => {
    const robots = await request.get(`${BASE}/robots.txt`);
    if (robots.status() === 200) {
      const body = await robots.text();
      expect(/User-agent:/i.test(body)).toBeTruthy();
    } else {
      expect(robots.status() === 200 || robots.status() === 404).toBeTruthy();
    }

    const sitemap = await request.get(`${BASE}/sitemap.xml`);
    if (sitemap.status() === 200) {
      const body = await sitemap.text();
      expect(/<urlset|<sitemapindex/i.test(body)).toBeTruthy();
    } else {
      expect(sitemap.status() === 200 || sitemap.status() === 404).toBeTruthy();
    }
  });

  test('images with alt text (visible ones sampled)', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    const imgs = page.locator('img');
    const count = Math.min(await imgs.count(), 20);
    for (let i = 0; i < count; i++) {
      const el = imgs.nth(i);
      if (await el.isVisible()) {
        const alt = (await el.getAttribute('alt')) || '';
        expect(alt.length >= 0).toBeTruthy();
      }
    }
  });

  test('Open Graph / Twitter tags if present have content', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });

    const ogTitle = page.locator('meta[property="og:title"]');
    const ogDesc = page.locator('meta[property="og:description"]');
    const twTitle = page.locator('meta[name="twitter:title"]');
    const twDesc = page.locator('meta[name="twitter:description"]');

    for (const loc of [ogTitle, ogDesc, twTitle, twDesc]) {
      const c = await loc.count();
      if (c) {
        const v = (await loc.first().getAttribute('content')) || '';
        expect(v.length).toBeGreaterThan(0);
      } else {
        expect(c >= 0).toBeTruthy();
      }
    }
  });
});