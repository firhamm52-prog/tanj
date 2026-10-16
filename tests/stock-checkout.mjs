import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd();
const server=createServer(async(req,res)=>{try{let path=new URL(req.url,'http://localhost').pathname;if(!path.startsWith('/tanj/')){res.writeHead(404);return res.end()}path=path.slice(5);if(path.endsWith('/'))path+='index.html';const file=resolve(root,'.'+path);const bytes=await readFile(file);res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css'}[extname(file)]||'application/octet-stream'});res.end(bytes)}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(4321,'127.0.0.1',r));
let browser;
try{
browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4321/tanj/admin/');await page.locator('#login-form button').click();await page.locator('#app:not([hidden])').waitFor();await page.locator('#navigation [data-tab=products]').click();await page.locator('#list [data-action=edit]').first().click();await page.locator('[name=stock]').fill('1');await page.locator('#edit-form button[type=submit]').click();await page.locator('#editor').waitFor({state:'hidden'});page.on('dialog',d=>d.accept());await page.locator('#publish').click();await page.locator('#toast').filter({hasText:'dipublikasikan'}).waitFor();
await page.goto('http://127.0.0.1:4321/tanj/');await page.locator('#collection .product-preview').first().click();assert.equal(await page.locator('#product-quantity').textContent(),'1');assert.equal(await page.locator('#product-plus').isDisabled(),true);await page.locator('#product-add').click();assert.equal(await page.locator('#bag-count').textContent(),'1');assert.equal(await page.locator('#bag-items button[aria-label^="Tambah jumlah"]').isDisabled(),true);
await page.locator('#bag-modal [data-utility-close]').click();await page.locator('#collection .product-preview').first().click();assert.equal(await page.locator('#product-add').isDisabled(),true);assert.equal(await page.locator('#product-quantity').textContent(),'0');
await page.locator('#product-modal-colors button').nth(1).click();assert.equal(await page.locator('#product-quantity').textContent(),'1');assert.equal(await page.locator('#product-add').isDisabled(),false);await page.locator('#product-modal-close').click();
// Old saved carts, including duplicate lines, must be capped against the published stock.
await page.evaluate(()=>localStorage.setItem('noireaterial-cart-v1',JSON.stringify([{id:'base-0-0',qty:8},{id:'base-0-0',qty:3}])));await page.reload();await page.locator('#bag-open').click();assert.equal(await page.locator('#bag-count').textContent(),'1');assert.equal(await page.locator('#bag-items .bag-line').count(),1);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('noireaterial-cart-v1'))[0].qty),1);
await page.locator('#bag-next').click();await page.locator('#checkout-name').fill('Stock Test');await page.locator('#checkout-phone').fill('081234567890');await page.locator('#checkout-address').fill('Test address');
// A published stock change must prevent a manual-payment order too.
await page.locator('#checkout-province').selectOption('36');await page.locator('#checkout-city').selectOption('36.71');await page.locator('#checkout-district').selectOption('36.71.07');await page.locator('#checkout-zip').selectOption('15115');
await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('tanj-studio-published-v1'));state.products[0].stock=0;state.products[0].inStock=false;localStorage.setItem('tanj-studio-published-v1',JSON.stringify(state))});
await page.locator('#checkout-form button[type=submit]').click();await page.locator('#manual-checkout-error').filter({hasText:'Pilihan produk berubah'}).waitFor();
assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tanj-manual-payments-demo-v1')||'{"orders":[]}').orders.length),0);assert.deepEqual(errors,[]);console.log('PASS: demo stock=1, product and bag limits, repeated adds, variant switch, old duplicate cart, and stock recheck before manual-payment checkout.');
}finally{await browser?.close();await new Promise(r=>server.close(r))}
