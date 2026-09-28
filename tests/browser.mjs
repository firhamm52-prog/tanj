import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd();
await mkdir('test-results',{recursive:true});
// Serve a project subpath exactly like GitHub Pages, without any API.
const staticServer=createServer(async(req,res)=>{
 try{
  let path=new URL(req.url,'http://localhost').pathname;
  if(!path.startsWith('/tanj/')){res.writeHead(404);return res.end()}
  path=path.slice(5);if(path.endsWith('/'))path+='index.html';
  const file=resolve(root,'.'+path);
  if(!file.startsWith(root)){res.writeHead(403);return res.end()}
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.mp4':'video/mp4','.svg':'image/svg+xml'};
  const bytes=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(bytes);
 }catch{res.writeHead(404);res.end()}
});
await new Promise(resolve=>staticServer.listen(4320,'127.0.0.1',resolve));
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 const base='http://127.0.0.1:4320/tanj';
 await page.goto(base+'/admin/');await page.locator('#login-form button').click();
 await page.locator('#app:not([hidden])').waitFor();
 await page.screenshot({path:'test-results/admin-desktop.png',fullPage:true});
 await page.locator('#navigation [data-tab=products]').click();
 await page.getByRole('button',{name:'+ Tambah produk',exact:true}).click();
 await page.locator('[name=name]').fill('Browser test product');await page.locator('[name=colorName]').fill('Cream');
 await page.locator('[name=price]').fill('345000');await page.locator('[name=stock]').fill('9');await page.locator('[name=status]').selectOption('published');
 await page.locator('#edit-form button[type=submit]').click();await page.locator('#editor').waitFor({state:'hidden'});
 await page.locator('#search').fill('Browser test product');assert.equal(await page.locator('#list tbody tr').count(),1);
 await page.locator('#list [data-action=edit]').click();await page.locator('[name=model]').fill('javascript:alert(1)');await page.locator('#edit-form button[type=submit]').click();await page.locator('#editor-error:not([hidden])').waitFor();await page.locator('[name=model]').fill('assets/campaign-beige.webp');await page.locator('#edit-form button[type=submit]').click();await page.locator('#editor').waitFor({state:'hidden'});
 await page.locator('#navigation [data-tab=content]').click();await page.locator('[data-kind=banner]').click();await page.locator('[name=enabled]').check();await page.locator('[name=title]').fill('The browser edit');await page.locator('#edit-form button[type=submit]').click();await page.locator('#editor').waitFor({state:'hidden'});
 await page.locator('#navigation [data-tab=hijabs]').click();await page.locator('#list [data-action=edit]').first().click();await page.locator('[name=name]').fill('Selcuk Browser');await page.locator('[name=price]').fill('123000');await page.locator('[name=stock]').fill('0');await page.locator('#edit-form button[type=submit]').click();await page.locator('#editor').waitFor({state:'hidden'});
 await page.reload();await page.locator('#app:not([hidden])').waitFor();
 page.on('dialog',dialog=>dialog.accept());await page.locator('#publish').click();await page.locator('#toast').filter({hasText:'dipublikasikan'}).waitFor();
 const landing=await context.newPage();landing.on('pageerror',error=>errors.push(error.message));
 await landing.goto(base+'/');await landing.locator('#collection .card-title').filter({hasText:'Browser test product'}).waitFor();
 const card=landing.locator('#collection .card').filter({hasText:'Browser test product'});assert.match(await card.innerText(),/345.000/);
 await landing.locator('#site-banner').filter({hasText:'The browser edit'}).waitFor();
 await card.locator('button').click();await landing.locator('#product-modal:not([hidden])').waitFor();
 await landing.keyboard.press('Escape');
 await landing.goto(base+'/#all-products');
 await landing.locator('.catalog-tile').filter({hasText:'345.000'}).first().waitFor();
 const hijab=landing.locator('.hijab-card').filter({hasText:'Selcuk Browser'});assert.match(await hijab.innerText(),/123.000/);assert.equal(await hijab.locator('a').getAttribute('aria-disabled'),'true');
 for(const [name,width,height] of [['phone-small',360,800],['phone',390,844],['ipad',768,1024],['ipad-air',820,1180],['ipad-landscape',1024,768],['desktop',1440,1000]]){
  await landing.setViewportSize({width,height});await landing.goto(base+'/');await landing.locator('#collection .card').first().waitFor();
  await landing.screenshot({path:`test-results/landing-${name}.png`,fullPage:true});
  const overflow=await landing.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,`Landing overflow at ${width}`);
  await landing.goto(base+'/#all-products');await landing.locator('#all-products:not([hidden])').waitFor();assert.equal(await landing.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`Catalog overflow at ${width}`);
  if(width<=820){await landing.locator('#menu').click();await landing.locator('#collection-menu:not([hidden])').waitFor();await landing.keyboard.press('Escape')}
  await page.setViewportSize({width,height});await page.locator('#navigation [data-tab=overview]').click();
  await page.screenshot({path:`test-results/admin-${name}.png`,fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`Admin overflow at ${width}`);
  await page.locator('#navigation [data-tab=products]').click();await page.locator('[data-action=new]').click();
  assert.equal(await page.locator('#editor').evaluate(el=>el.scrollWidth>el.clientWidth+1),false,`Editor overflow at ${width}`);
  await page.locator('#cancel-editor').click();
 }
 // A fresh browser sees original seed, not another visitor's demo edits.
 const fresh=await browser.newContext();const other=await fresh.newPage();await other.goto(base+'/');await other.locator('#collection .card').first().waitFor();assert.equal(await other.getByText('TANJ Browser test product',{exact:true}).count(),0);await fresh.close();
 // Live backend login and CRUD, then clean up the test record.
 const api=await browser.newContext({viewport:{width:1280,height:900}});const live=await api.newPage();live.on('pageerror',error=>errors.push(error.message));
 await live.goto('http://127.0.0.1:3000/admin/');await live.locator('[name=email]').fill('admin@tanj.test');await live.locator('[name=password]').fill('demo123');await live.locator('#login-form button').click();await live.locator('#app:not([hidden])').waitFor();
 await live.locator('#navigation [data-tab=collections]').click();await live.locator('[data-action=new]').click();await live.locator('[name=name]').fill('Browser API test');await live.locator('#edit-form button[type=submit]').click();await live.locator('#editor').waitFor({state:'hidden'});
 const collection=live.locator('.collection-card').filter({hasText:'Browser API test'});await collection.waitFor();live.on('dialog',dialog=>dialog.accept());await collection.locator('[data-action=delete]').click();await collection.waitFor({state:'detached'});
 await live.locator('#logout').click();await live.locator('#login-screen:not([hidden])').waitFor();
 assert.deepEqual(errors,[],'No uncaught browser errors');
 console.log('PASS: demo CRUD/publish/persistence, API login/CRUD/logout, GitHub Pages subpath, 6 responsive sizes, no browser exceptions.');
 await context.close();await api.close();
}finally{await browser.close();await new Promise(resolve=>staticServer.close(resolve))}
