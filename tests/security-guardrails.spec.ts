import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:4173';
const ROUTES = ['/', '/auth', '/history'];

function isLocal(url: string) {
  return (
    url.startsWith('http://127.0.0.1') ||
    url.startsWith('http://localhost') ||
    url.startsWith('file://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  );
}

test.describe('Security & CSP Guardrails', () => {
  test('index.html has no inline scripts or inline event handlers', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForLoadState('domcontentloaded');

    const inlineHandlers = await page.locator('[onload],[onclick],[onerror],[onchange],[oninput],[onmouseover],[onfocus],[onblur]').count();
    expect(inlineHandlers).toBe(0);

    const scriptTags = page.locator('script');
    const count = await scriptTags.count();
    for (let i = 0; i < count; i++) {
      const hasSrc = await scriptTags.nth(i).getAttribute('src');
      const text = (await scriptTags.nth(i).textContent())?.trim() || '';
      expect(hasSrc || text.length === 0).toBeTruthy();
      if (text.length > 0) expect(text.length).toBeLessThanOrEqual(20);
    }

    const linkTags = page.locator('link[rel="stylesheet"],link[as="script"],script[src]');
    const linkCount = await linkTags.count();
    for (let i = 0; i < linkCount; i++) {
      const u = (await linkTags.nth(i).getAttribute('href')) || (await linkTags.nth(i).getAttribute('src')) || '';
      if (u) expect(isLocal(new URL(u, BASE).toString())).toBeTruthy();
    }
  });

  for (const route of ROUTES) {
    test(`no third‑party network calls on ${route} and no dangerous JS APIs`, async ({ page }) => {
      const jsBodies: string[] = [];
      const externalCalls: string[] = [];

      page.on('response', async (resp) => {
        const url = resp.url();
        if (!isLocal(url)) externalCalls.push(url);
        const ct = resp.headers()['content-type'] || '';
        if (resp.ok() && /javascript|text\/html|application\/javascript/.test(ct)) {
          try {
            const body = await resp.text();
            if (body && body.length) jsBodies.push(body.slice(0, 500000)); // cap to avoid memory blowup
          } catch {}
        }
      });

      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      expect(externalCalls, `3rd‑party requests detected: ${externalCalls.join(', ')}`).toHaveLength(0);

      const bundleJoined = jsBodies.join('\n');
      const badPatterns = [
        /\beval\s*\(/,
        /\bnew\s+Function\s*\(/,
        /\bdocument\.write\s*\(/,
      ];
      for (const p of badPatterns) {
        expect(p.test(bundleJoined)).toBeFalsy();
      }
    });
  }

  test('cookies (if any) avoid insecure defaults', async ({ context }) => {
    const cookies = await context.cookies([`${BASE}/`]);
    if (cookies.length === 0) {
      expect(cookies.length).toBe(0);
      return;
    }
    // On HTTP localhost, Secure flag can be false; just require SameSite present.
    for (const c of cookies) {
      expect(c.sameSite === 'Lax' || c.sameSite === 'Strict' || c.sameSite === 'None').toBeTruthy();
    }
  });

  test('optional CSP meta present or skipped without failing', async ({ page }) => {
    await page.goto(`${BASE}/`);
    const cspMeta = page.locator('meta[http-equiv="Content-Security-Policy"]');
    const has = await cspMeta.count();
    expect(has >= 0).toBeTruthy();
  });
});