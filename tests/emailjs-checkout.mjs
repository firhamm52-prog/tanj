import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd();
const server=createServer(async(req,res)=>{try{let path=new URL(req.url,'http://localhost').pathname;if(!path.startsWith('/tanj/'))throw Error();path=path.slice(5);if(path.endsWith('/'))path+='index.html';const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();const bytes=await readFile(file);res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'}[extname(file)]||'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/tanj/`;let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();const sent=[],errors=[];let refuse=false;
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/web/supabase-config.js?*',route=>route.fulfill({contentType:'text/javascript',body:'export const supabaseConfig={enabled:false};'}));
 await page.route('**/web/email-config.js?*',route=>route.fulfill({contentType:'text/javascript',body:"export const emailConfig={enabled:true,serviceId:'service_test',templateId:'template_order',publicKey:'public_test'};"}));
 await page.route('https://api.emailjs.com/api/v1.0/email/send',async route=>{sent.push(route.request().postDataJSON());await route.fulfill({status:refuse?429:200,contentType:'text/plain',body:refuse?'Rate limited':'OK',headers:{'Access-Control-Allow-Origin':'*'}});});
 await page.goto(url);await page.evaluate(async()=>{const m=await import('./web/customer-account.js?v=owner-ui-3');await m.authenticateCustomer({name:'Trial email',email:'customer@example.com',password:'trial-password-123',repeat:'trial-password-123'},true);});
 async function checkout(first){
  await page.goto(url);await page.evaluate(()=>localStorage.setItem('noireaterial-cart-v1',JSON.stringify([{id:'base-0-0',qty:1}])));await page.reload();if(await page.locator('#bag-modal').isVisible())await page.locator('#bag-modal [data-utility-close]').click();await page.locator('#bag-open').click();await page.locator('#bag-next').click();
  if(first){await page.locator('#address-summary').click();await page.locator('#address-create').click();await page.locator('#checkout-phone').fill('081200000000');await page.locator('#checkout-address').fill('Alamat uji email');await page.locator('#checkout-province').selectOption('36');await page.locator('#checkout-city').selectOption('36.71');await page.locator('#checkout-district').selectOption('36.71.07');await page.locator('#checkout-zip').selectOption('15115');assert.equal(await page.locator('#checkout-email').getAttribute('readonly'),'');await page.evaluate(()=>document.getElementById('checkout-email').value='wrong-recipient@example.com');await page.locator('#address-editor [type=submit]').click();await page.locator('#address-dialog').waitFor({state:'hidden'});}
  await page.locator('#address-summary').filter({hasText:'Trial email'}).waitFor();await page.locator('#checkout-order').click();await page.locator('#manual-payment h3').filter({hasText:'Menunggu pembayaran'}).waitFor();
 }
 await checkout(true);await page.locator('#manual-payment-error').filter({hasText:'Notifikasi diterima layanan email'}).waitFor();assert.equal(sent.length,1);assert.equal(sent[0].template_params.customer_email,'customer@example.com');assert.equal(sent[0].template_id,'template_order');
 assert.equal(await page.locator('#send-payment-email,#payment-email-result').count(),0);
 assert.equal(await page.getByText('Rincian pesanan & status',{exact:true}).count(),0);
 await page.locator('#manual-confirm').click();await page.locator('#manual-payment h3').filter({hasText:'Menunggu verifikasi'}).waitFor();await page.locator('#manual-payment-error').filter({hasText:'sudah diterima'}).waitFor();assert.equal(sent.length,1);
 refuse=true;await checkout(false);await page.locator('#manual-payment-error').filter({hasText:'Batas pengiriman'}).waitFor();assert.equal(sent.length,2);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tanj-manual-payments-demo-v1')).orders.length),2);
 assert.deepEqual(errors,[]);
 console.log('PASS: Order automatically invokes EmailJS, duplicate actions do not resend accepted mail, provider rejection preserves order, manual send and redundant details removed. Provider requests were intercepted; no real emails sent.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
