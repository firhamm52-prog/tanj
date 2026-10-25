import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { freshSeed, storefront } from '../shared/seed.js';
const data = storefront(freshSeed());
for (const p of data.products.filter((p) => ['base-0-0', 'base-0-1'].includes(p.id)))
  p.product = `https://photos.test/cms-media/${p.id}.png`;
const server = createServer(async (req, res) => {
  try {
    let path = new URL(req.url, 'http://local').pathname;
    if (path.endsWith('/')) path += 'index.html';
    res.setHeader(
      'Content-Type',
      {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.webp': 'image/webp',
      }[extname(path)] || 'application/octet-stream',
    );
    res.end(await readFile(resolve('.', '.' + path)));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  await page.route('**/web/supabase-config.js?*', (r) =>
    r.fulfill({
      contentType: 'text/javascript',
      body: 'export const supabaseConfig={enabled:false};',
    }),
  );
  await page.route('https://photos.test/**', async (r) =>
    r.fulfill({
      contentType: 'image/png',
      body: await readFile('assets/embroidered-cream-product-v2.png'),
    }),
  );
  await page.addInitScript(
    (data) => localStorage.setItem('tanj-studio-published-v1', JSON.stringify(data)),
    data,
  );
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  for (const id of ['base-0-0', 'base-0-1']) {
    const image = page.locator(`.card[data-product-id="${id}"] .product-shot`);
    await image.waitFor({ state: 'attached' });
    assert.match(await image.getAttribute('src'), /photos\.test/);
    assert.equal(
      await image.evaluate((el) => getComputedStyle(el).backgroundColor),
      'rgb(255, 255, 255)',
    );
  }
  assert.equal(
    await page
      .locator('.card[data-product-id="base-0-2"] .product-shot')
      .evaluate((el) => getComputedStyle(el).backgroundColor),
    'rgb(243, 241, 238)',
  );
  await page.locator('.card[data-product-id="base-0-0"] .product-preview').hover();
  await page
    .locator('.card[data-product-id="base-0-0"] .product-preview')
    .screenshot({ path: 'test-results/embroidered-cms-white.png' });
  console.log(
    'PASS: CMS-uploaded cream and black product photos keep white frames; cocoa remains unchanged.',
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
