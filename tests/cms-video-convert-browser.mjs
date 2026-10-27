import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const server = createServer(async (req, res) => {
  if (req.url === '/fixture.mp4') {
    res.setHeader('Content-Type', 'video/mp4');
    res.end(await readFile('assets/hijab-georgia-cream.mp4'));
  } else if (req.url === '/web/cms-video-convert.js') {
    res.setHeader('Content-Type', 'text/javascript');
    res.end(await readFile('web/cms-video-convert.js'));
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
    const output = await prepareCmsVideo(input);
    const preview = document.createElement('video');
    const outputUrl = URL.createObjectURL(output);
    await new Promise((resolve, reject) => {
      preview.onloadeddata = resolve;
      preview.onerror = () => reject(Error('Converted video is not decodable'));
      preview.src = outputUrl;
    });
    URL.revokeObjectURL(outputUrl);
    return { type: output.type, name: output.name, size: output.size, width: preview.videoWidth };
  });
  assert.equal(result.type, 'video/webm');
  assert.equal(result.name, 'fixture.webm');
  assert.ok(result.size > 1000);
  assert.ok(result.width > 0);
  console.log(
    'PASS: browser decodes frames and converts MOV-named input to WebM. Actual HEVC MOV compatibility depends on source decoder.',
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
