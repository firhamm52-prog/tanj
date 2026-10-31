import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';
const root = process.cwd();
const server = createServer(async (req, res) => {
  try {
    let path = new URL(req.url, 'http://local').pathname;
    if (path === '/') path = '/index.html';
    const file = resolve(root, '.' + path);
    if (!file.startsWith(root + sep)) throw Error();
    res.setHeader(
      'Content-Type',
      { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' }[extname(file)] ||
        'application/octet-stream',
    );
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.route('**/web/supabase-config.js?*', (r) =>
    r.fulfill({
      contentType: 'text/javascript',
      body: 'export const supabaseConfig={enabled:false};',
    }),
  );
  await page.route('**/web/data.js?*', (r) =>
    r.fulfill({
      contentType: 'text/javascript',
      body: 'import {freshSeed,storefront} from "/shared/seed.js";export const isApi=false,usesCloudCMS=false;export async function loadStorefront(){return storefront(freshSeed());}',
    }),
  );
  await mkdir('test-results', { recursive: true });
  for (const width of [320, 390, 430, 760]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(url);
    await page.locator('#collection .card[data-product-id]').first().waitFor();
    const rects = await page
      .locator('#collection .products.three')
      .first()
      .locator(':scope > .card')
      .evaluateAll((cards) =>
        cards.map((card) => {
          const r = card.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width };
        }),
      );
    assert.equal(rects.length, 3);
    assert.ok(
      rects[1].x > rects[0].x && Math.abs(rects[1].y - rects[0].y) < 1,
      'two complete cards per row',
    );
    assert.ok(rects[2].y > rects[0].y, 'third variant wraps to next row');
    assert.ok(rects[1].x + rects[1].width <= width);
    assert.equal(
      await page
        .locator('#collection .collection-heading')
        .first()
        .evaluate((el) => getComputedStyle(el, '::after').content),
      'none',
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    if (width === 390)
      await page
        .locator('#collection .products.three')
        .first()
        .screenshot({ path: 'test-results/mobile-product-grid-390.png' });
    await page.goto(url + '#all-products');
    await page.locator('body.catalog-open').waitFor();
    for (const selector of ['#catalog-grid', '#hijab-grid']) {
      const layout = await page
        .locator(selector)
        .evaluate((el) => ({
          display: getComputedStyle(el).display,
          columns: getComputedStyle(el).gridTemplateColumns.split(' ').length,
          overflow: el.scrollWidth > el.clientWidth + 1,
        }));
      assert.deepEqual(layout, { display: 'grid', columns: 2, overflow: false });
    }
  }
  for (const width of [1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url);
    await page.locator('#collection .card[data-product-id]').first().waitFor();
    const read = () =>
      page.locator('#collection').evaluate((el) => ({
        height: el.getBoundingClientRect().height,
        cards: [...el.querySelectorAll('.card')].map((card) => {
          const r = card.getBoundingClientRect();
          return {
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            font: getComputedStyle(card.querySelector('.card-title')).fontSize,
          };
        }),
      }));
    const enabled = await read();
    await page.evaluate(
      () => (document.querySelector('link[href*="mobile-product-grid.css"]').sheet.disabled = true),
    );
    assert.deepEqual(
      await read(),
      enabled,
      'desktop unchanged with mobile CSS enabled or disabled',
    );
  }
  console.log(
    'PASS: two-column mobile collection/catalog/hijab at 320–760px, no horizontal overflow, desktop 1024/1440 unchanged.',
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
