import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
if(!process.env.QRIS_ARTWORK_PATH){console.log('SKIP: set QRIS_ARTWORK_PATH to the original merchant artwork for visual verification.');process.exit(0);}
const source=await readFile(process.env.QRIS_ARTWORK_PATH);
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;if(path==='/'){res.setHeader('Content-Type','text/html');res.end(`<link rel="stylesheet" href="/web/manual-payment.css"><div class="manual-qr"><img id="checkout-qris-image" src="data:image/png;base64,${source.toString('base64')}"></div><script type="module">import {cropQrisArtwork} from '/web/qris-crop.js';await cropQrisArtwork(document.querySelector('img'));</script>`);}else{res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':'text/css');res.end(await readFile('.'+path));}}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:800,height:1000}});
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('.qris-artwork-crop').waitFor();
 const frame=await page.locator('.qris-artwork-crop').boundingBox();assert.equal(frame.width,480);
 assert.equal(await page.locator('img').evaluate(image=>image.naturalWidth),1054);
 await page.locator('.qris-artwork-crop').screenshot({path:'test-results/qris-crop-preview.png'});
 await page.setViewportSize({width:320,height:800});assert.ok((await page.locator('.qris-artwork-crop').boundingBox()).width<=320);
 console.log('PASS: matching QRIS artwork cropped at full display size, original image intact, mobile fits.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
