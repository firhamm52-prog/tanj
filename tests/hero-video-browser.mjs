import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';
const root = process.cwd();
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/fixture') {
      res.setHeader('Content-Type', 'text/html');
      res.end(
        '<link rel="stylesheet" href="/web/hero-video.css"><style>.video-hero{position:relative;width:390px;height:220px}.brand-video{width:100%;height:100%}</style><section class="video-hero"><video class="brand-video" muted playsinline poster="/assets/tanj-hero-poster.webp"><source src="/assets/tanj-hero-compatible.mp4" type="video/mp4"></video></section>',
      );
      return;
    }
    const file = resolve(root, '.' + path);
    if (!file.startsWith(root + sep)) throw Error();
    const bytes = await readFile(file);
    res.setHeader(
      'Content-Type',
      { '.js': 'text/javascript', '.css': 'text/css', '.mp4': 'video/mp4', '.webp': 'image/webp' }[
        extname(file)
      ] || 'application/octet-stream',
    );
    const range = /bytes=(\d+)-(\d*)/.exec(req.headers.range || '');
    if (range) {
      const start = +range[1],
        end = range[2] ? Math.min(+range[2], bytes.length - 1) : bytes.length - 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${bytes.length}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
      });
      res.end(bytes.subarray(start, end + 1));
    } else res.end(bytes);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  async function fixture(block = false) {
    const p = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    if (block)
      await p.addInitScript(() => {
        window.allowHero = false;
        const native = HTMLMediaElement.prototype.play;
        Object.defineProperty(HTMLMediaElement.prototype, 'autoplay', {
          get() {
            return false;
          },
          set() {},
          configurable: true,
        });
        HTMLMediaElement.prototype.play = function () {
          return window.allowHero
            ? native.call(this)
            : Promise.reject(new DOMException('Autoplay blocked', 'NotAllowedError'));
        };
      });
    p.setDefaultTimeout(8000);
    await p.goto(`http://127.0.0.1:${server.address().port}/fixture`);
    await p.evaluate(async () => {
      window.hero = (await import('/web/hero-video.js')).heroPlayback;
    });
    return p;
  }
  const normal = await fixture();
  await normal.waitForFunction(() => document.querySelector('video').currentTime > 0.2);
  await normal.locator('.hero-video-poster').waitFor({ state: 'hidden' });
  assert.equal(await normal.locator('video').getAttribute('controls'), null);
  const sameSource = await normal.evaluate(() => {
    const v = document.querySelector('video');
    let loads = 0;
    const original = v.load.bind(v);
    v.load = () => {
      loads++;
      original();
    };
    window.hero.setSource('/assets/tanj-hero-compatible.mp4');
    return loads;
  });
  assert.equal(sameSource, 0, 'CMS must not reload an already-playing source');
  const blocked = await fixture(true);
  await blocked.locator('.hero-video-play').waitFor({ state: 'visible' });
  assert.equal(await blocked.locator('video').getAttribute('controls'), null);
  await blocked.waitForFunction(() => {
    const p = document.querySelector('.hero-video-poster');
    return !p.hidden && p.complete && p.naturalWidth > 0;
  });
  await blocked.screenshot({ path: 'test-results/hero-autoplay-fallback.png' });
  await blocked.evaluate(() => (window.allowHero = true));
  await blocked.locator('.hero-video-play').click();
  await blocked.waitForFunction(() => document.querySelector('video').currentTime > 0.2);
  await blocked.locator('.hero-video-poster').waitFor({ state: 'hidden' });
  await normal.bringToFront();
  await normal.evaluate(() => window.hero.setSource('/missing-video.mp4'));
  await normal.locator('.hero-video-play').waitFor({ state: 'visible' });
  assert.equal(await normal.locator('video').getAttribute('controls'), null);
  console.log(
    'PASS: hero plays actual MP4 inline, keeps its source on CMS refresh, shows a poster/custom play action when autoplay is rejected, retries on a tap, and handles failed media without native controls. Chromium mobile simulation; not a physical iPhone test.',
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
