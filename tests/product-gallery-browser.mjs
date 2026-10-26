import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { freshSeed, storefront } from '../shared/seed.js';
const data = storefront(freshSeed());
data.products[0].gallery = [
  'assets/campaign-beige.webp',
  'assets/look-2.webp',
  'https://gallery.test/detail.png',
];
data.products[2].gallery = ['assets/campaign-brown.webp'];
data.products[0].description = 'Deskripsi contoh dari CMS.';
data.products[0].careInstructions = 'Petunjuk perawatan contoh dari CMS.';
data.products[0].shippingInfo = 'Informasi pengiriman contoh dari CMS.';
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
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/web/supabase-config.js?*', (r) =>
    r.fulfill({
      contentType: 'text/javascript',
      body: 'export const supabaseConfig={enabled:false};',
    }),
  );
  await page.route('https://gallery.test/**', async (r) =>
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
  await page.locator('.card[data-product-id="base-0-0"] .product-preview').click();
  await page.locator('#product-modal').waitFor({ state: 'visible' });
  await page.getByRole('tab', { name: 'Care Instructions', exact: true }).click();
  assert.equal(await page.getByRole('tabpanel').textContent(), data.products[0].careInstructions);
  assert.equal(
    await page
      .getByRole('tab', { name: 'Care Instructions', exact: true })
      .getAttribute('aria-selected'),
    'true',
  );
  assert.notEqual(
    await page
      .getByRole('tab', { name: 'Care Instructions', exact: true })
      .evaluate((el) => getComputedStyle(el).borderBottomColor),
    'rgba(0, 0, 0, 0)',
  );
  assert.equal(await page.getByRole('tab', { name: 'Sizing', exact: true }).count(), 0);
  await page.getByRole('tab', { name: 'Shipping', exact: true }).click();
  assert.equal(await page.getByRole('tabpanel').textContent(), data.products[0].shippingInfo);
  await page.getByRole('tab', { name: 'Description', exact: true }).click();
  async function assertThumbnailRail() {
    const bounds = await page.locator('.has-product-gallery').evaluate((root) => {
      const main = root.querySelector('.product-gallery-main').getBoundingClientRect();
      const thumbs = root.querySelector('.product-gallery-thumbs').getBoundingClientRect();
      const css = getComputedStyle(root.querySelector('.product-gallery-thumbs'));
      return {
        separate: thumbs.right <= main.left,
        background: css.backgroundColor,
        border: css.borderTopWidth,
      };
    });
    assert.ok(bounds.separate, 'thumbnail rail does not overlap the main photo');
    assert.equal(bounds.background, 'rgb(255, 255, 255)');
    assert.equal(bounds.border, '1px');
  }
  await assertThumbnailRail();
  assert.equal(await page.locator('.product-gallery-thumbs button').count(), 3);
  await page.getByRole('button', { name: 'Lihat foto 3', exact: true }).click();
  assert.equal(
    await page.locator('#product-modal-image').getAttribute('src'),
    'https://gallery.test/detail.png',
  );
  await page.locator('#product-plus').click();
  assert.equal(
    await page.locator('#product-modal-image').getAttribute('src'),
    'https://gallery.test/detail.png',
    'quantity changes keep the selected photo',
  );
  await page.getByRole('button', { name: 'Foto berikutnya', exact: true }).click();
  assert.match(await page.locator('#product-modal-image').getAttribute('src'), /campaign-beige/);
  await page.getByRole('button', { name: 'Pilih warna Hitam', exact: true }).click();
  assert.equal(await page.locator('.product-gallery-thumbs button').count(), 2);
  assert.match(await page.locator('#product-modal-image').getAttribute('src'), /campaign-black/);
  await page.getByRole('button', { name: 'Pilih warna Cream', exact: true }).click();
  await mkdir('test-results', { recursive: true });
  await page
    .locator('.product-panel')
    .screenshot({ path: 'test-results/product-gallery-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await assertThumbnailRail();
  const main = page.locator('.product-gallery-main');
  await main.dispatchEvent('pointerdown', { clientX: 300, clientY: 120 });
  await main.dispatchEvent('pointerup', { clientX: 100, clientY: 125 });
  assert.equal(await page.locator('.product-gallery-count').textContent(), '2 / 3');
  await page.getByRole('button', { name: 'Lihat foto 2', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('.product-gallery-count').textContent(), '3 / 3');
  assert.equal(
    await page.locator('.product-panel').evaluate((el) => el.scrollWidth > el.clientWidth + 1),
    false,
    'mobile gallery does not overflow horizontally',
  );
  const galleryBottom = await page
    .locator('.product-panel-photo')
    .evaluate((el) => el.getBoundingClientRect().bottom);
  const infoTop = await page
    .locator('.product-panel-info')
    .evaluate((el) => el.getBoundingClientRect().top);
  assert.ok(infoTop >= galleryBottom - 1, 'product details stay below the mobile gallery');
  const mainBottom = await main.evaluate((el) => el.getBoundingClientRect().bottom);
  assert.ok(galleryBottom >= mainBottom, 'main photo stays inside its gallery');
  await page
    .locator('.product-panel')
    .screenshot({ path: 'test-results/product-gallery-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Pilih warna Cokelat', exact: true }).click();
  assert.equal(await page.locator('.product-gallery-thumbs').isVisible(), false);
  const single = await page.locator('.has-product-gallery').evaluate((el) => ({
    width: el.clientWidth,
    main: el.querySelector('.product-gallery-main').clientWidth,
  }));
  assert.equal(single.main, single.width, 'single photos do not leave an empty thumbnail column');
  await page.getByRole('button', { name: 'Pilih warna Cream', exact: true }).click();
  await page.locator('#product-like').click();
  assert.equal(await page.locator('#product-like').getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: 'Pilih warna Hitam', exact: true }).click();
  assert.equal(await page.locator('#product-like').getAttribute('aria-pressed'), 'false');
  await page.locator('#product-modal-close').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('#wishlist-open').click();
  assert.equal(await page.locator('.wishlist-item').count(), 1);
  await page.locator('.wishlist-product').click();
  assert.equal(
    await page.locator('#product-modal').getAttribute('data-active-product'),
    'base-0-0',
  );
  await page.locator('#product-modal-close').click();
  await page.reload();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('#wishlist-open').click();
  assert.equal(await page.locator('.wishlist-item').count(), 1, 'likes persist across refresh');
  await page.locator('.wishlist-remove').click();
  assert.equal(await page.locator('.wishlist-item').count(), 0);
  assert.deepEqual(
    await page.evaluate(() => JSON.parse(localStorage.getItem('tanj-liked-products-v1'))),
    [],
  );
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.locator('body').evaluate((el) => el.scrollWidth > innerWidth + 1),
    false,
    'header with likes fits mobile',
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS: thumbnail rail, gallery navigation, detail tabs, CMS text, persistent likes, wishlist removal and mobile header.',
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
