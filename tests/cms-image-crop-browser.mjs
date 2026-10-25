import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://local').pathname;
    if (path === '/') {
      res.setHeader('Content-Type', 'text/html');
      res.end(
        '<link rel="stylesheet" href="/admin/studio.css"><button id="open">Pilih foto</button><script type="module">import {cropCmsImage} from "/web/cms-image-crop.js"; window.crop=cropCmsImage;document.getElementById("open").onclick=async()=>{window.result=await cropCmsImage(window.photo);window.done=true;};</script>',
      );
      return;
    }
    res.setHeader('Content-Type', path.endsWith('.css') ? 'text/css' : 'text/javascript');
    res.end(await readFile('.' + path));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 600;
    c.height = 800;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 300, 800);
    ctx.fillStyle = 'blue';
    ctx.fillRect(300, 0, 300, 800);
    window.photo = new File([await new Promise((r) => c.toBlob(r, 'image/png'))], 'test.png', {
      type: 'image/png',
    });
  });
  await page.locator('#open').click();
  await page.getByRole('dialog', { name: 'Atur foto sebelum upload' }).waitFor();
  await page.locator('[data-zoom]').fill('1.2');
  const box = await page.locator('.cms-crop-stage canvas').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  await page.getByRole('button', { name: 'Pakai foto & upload', exact: true }).click();
  await page.waitForFunction(() => window.done);
  const output = await page.evaluate(async () => {
    const bitmap = await createImageBitmap(window.result);
    const c = document.createElement('canvas');
    c.width = bitmap.width;
    c.height = bitmap.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    return {
      width: bitmap.width,
      height: bitmap.height,
      type: window.result.type,
      pixel: [...ctx.getImageData(5, 800, 1, 1).data],
      size: window.result.size,
    };
  });
  assert.equal(output.width, 1200);
  assert.equal(output.height, 1600);
  assert.equal(output.type, 'image/webp');
  assert.ok(
    output.pixel.slice(0, 3).every((v) => v > 240),
    'dragging changes the exported crop, with white padding',
  );
  assert.ok(output.size < 5 * 1024 * 1024);
  await page.evaluate(() => {
    window.done = false;
  });
  await page.locator('#open').click();
  await page.locator('[data-ratio]').selectOption('1');
  assert.equal(await page.locator('canvas').evaluate((c) => c.width / c.height), 1);
  await page.getByRole('button', { name: 'Atur ulang', exact: true }).click();
  assert.equal(await page.locator('[data-zoom]').inputValue(), '1');
  await page.getByRole('button', { name: 'Batal', exact: true }).click();
  await page.waitForFunction(() => window.done);
  assert.equal(await page.evaluate(() => window.result), null);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#open').click();
  const bounds = await page.locator('.cms-crop-dialog').boundingBox();
  assert.ok(bounds.width <= 390 && bounds.x >= 0);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.cms-crop-dialog'));
  console.log(
    'PASS: drag and zoom affect exported pixels, portrait/square frames, reset, cancel, Escape, and mobile dialog.',
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
