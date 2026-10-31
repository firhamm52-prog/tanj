import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { freshSeed, storefront } from '../shared/seed.js';
const data = storefront(freshSeed());
data.slides.push(
  ...data.slides.map((slide) => ({ ...slide, id: 'upper-' + slide.id, placement: 'upper' })),
);
data.hero.media = 'https://video.test/current.mp4';
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
        '.webp': 'image/webp',
        '.png': 'image/png',
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
let release;
const pending = new Promise((r) => {
  release = r;
});
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.route('**/web/supabase-config.js?*', (r) =>
    r.fulfill({
      contentType: 'text/javascript',
      body: 'export const supabaseConfig={enabled:true,url:"https://cms.test",publishableKey:"public-test"};',
    }),
  );
  let acknowledge;
  const requested = new Promise((r) => {
    acknowledge = r;
  });
  await page.route('https://cms.test/**', (r) =>
    r.fulfill({ contentType: 'application/json', body: '[]' }),
  );
  await page.route('https://cms.test/rest/v1/rpc/tanj_cms_storefront', async (r) => {
    acknowledge();
    await pending;
    await r.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.route('https://video.test/**', (r) =>
    r.fulfill({ contentType: 'video/mp4', body: 'simulated-video' }),
  );
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'domcontentloaded' });
  await requested;
  const heroRatio = await page.locator('.video-hero').evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return rect.width / rect.height;
  });
  assert.ok(Math.abs(heroRatio - 16 / 9) < 0.02, 'website hero is landscape on mobile');
  assert.equal(
    await page.locator('.brand-video').evaluate((el) => getComputedStyle(el).objectFit),
    'contain',
  );
  assert.equal(await page.locator('.brand-video source').getAttribute('src'), null);
  assert.equal(await page.locator('.brand-video').getAttribute('poster'), null);
  assert.equal(
    requests.some((url) => url.includes('noireaterial-desert-three-models-v3.mp4')),
    false,
    'old video is not requested while CMS loads',
  );
  assert.equal(
    requests.some((url) => url.includes('noireaterial-desert-poster.webp')),
    false,
    'old poster is not requested',
  );
  release();
  await page.waitForFunction(
    (url) => document.querySelector('.brand-video source')?.getAttribute('src') === url,
    data.hero.media,
  );
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    const rail = await page.locator('.photo-track').evaluate((track) => {
      const originals = [...track.children].filter((el) => el.tagName === 'FIGURE');
      const box = originals[0].getBoundingClientRect();
      return {
        photos: originals.filter((el) => el.querySelector('img')).length,
        videos: originals.filter((el) => el.querySelector('video')).length,
        ratio: box.width / box.height,
        height: box.height,
        repeatCount: track.querySelector('.repeat-set').children.length,
        animated: getComputedStyle(track).animationName,
      };
    });
    assert.equal(rail.photos, 5);
    assert.equal(rail.videos, 1);
    assert.equal(rail.repeatCount, 6);
    assert.ok(Math.abs(rail.ratio - 9 / 16) < 0.01);
    assert.ok(rail.height >= 550, 'portrait media stays tall on desktop and mobile');
    assert.equal(rail.animated, 'rail-left');
    assert.equal(await page.locator('.ootd-track').count(), 0);
    assert.equal(await page.locator('#hijab-pair-gallery').isVisible(), true);
  }
  assert.equal(
    requests.some((url) => url.includes('noireaterial-desert-three-models-v3.mp4')),
    false,
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    (url) => document.querySelector('.brand-video source')?.getAttribute('src') === url,
    data.hero.media,
  );
  assert.equal(await page.locator('.brand-video').evaluate((v) => v.autoplay), false);
  assert.equal(
    await page.locator('.video-hero').evaluate((el) => getComputedStyle(el).backgroundImage),
    'none',
  );
  console.log(
    'PASS: delayed CMS starts without old hero/poster requests; published video is selected, including reduced motion.',
  );
} finally {
  release();
  await browser.close();
  await new Promise((r) => server.close(r));
}
