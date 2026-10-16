import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {isolateEmail} from './helpers/email-isolation.mjs';
const root=process.cwd(),user={id:'11111111-1111-4111-8111-111111111111',email:'cloud@example.com',user_metadata:{full_name:'Cloud buyer'},aud:'authenticated',role:'authenticated'};
const jwt=[{alg:'HS256',typ:'JWT'},{sub:user.id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'},'fake'].map(x=>typeof x==='string'?x:Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
const session={access_token:jwt,refresh_token:'test-refresh-token',expires_in:3600,token_type:'bearer',user};let rows=[],orders=[],loginRequests=0,resetRequests=0,passwordUpdates=0,adminRole=false;
const server=createServer(async(req,res)=>{try{let path=new URL(req.url,'http://localhost').pathname;if(path==='/')path='/index.html';const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',{'.html':'text/html','.js':'text/javascript','.css':'text/css'}[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/`;let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});
 async function device(){const context=await browser.newContext({timezoneId:'Asia/Jakarta'});await isolateEmail(context);await context.route('**/web/supabase-config.js?*',r=>r.fulfill({contentType:'text/javascript',body:'export const supabaseConfig={enabled:true,url:"https://cloud.test",publishableKey:"test-key"};'}));
 await context.route('https://cloud.test/**',async route=>{const req=route.request(),u=new URL(req.url());let body={},status=200;
 if(u.pathname==='/auth/v1/token'){loginRequests++;const input=req.postDataJSON();if(input.password!=='cloud-password-123'){status=400;body={code:'invalid_credentials',msg:'Invalid login credentials'};}else body=session;}
 else if(u.pathname==='/auth/v1/signup')body={user,session:null};
 else if(u.pathname==='/auth/v1/user'){if(req.method()==='PUT')passwordUpdates++;body=user;}
 else if(u.pathname==='/auth/v1/recover'){resetRequests++;assert.equal(req.postDataJSON().email,user.email);body={};}
 else if(u.pathname==='/auth/v1/logout'){status=204;}
 else if(u.pathname==='/rest/v1/rpc/tanj_is_admin')body=adminRole;
 else if(u.pathname==='/rest/v1/tb_m_payment_settings')body={data:{hours:24,admin:'TANJ'}};
 else if(u.pathname==='/rest/v1/tb_t_order')body=orders.map(data=>({data}));
 else if(u.pathname==='/rest/v1/rpc/tanj_decide_payment'){
  const input=req.postDataJSON();assert.equal(input.checked,true);assert.equal(input.decision,'approve');assert.equal(input.payload,undefined);body={...orders.find(o=>o.id===input.order_id),status:'PAID',version:2};orders=orders.map(o=>o.id===body.id?body:o);
 }
 else if(u.pathname==='/rest/v1/rpc/tanj_save_tracking'){
  const input=req.postDataJSON();assert.equal(input.tracking_number,'JNE-TEST-123');body={...orders.find(o=>o.id===input.order_id),tracking:{courier:input.courier,number:input.tracking_number,updatedAt:Date.now()},version:3};orders=orders.map(o=>o.id===body.id?body:o);
 }
 else if(u.pathname==='/rest/v1/rpc/tanj_update_order'){
  const input=req.postDataJSON();assert.equal(input.payload.paidAt,'2026-10-16T13:29:00.000Z');body={...orders.find(o=>o.id===input.order_id),status:'PAID',version:2};orders=orders.map(o=>o.id===body.id?body:o);
 }
 else if(u.pathname==='/rest/v1/rpc/tanj_create_order'){
  const input=req.postDataJSON(),now=Date.now();body={id:'TANJ-'+input.request_id.toUpperCase(),customerId:user.id,customer:{...input.customer,email:user.email},items:[{id:'base-0-0',name:'TANJ Sand',color:'Cream',qty:1,price:687000}],shipping:{fee:10000,methodName:'JNE Reguler',estimate:true},payment:{id:'qris-manual',name:'QRIS manual'},subtotal:687000,adjustment:123,total:697123,code:123,status:'WAITING_PAYMENT',createdAt:now,deadline:now+86400000,version:1,proofs:[],logs:[{at:now,note:'Pesanan uji'}]};orders.push(body);
 }
 else if(u.pathname==='/rest/v1/tb_m_address'){
  if(req.method()==='POST'){const row={...req.postDataJSON(),id:'22222222-2222-4222-8222-222222222222'};rows.push(row);body=row;}
  else if(req.method()==='DELETE'){rows=[];body=null;}
  else body=rows;
 }else {status=404;body={message:u.pathname};}
 await route.fulfill({status,contentType:'application/json',body:status===204?'':JSON.stringify(body)});
 });const page=await context.newPage();await page.goto(url);await page.evaluate(async()=>{const m=await import('./web/customer-account.js?v=improve-2');await m.customerReady;});return {context,page};}
 const laptop=await device();
 const login=async(page,password)=>page.evaluate(async password=>{try{const m=await import('./web/customer-account.js?v=improve-2');return await m.authenticateCustomer({email:'cloud@example.com',password});}catch(e){return {error:e.message};}},password);
 assert.match((await login(laptop.page,'wrong-password-123')).error,/Email atau password salah/);
 assert.equal((await login(laptop.page,'cloud-password-123')).id,user.id);
 await laptop.page.evaluate(async()=>{const m=await import('./web/customer-account.js?v=improve-2');await m.saveAddress({name:'Customer',phone:'081200000000',address:'Jalan cloud',provinceId:'36',cityId:'36.71',districtId:'36.71.07',zip:'15115',email:'wrong@example.com'});});
 const phone=await device();assert.equal(await phone.page.evaluate(async()=>(await import('./web/customer-account.js?v=improve-2')).customerSession()),null);
 assert.equal((await login(phone.page,'cloud-password-123')).id,user.id);
 const addresses=await phone.page.evaluate(async()=>{const m=await import('./web/customer-account.js?v=improve-2');return m.loadAddresses();});assert.equal(addresses[0].address,'Jalan cloud');assert.equal(addresses[0].email,user.email);
 const order=await laptop.page.evaluate(async()=>{const store=await import('./web/manual-payment-store.js?v=improve-2');return store.createPayment({name:'Cloud buyer',email:'wrong@example.com',phone:'081200000000',address:'Jalan cloud',provinceId:'36',cityId:'36.71',districtId:'36.71.07',zip:'15115',paymentMethod:'qris-manual',shippingMethod:'jne-regular'},[{id:'base-0-0',qty:1}],[]);});
 await phone.page.goto(url+'#pesanan?order='+encodeURIComponent(order.id));await phone.page.locator('.manual-id').filter({hasText:order.id}).waitFor();assert.match(await phone.page.locator('#manual-payment h3').textContent(),/Menunggu pembayaran/);
 await phone.page.reload();assert.equal(await phone.page.evaluate(async()=>{const m=await import('./web/customer-account.js?v=improve-2');await m.customerReady;return m.customerSession()?.id;}),user.id);
 await phone.page.evaluate(async()=>{const m=await import('./web/customer-account.js?v=improve-2');await m.customerLogout();});assert.equal(await phone.page.evaluate(async()=>(await import('./web/customer-account.js?v=improve-2')).customerSession()),null);
 const signup=await phone.page.evaluate(async()=>{const m=await import('./web/customer-account.js?v=improve-2');return m.authenticateCustomer({name:'New customer',email:'new@example.com',password:'cloud-password-123',repeat:'cloud-password-123'},true);});assert.equal(signup.needsConfirmation,true);assert.ok(loginRequests>=3);
 // Admin uses the same verified account, but a separate server-authorized role.
 await phone.page.goto(url+'#admin-login');await phone.page.locator('#account-modal:not([hidden])').waitFor();await phone.page.locator('#auth-form [name=id]').fill(user.email);await phone.page.locator('#forgot').click();await phone.page.locator('#auth-error').filter({hasText:'tautan pemulihan'}).waitFor();assert.equal(resetRequests,1);
 await phone.page.locator('#auth-form [name=password]').fill('cloud-password-123');await phone.page.locator('#auth-submit').click();await phone.page.locator('#auth-error').filter({hasText:'belum diberi akses admin'}).waitFor();
 adminRole=true;await phone.page.locator('#auth-form [name=password]').fill('cloud-password-123');await phone.page.locator('#auth-submit').click();await phone.page.locator('#account-modal').waitFor({state:'hidden'});assert.equal(await phone.page.evaluate(async()=>(await import('./web/admin-session.js?v=improve-2')).isAdmin()),true);
 await phone.page.evaluate(async id=>{const store=await import('./web/manual-payment-store.js?v=improve-2');await store.reviewPayment(id,1,'approve',{paidAt:'2026-10-16T20:29',amount:697123,checked:true,reference:'ok',note:'OK'});},order.id);assert.equal(orders[0].status,'PAID');
 orders[0]={...orders[0],status:'CHECKING',version:1};
 await phone.page.evaluate(async id=>{const store=await import('./web/manual-payment-store.js?v=improve-2');await store.decidePayment(id,1,'approve',true);await store.saveTracking(id,2,'JNE','JNE-TEST-123');},order.id);
 await laptop.page.goto(url+'#pesanan?order='+encodeURIComponent(order.id));await laptop.page.locator('.order-tracking').filter({hasText:'JNE-TEST-123'}).waitFor();
 const recovery=await device();await recovery.page.goto(url+'?recovery=1#access_token='+jwt+'&refresh_token=test-refresh-token&expires_in=3600&token_type=bearer&type=recovery');await recovery.page.locator('#password-recovery-dialog[open]').waitFor();await recovery.page.locator('#password-recovery-dialog [name=password]').fill('updated-password-123');await recovery.page.locator('#password-recovery-dialog [name=repeat]').fill('different-password');await recovery.page.locator('#password-recovery-dialog [type=submit]').click();await recovery.page.locator('#password-recovery-error').filter({hasText:'Ulangi password'}).waitFor();assert.equal(passwordUpdates,0);await recovery.page.locator('#password-recovery-dialog [name=repeat]').fill('updated-password-123');await recovery.page.locator('#password-recovery-dialog [type=submit]').click();await recovery.page.locator('#password-recovery-error').filter({hasText:'berhasil diperbarui'}).waitFor();assert.equal(passwordUpdates,1);
 console.log('PASS: official SDK with mocked backend: wrong password rejected, same account and address across isolated devices, refresh restores session, logout clears session, signup requires confirmation, admin role guard, reset email and recovery password change. No real email or account created.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
