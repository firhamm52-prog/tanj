import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const server = createServer(async (req, res) => {
  if (req.url === '/fixture.mp4') {
    res.setHeader('Content-Type', 'video/mp4');
    res.end(await readFile('assets/hijab-georgia-cream.mp4'));
  } else if (['/web/cms-video-convert.js', '/web/cms-video-crop.js'].includes(req.url)) {
    res.setHeader('Content-Type', 'text/javascript');
    res.end(await readFile(req.url.slice(1)));
  } else {
    res.setHeader('Content-Type', 'text/html');
    res.end('<html><body></body></html>');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const result = await page.evaluate(async () => {
    const { prepareCmsVideo } = await import('/web/cms-video-convert.js');
    // Exercise conversion with real encoded frames; a MOV extension alone does not identify codecs.
    const bytes = await (await fetch('/fixture.mp4')).arrayBuffer();
    const input = new File([bytes], 'fixture.mov', { type: 'video/mp4' });
    const { cropCmsVideo } = await import('/web/cms-video-crop.js');
    const selection = cropCmsVideo(input, { ratio: 1 });
    await new Promise((resolve) => {
      const check = () =>
        document.querySelector('[data-action=apply]')?.disabled === false
          ? resolve()
          : setTimeout(check, 30);
      check();
    });
    document.querySelector('[data-control=zoom]').value = '1.5';
    document.querySelector('[data-control=x]').value = '0.2';
    document.querySelector('[data-control=x]').dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('[data-action=apply]').click();
    const crop = await selection;
    if (crop.x !== 0.2 || crop.zoom !== 1.5) throw Error('Crop controls were not preserved');
    const cancel = cropCmsVideo(input);
    document.querySelector('[data-action=cancel]').click();
    if ((await cancel) !== null) throw Error('Cancel should not upload');
    const output = await prepareCmsVideo(input, crop);
    const preview = document.createElement('video');
    const outputUrl = URL.createObjectURL(output);
    await new Promise((resolve, reject) => {
      preview.onloadeddata = resolve;
      preview.onerror = () => reject(Error('Converted video is not decodable'));
      preview.src = outputUrl;
    });
    URL.revokeObjectURL(outputUrl);
    return {
      type: output.type,
      name: output.name,
      size: output.size,
      width: preview.videoWidth,
      height: preview.videoHeight,
    };
  });
  assert.equal(result.type, 'video/webm');
  assert.equal(result.name, 'fixture.webm');
  assert.ok(result.size > 1000);
  assert.ok(result.width > 0);
  assert.equal(result.width, result.height);
  console.log(
    'PASS: browser decodes frames and converts MOV-named input to WebM. Actual HEVC MOV compatibility depends on source decoder.',
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
