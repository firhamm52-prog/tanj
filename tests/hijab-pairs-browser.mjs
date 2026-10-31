import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
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
      { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[extname(file)] ||
        'application/octet-stream',
    );
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/web/supabase-config.js?*', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: 'export const supabaseConfig={enabled:false};',
    }),
  );
  await page.route('**/web/data.js?*', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `import {freshSeed,storefront} from '/shared/seed.js';export const isApi=false,usesCloudCMS=false;export async function loadStorefront(){const data=freshSeed();data.hijabs=data.hijabs.slice(0,3);data.hijabs[0].product='assets/look-2.webp';data.hijabs[1].gallery=[data.hijabs[1].image,'assets/look-3.webp'];return storefront(data);}`,
    }),
  );
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const gallery = page.locator('#hijab-pair-gallery');
    await gallery.waitFor({ state: 'visible' });
    assert.equal(await page.locator('.ootd-rail').count(), 0);
    assert.ok(
      await gallery.evaluate((el) =>
        Boolean(
          el.compareDocumentPosition(document.getElementById('lookbook')) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      ),
    );
    assert.match(await gallery.getAttribute('data-product-id'), /selcuk-brown/);
    assert.match(await gallery.locator('[data-model]').getAttribute('src'), /hijab-selcuk-brown/);
    assert.match(await gallery.locator('[data-mockup]').getAttribute('src'), /embroidered-cream/);
    await gallery.locator('[data-next]').click();
    assert.match(await gallery.getAttribute('data-product-id'), /selcuk-gray/);
    assert.match(await gallery.locator('[data-model]').getAttribute('src'), /hijab-selcuk-gray/);
    assert.match(await gallery.locator('[data-mockup]').getAttribute('src'), /embroidered-black/);
    const stage = gallery.locator('.hijab-pair-stage');
    await stage.focus();
    await page.keyboard.press('ArrowLeft');
    assert.match(await gallery.getAttribute('data-product-id'), /selcuk-brown/);
    await stage.scrollIntoViewIfNeeded();
    const rect = await stage.boundingBox();
    await page.mouse.move(rect.x + rect.width * 0.45, rect.y + 30);
    await page.mouse.down();
    await page.mouse.move(rect.x + rect.width * 0.15, rect.y + 30, { steps: 5 });
    await page.mouse.up();
    assert.match(await gallery.getAttribute('data-product-id'), /selcuk-gray/);
    assert.match(await gallery.locator('[data-mockup]').getAttribute('src'), /embroidered-black/);
    const modelRect = await gallery.locator('[data-model]').boundingBox(),
      mockupRect = await gallery.locator('[data-mockup]').boundingBox();
    assert.ok(
      mockupRect.x > modelRect.x && Math.abs(mockupRect.y - modelRect.y) < 2,
      'two images remain side by side',
    );
    await gallery.locator('.hijab-pair-detail').click();
    await page.locator('#product-modal:not([hidden])').waitFor();
    assert.match(
      await page.locator('#product-modal').getAttribute('data-active-product'),
      /selcuk-gray/,
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    'PASS: upper rail removed; synchronized model/mockup via arrows, swipe, keyboard, mobile two-column layout and correct product detail.',
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
