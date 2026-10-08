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
browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext();const errors=[];
const site=await context.newPage();site.on('pageerror',e=>errors.push(e.message));await site.goto('http://127.0.0.1:4321/tanj/');await site.locator('.card-sold').first().waitFor();
const admin=await context.newPage();await admin.goto('http://127.0.0.1:4321/tanj/admin/');await admin.locator('#login-form button').click();await admin.locator('#app:not([hidden])').waitFor();await admin.locator('#navigation [data-tab=products]').click();await admin.locator('#list [data-action=edit]').first().click();await admin.locator('[name=sold]').fill('18');await admin.locator('[name=stock]').fill('20');await admin.locator('#edit-form button[type=submit]').click();await admin.locator('#editor').waitFor({state:'hidden'});
assert.equal(await admin.evaluate(()=>JSON.parse(localStorage.getItem('tanj-studio-draft-v1')).products[0].sold),18);
admin.on('dialog',d=>d.accept());await admin.locator('#publish').click();await admin.locator('#toast').filter({hasText:'dipublikasikan'}).waitFor();
assert.equal(await admin.evaluate(()=>JSON.parse(localStorage.getItem('tanj-studio-published-v1')).products[0].sold),18);
await site.bringToFront();await site.locator('.card-sold').first().filter({hasText:'18 sold'}).waitFor({timeout:10000});
await site.reload();assert.equal(await site.locator('.card-sold').first().textContent(),'18 sold');
await admin.reload();await admin.locator('#app:not([hidden])').waitFor();await admin.locator('#navigation [data-tab=products]').click();await admin.locator('#list [data-action=edit]').first().click();assert.equal(await admin.locator('[name=sold]').inputValue(),'18');assert.equal(await admin.locator('[name=stock]').inputValue(),'20');assert.deepEqual(errors,[]);console.log('PASS: sold=18 and stock=20 persist through save, publish, existing storefront tab, and reload.');
}finally{await browser?.close();await new Promise(r=>server.close(r))}
