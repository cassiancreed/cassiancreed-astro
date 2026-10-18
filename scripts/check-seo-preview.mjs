import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = 'http://127.0.0.1:4321';
const headers = {
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'SAMEORIGIN',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.setDefaultTimeout(30000);
    // Astro preview does not read Netlify _headers. Apply the exact proposed
    // response headers to local preview responses for this compatibility check.
    await page.route(base + '/**', async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, headers: { ...response.headers(), ...headers } });
    });
    const errors = [];
    const beehiivResponses = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (response.url().includes('subscribe-forms.beehiiv.com')) beehiivResponses.push({ url: response.url(), status: response.status() });
    });
    for (const path of ['/court-calendar/', '/missing-persons/', '/books/jury-chess/', '/how-forensic-genetic-genealogy-works/']) {
      console.log('Checking preview', width, path);
      const response = await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 30000 });
      assert.equal(response.status(), 200);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      assert.equal(overflow, false, path + ' overflows at ' + width);
      assert.equal((await response.allHeaders())['x-frame-options'], 'SAMEORIGIN');
      if (path === '/missing-persons/') {
        await page.waitForSelector('.leaflet-container .leaflet-tile-loaded', { timeout: 30000 });
        const markerCount = await page.locator('.leaflet-marker-icon').count();
        assert.ok(markerCount > 0, 'Leaflet markers missing');
      }
      if (path === '/court-calendar/') {
        const frames = page.locator('iframe[src*="subscribe-forms.beehiiv.com"]');
        assert.ok(await frames.count() > 0, 'Beehiiv iframe missing');
        await frames.first().scrollIntoViewIfNeeded();
        await page.frameLocator('iframe[src*="subscribe-forms.beehiiv.com"]').first().locator('form,input').first().waitFor({ state: 'attached', timeout: 30000 });
      }
      if (path === '/books/jury-chess/') {
        const checkout = page.locator('a[data-book-key="jury-chess"]').first();
        assert.match(await checkout.getAttribute('href'), /^https:\/\/cassiancreed\.beehiiv\.com\/products\/jury-chess\?/);
        assert.equal(await checkout.getAttribute('target'), '_blank');
        await page.evaluate(() => {
          window.__seoEvents = [];
          window.gtag = (...event) => window.__seoEvents.push(event);
          document.querySelector('a[data-book-key="jury-chess"]').addEventListener('click', (event) => event.preventDefault());
        });
        await checkout.click();
        assert.ok(await page.evaluate(() => window.__seoEvents.some((event) => event[1] === 'buy_cta_click')));
      }
      // Production analytics must remain suppressed on preview hosts.
      assert.equal(await page.locator('script[src*="googletagmanager.com/gtag/js"]').count(), 0);
      await page.screenshot({ path: '/tmp/seo-' + width + '-' + path.split('/').filter(Boolean).join('-') + '.png', fullPage: false, animations: 'disabled', timeout: 15000 });
      console.log('Preview passed', width, path);
      results.push({ path, width, status: 200, overflow, headersApplied: true });
    }
    assert.deepEqual(errors, [], 'Browser runtime errors');
    assert.ok(beehiivResponses.some((response) => response.status === 200), 'No successful Beehiiv response');
    results.push({ width, beehiivResponses, javascriptErrors: errors });
    await page.close();
  }
} finally { await browser.close(); }
await writeFile('/tmp/seo-preview-results.json', JSON.stringify(results, null, 2));
console.log('SEO_PREVIEW=' + JSON.stringify(results));
