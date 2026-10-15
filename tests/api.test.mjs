import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {root} from '../services/config.mjs';
let children=[],folder,cookie='',log='';
const base='http://127.0.0.1:4310';
async function call(path,method='GET',data,auth=true,extra={}){
 const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(auth?{cookie}:{}),...extra},body:data===undefined?undefined:JSON.stringify(data)});
 const result=await response.json();return {response,data:result};
}
before(async()=>{
 folder=await mkdtemp(join(tmpdir(),'tanj-api-'));
 const env={...process.env,NODE_ENV:'test',CHECKOUT_DEMO:'true',HOST:'127.0.0.1',PORT:'4310',AUTH_PORT:'4311',CATALOG_PORT:'4312',CONTENT_PORT:'4313',DATA_DIR:folder,ADMIN_EMAIL:'admin@tanj.test',ADMIN_PASSWORD:'demo123',INTERNAL_SECRET:'tanj-integration-test-secret'};
 children=['auth','catalog','content','gateway'].map(name=>{
  const child=spawn(process.execPath,[`services/${name}.mjs`],{cwd:root,env,stdio:['ignore','pipe','pipe']});child.stdout.on('data',s=>log+=s);child.stderr.on('data',s=>log+=s);return child;
 });
 for(let i=0;i<100;i++){try{const {response}=await call('/api/health');if(response.ok)return}catch{}await new Promise(resolve=>setTimeout(resolve,100))}
 throw new Error('Services failed to start: '+log);
});
after(async()=>{
 await Promise.all(children.map(child=>new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',resolve);child.kill()})));
 if(folder){const target=resolve(folder);assert.equal(dirname(target),resolve(tmpdir()));assert.ok(basename(target).startsWith('tanj-api-'));await rm(target,{recursive:true,force:true})}
});
test('microservices: authentication, validation, draft/publish, relationships, persistent data',async()=>{
 assert.equal((await call('/api/health')).data.services.length,3);
 assert.equal((await call('/api/admin/state','GET',undefined,false)).response.status,401);
 assert.equal((await call('/api/admin/products','POST',{},false)).response.status,401);
 assert.equal((await call('/api/auth/login','POST',{email:'admin@tanj.test',password:'wrong'},false)).response.status,401);
 const login=await call('/api/auth/login','POST',{email:'admin@tanj.test',password:'demo123'},false);
 assert.equal(login.response.status,200);assert.match(login.response.headers.get('set-cookie'),/HttpOnly/);
 cookie=login.response.headers.get('set-cookie').split(';')[0];
 assert.equal((await call('/api/auth/session')).data.user.role,'admin');
 const initial=(await call('/api/admin/state')).data;
 assert.equal(initial.products.length,12);assert.equal(initial.hijabs.length,6);
 assert.equal((await call('/api/admin/products','POST',{...initial.products[0],price:-1})).response.status,422);
 assert.equal((await call('/api/admin/products','POST',{...initial.products[0],model:'javascript:alert(1)'})).response.status,422);
 assert.equal((await call('/api/admin/products','POST',{...initial.products[0],collectionId:'missing'})).response.status,422);
 assert.equal((await call('/api/admin/publish','POST',{},true,{Origin:'https://other.example'})).response.status,403);
 const collection=(await call('/api/admin/collections','POST',{name:'Test collection',description:'Integration test'})).data;
 const draft={...initial.products[0],collectionId:collection.id,name:'Integration product',price:321000,stock:7,status:'draft'};
 const created=await call('/api/admin/products','POST',draft);assert.equal(created.response.status,201);const id=created.data.id;
 await call('/api/admin/publish','POST',{});
 assert.ok(!(await call('/api/storefront')).data.products.some(p=>p.id===id),'Draft product stays private');
 await call(`/api/admin/products/${id}`,'PUT',{...draft,status:'published'});
 assert.ok(!(await call('/api/storefront')).data.products.some(p=>p.id===id),'Unsaved publication remains unchanged');
 await call('/api/admin/publish','POST',{});
 assert.equal((await call('/api/storefront')).data.products.find(p=>p.id===id).price,321000);
 assert.equal((await call(`/api/admin/collections/${collection.id}`,'DELETE')).response.status,409);
 await call(`/api/admin/products/${id}`,'PUT',{...draft,status:'published',stock:0});await call('/api/admin/publish','POST',{});
 assert.equal((await call('/api/storefront')).data.products.find(p=>p.id===id).inStock,false);
 const banner={...initial.banner,title:'Integration banner',enabled:true};await call('/api/admin/banner','PUT',banner);
 assert.notEqual((await call('/api/storefront')).data.banner.title,banner.title);await call('/api/admin/publish','POST',{});
 assert.equal((await call('/api/storefront')).data.banner.title,banner.title);
 assert.equal((await call(`/api/admin/products/${id}`,'DELETE')).response.status,200);
 assert.equal((await call(`/api/admin/collections/${collection.id}`,'DELETE')).response.status,200);
 assert.equal((await fetch(base+'/.env')).status,404);assert.equal((await fetch(base+'/data/auth.sqlite')).status,404);
 assert.equal((await fetch('http://127.0.0.1:4312/state')).status,401);
 const range=await fetch(base+'/assets/noireaterial-brand-intro.mp4',{headers:{Range:'bytes=0-99'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,100);
 await call('/api/auth/logout','POST',{});assert.equal((await call('/api/admin/state')).response.status,401);
 // Reopening the initialized database must preserve edits, rather than reseeding.
 const {DatabaseSync}=await import('node:sqlite');const db=new DatabaseSync(join(folder,'content.sqlite'));
 assert.equal(db.prepare('SELECT title FROM banner').get().title,'Integration banner');db.close();
});

test('checkout: server totals, private proof, review, duplicate decisions and stock reservations',async()=>{
 const login=await call('/api/auth/login','POST',{email:'admin@tanj.test',password:'demo123'},false);cookie=login.response.headers.get('set-cookie').split(';')[0];
 const product=(await call('/api/storefront')).data.products.find(p=>p.stock>0);
 const quotes=await call('/api/shipping/quotes','POST',{destination:1,items:[{id:product.id,qty:1}]},false);assert.equal(quotes.response.status,200);
 const customer={name:'Checkout test',phone:'081234567890',address:'Alamat test Indonesia',consent:true,quote:quotes.data[0].id,total:1};
 const created=await call('/api/orders','POST',customer,false);assert.equal(created.response.status,201);const order=created.data;
 assert.equal(order.total,order.subtotal+order.shipping.cost+order.adjustment);assert.equal(order.total%1000,order.suffix);
 assert.equal((await call('/api/orders','POST',customer,false)).response.status,409,'Quote cannot create duplicate orders');
 assert.equal((await call('/api/orders/'+order.id,'GET',undefined,false)).response.status,404);
 const headers={Authorization:'Bearer '+order.token};
 assert.equal((await call('/api/admin/orders/'+order.id+'/approve','POST',{})).response.status,409);
 assert.equal((await call('/api/orders/'+order.id+'/proof','POST',{proof:'data:image/png;base64,aW52YWxpZA=='},false,headers)).response.status,422);
 const proof='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8S8AAAAASUVORK5CYII=';
 assert.equal((await call('/api/orders/'+order.id+'/proof','POST',{proof},false,headers)).data.status,'pending_review');
 assert.equal((await call('/api/admin/orders/'+order.id+'/proof','GET',undefined,false)).response.status,401);
 assert.equal((await call('/api/admin/orders/'+order.id+'/reject','POST',{note:'Gambar tidak jelas'})).data.status,'rejected');
 assert.equal((await call('/api/orders/'+order.id+'/proof','POST',{proof},false,headers)).data.status,'pending_review');
 const approved=await call('/api/admin/orders/'+order.id+'/approve','POST',{});assert.equal(approved.data.status,'approved');assert.equal(approved.data.notification,'not_configured');
 assert.equal((await call('/api/admin/orders/'+order.id+'/approve','POST',{})).response.status,409);
 assert.equal((await call('/api/orders/'+order.id+'/proof','POST',{proof},false,headers)).response.status,409);
 assert.ok(!('token' in (await call('/api/admin/orders')).data[0]));
});
test('checkout browser: delivery form opens payment without WhatsApp redirect',async()=>{
 const {chromium}=await import('playwright');const browser=await chromium.launch({channel:'chrome',headless:true});
 try{const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const product=(await call('/api/storefront')).data.products.find(p=>p.stock>1);
 await page.goto(base);await page.evaluate(id=>localStorage.setItem('noireaterial-cart-v1',JSON.stringify([{id,qty:1}])),product.id);await page.reload();
 await page.locator('#bag-open').click();await page.locator('#bag-next').click();
 await page.locator('#checkout-name').fill('Customer UI');await page.locator('#checkout-phone').fill('081234567891');await page.locator('#checkout-address').fill('Alamat test Karawaci');await page.locator('#shipping-search').fill('Karawaci');await page.locator('#shipping-find').click();await page.waitForFunction(()=>document.getElementById('shipping-destination').options.length>1);await page.locator('#shipping-destination').selectOption('1');await page.locator('#shipping-calculate').click();await page.waitForFunction(()=>document.getElementById('shipping-rate').options.length>1);await page.locator('#shipping-rate').selectOption({index:1});await page.locator('#checkout-consent').check();await page.locator('#checkout-form button[type=submit]').click();await page.locator('#payment-view').waitFor({state:'visible'});assert.match(await page.locator('#payment-view').textContent(),/SIMULASI/);assert.equal(new URL(page.url()).host,'127.0.0.1:4310');assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
