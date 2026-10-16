import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),url='http://127.0.0.1:4322/tanj/';
const server=createServer(async(req,res)=>{try{let path=new URL(req.url,'http://localhost').pathname;if(!path.startsWith('/tanj/')){res.writeHead(404);return res.end();}path=path.slice(5);if(path.endsWith('/'))path+='index.html';const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'}[extname(file)]||'application/octet-stream'});res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(4322,'127.0.0.1',r));
let browser;
try {
 browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto(url+'admin/payments.html');
 await page.locator('#login-title').filter({hasText:'Buat akun admin'}).waitFor();
 await page.locator('[name=id]').fill('owner');await page.locator('[name=password]').fill('demo-password-123');await page.locator('[name=repeat]').fill('demo-password-123');await page.locator('#auth-submit').click();await page.locator('#dashboard').waitFor({state:'visible'});
 await page.evaluate(()=>{localStorage.setItem('tanj-manual-payments-demo-v1',JSON.stringify({version:1,settings:{admin:'Owner',hours:24},orders:[{id:'TANJ-TEST',customer:{name:'Pembeli',phone:'081200000000',address:'Alamat contoh',district:'Karawaci',city:'Tangerang',zip:'15115'},items:[{name:'Dress',color:'Black',qty:1}],shipping:{fee:10000},subtotal:687000,total:697123,adjustment:123,code:123,status:'CHECKING',createdAt:Date.now(),deadline:Date.now()+86400000,version:1,proofs:[],logs:[]}]}));window.dispatchEvent(new Event('tanj-payments-change'));});
 await page.locator('#reject').click();await page.locator('textarea').fill('Referensi transaksi belum cocok. Hubungi admin.');await page.locator('#review-form [type=submit]').click();await page.locator('[data-filter=REJECTED]').click();await page.locator('.order').waitFor();assert.match(await page.locator('#detail').textContent(),/Pembayaran ditolak/);
 await page.locator('summary').filter({hasText:'Pengaturan QRIS'}).click();
 await page.locator('#qris-file').setInputFiles({name:'qris-trial.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6l8AAAAASUVORK5CYII=','base64')});
 await page.locator('#qris-form [type=submit]').click();await page.locator('#qris-message').filter({hasText:'tersimpan'}).waitFor();assert.equal(await page.locator('#qris-preview').isVisible(),true);
 await page.goto(url);await page.locator('#bag-open').click();await page.locator('#manual-orders').click();await page.locator('[data-order-id=TANJ-TEST]').click();await page.locator('#checkout-qris-image').waitFor();
 await page.goto(url+'admin/payments.html');await page.locator('#login').waitFor({state:'visible'});
 await page.reload();await page.locator('#login').waitFor({state:'visible'});assert.equal(await page.locator('#dashboard').isVisible(),false);await page.locator('[name=id]').fill('owner');await page.locator('[name=password]').fill('wrong-password-123');await page.locator('#auth-submit').click();await page.locator('#auth-error').filter({hasText:'ID atau password salah'}).waitFor();await page.locator('[name=password]').fill('demo-password-123');await page.locator('#auth-submit').click();await page.locator('#dashboard').waitFor({state:'visible'});assert.equal(await page.locator('#filters button').count(),6);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);console.log('Admin setup, login, rejection, reload gate and mobile checks passed.');
} finally {await browser?.close();await new Promise(r=>server.close(r));}
