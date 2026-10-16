import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {isolateEmail} from './helpers/email-isolation.mjs';
const root=process.cwd(),server=createServer(async(req,res)=>{try{let path=new URL(req.url,'http://localhost').pathname;if(path==='/')path='/index.html';const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',{'.html':'text/html','.js':'text/javascript','.css':'text/css'}[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/`;let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext();await isolateEmail(context);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await mkdir('test-results',{recursive:true});
 for(const viewport of [{width:1440,height:900},{width:1366,height:768},{width:1280,height:600},{width:390,height:844},{width:390,height:667},{width:320,height:568}]){
  await page.setViewportSize(viewport);await page.goto(url);await page.locator('.tanj-chat').waitFor();assert.equal(await page.locator('.tanj-chat').getAttribute('href'),'https://wa.me/6281363661703');
  assert.equal(await page.locator('.moving-intro h2').textContent(),'Must be have combination.');
  assert.match(await page.locator('.moving-intro h2').evaluate(el=>getComputedStyle(el).fontFamily),/Times New Roman/);
  await page.locator('.product-preview').first().click();await page.locator('#product-recommendations [data-recommended-id]').first().waitFor();assert.equal(await page.locator('.tanj-chat').isVisible(),false);
  const box=await page.locator('#product-buy-now').boundingBox();assert.ok(box&&box.y>=0&&box.y+box.height<=viewport.height,`Order button must fit ${JSON.stringify(viewport)}: ${JSON.stringify(box)}`);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:`test-results/shopping-${viewport.width}-${viewport.height}.png`});
  const recommended=page.locator('#product-recommendations [data-recommended-id]').first(),id=await recommended.getAttribute('data-recommended-id');await recommended.click();await page.waitForFunction(id=>document.getElementById('product-modal').dataset.activeProduct===id,id);
  assert.equal(await page.locator('#product-modal .product-panel').evaluate(el=>el.scrollTop),0);
  await page.locator('#product-modal-close').click();await page.locator('.tanj-chat').waitFor();
  await page.locator('#bag-open').evaluate(button=>button.click());
  assert.equal(await page.locator('.bag-empty-art').isVisible(),true);
  assert.equal(await page.locator('#cart-recommendations [data-recommended-id]').count(),2);
  assert.equal(await page.locator('#bag-modal .bag-panel').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  await page.screenshot({path:`test-results/cart-${viewport.width}-${viewport.height}.png`});
  await page.locator('.bag-expand').click();
  assert.equal(await page.locator('.bag-expand').getAttribute('aria-expanded'),'true');
  const full=await page.locator('#bag-modal .bag-panel').boundingBox();
  assert.ok(Math.abs(full.width-viewport.width)<=2&&Math.abs(full.height-viewport.height)<=2,JSON.stringify(full));
  await page.locator('.bag-expand').click();
  assert.equal(await page.locator('.bag-expand').textContent(),'Perbesar');
  await page.goBack();await page.locator('#bag-modal').waitFor({state:'hidden'});
  await page.goForward();await page.locator('#bag-modal').waitFor({state:'visible'});
  await page.locator('#bag-modal [data-utility-close]').click();
 }
 assert.deepEqual(errors,[]);console.log('PASS: CS WhatsApp, available product recommendations, switching products, X close, no horizontal overflow, primary Order button fits desktop/mobile including 320x568.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
