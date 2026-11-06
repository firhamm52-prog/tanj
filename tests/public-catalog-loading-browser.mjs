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
  await page.route('**/web/supabase-customer.js?*', (r) =>
    r.fulfill({
      contentType: 'text/javascript',
      body: 'export const cloudClient=()=>new Promise(()=>{});',
    }),
  );
  await page.route('**/rest/v1/rpc/tanj_cms_storefront', (r) =>
    r.fulfill({
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ products: [{ id: 'published' }] }),
    }),
  );
  await page.goto(url + 'web/supabase-config.js');
  const result = await page.evaluate(async () => {
    const { loadCloudStorefront } = await import('/web/cloud-cms.js');
    return Promise.race([
      loadCloudStorefront(),
      new Promise((_, reject) => setTimeout(() => reject(Error('Catalog blocked by auth')), 2000)),
    ]);
  });
  assert.equal(result.products[0].id, 'published');
  console.log('PASS: public catalog loads while customer auth remains blocked.');
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
