import {digest} from './admin-session.js?v=login-form-3';
// Keep fixed overlays outside gallery sections that use layout/paint containment.
for(const id of ['bag-modal','product-modal','account-modal','search-modal']){const overlay=document.getElementById(id);if(overlay)document.body.append(overlay);}
const USERS='tanj-customers-v1',SESSION='tanj-customer-session-v1';
const read=(key,fallback)=>{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;};
export function customerSession(){
 try{const session=JSON.parse(sessionStorage.getItem(SESSION)||'null');if(!session||session.expires<=Date.now())return null;const user=read(USERS,[]).find(u=>u.id===session.id&&u.hash===session.hash);return user?{id:user.id,name:user.name,email:user.email}:null;}catch{return null;}
}
export function customerLogout(){sessionStorage.removeItem(SESSION);window.dispatchEvent(new Event('tanj-customer-change'));}
export async function authenticateCustomer({name,email,password,repeat},register=false){
 email=String(email||'').trim().toLowerCase();password=String(password||'');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>120)throw Error('Isi alamat email yang valid.');
 if(!password.trim()||password.length<12||password.length>128)throw Error('Password wajib diisi, minimal 12 karakter.');
 const users=read(USERS,[]);let user=users.find(u=>u.email===email);
 if(register){
  if(!String(name||'').trim()||name.length>80)throw Error('Isi nama lengkap, maksimal 80 karakter.');
  if(password!==repeat)throw Error('Ulangi password yang sama.');
  if(user)throw Error('Email sudah terdaftar. Silakan login.');
  const salt=Array.from(crypto.getRandomValues(new Uint8Array(16)));
  user={id:crypto.randomUUID(),name:name.trim(),email,salt,hash:await digest(password,salt)};
  // Re-read after hashing to avoid overwriting registrations from another tab.
  const latest=read(USERS,[]);if(latest.some(u=>u.email===email))throw Error('Email sudah terdaftar. Silakan login.');
  localStorage.setItem(USERS,JSON.stringify([...latest,user]));
 }else if(!user||user.hash!==await digest(password,user.salt))throw Error('Email atau password salah.');
 sessionStorage.setItem(SESSION,JSON.stringify({id:user.id,hash:user.hash,expires:Date.now()+8*60*60*1000}));
 window.dispatchEvent(new Event('tanj-customer-change'));return customerSession();
}
export function addresses(){const user=customerSession();if(!user)return [];return read('tanj-addresses-'+user.id,[]);}
export function saveAddress(address){
 const user=customerSession();if(!user)throw Error('Login terlebih dahulu.');
 const list=addresses(),id=address.id||crypto.randomUUID(),entry={...address,id};const index=list.findIndex(a=>a.id===id);
 if(index<0){if(list.length>=10)throw Error('Maksimal 10 alamat. Hapus alamat lama untuk membuat yang baru.');list.push(entry);}else list[index]=entry;
 localStorage.setItem('tanj-addresses-'+user.id,JSON.stringify(list));return entry;
}
export function deleteAddress(id){const user=customerSession();if(!user)throw Error('Login terlebih dahulu.');localStorage.setItem('tanj-addresses-'+user.id,JSON.stringify(addresses().filter(a=>a.id!==id)));}

let dialog,pending=null,register=false,lastFocus;
function render(){
 const user=customerSession();
 dialog.innerHTML=`<button type="button" class="customer-close" aria-label="Tutup account">&times;</button><p class="checkout-eyebrow">TANJ / YOUR ACCOUNT</p><h2>${user?'Account kamu':register?'Daftar':'Selamat datang kembali'}</h2><p>${user?'Kelola pesanan dan alamat pengirimanmu.':register?'Buat akun untuk menyimpan alamat dan melanjutkan pesanan.':'Login untuk menambahkan produk ke tas dan membuat pesanan.'}</p>${user?'<p id="customer-profile"></p><button type="button" class="shop-primary" id="customer-orders">Pesanan saya</button><button type="button" class="customer-text" id="customer-logout">Logout</button>':`<form id="customer-auth" novalidate>${register?'<label>Nama lengkap<input name="name" autocomplete="name" maxlength="80" required></label>':''}<label>Email<input name="email" type="email" autocomplete="email" maxlength="120" required></label><label>Password<input name="password" type="password" autocomplete="${register?'new-password':'current-password'}" minlength="12" maxlength="128" required></label>${register?'<label>Ulangi password<input name="repeat" type="password" autocomplete="new-password" required></label>':''}<p id="customer-auth-error" role="alert"></p><button class="shop-primary" type="submit">${register?'Buat akun baru':'Login'}</button></form><button type="button" class="customer-text" id="customer-auth-toggle">${register?'Sudah punya akun? Login di sini':'Belum punya akun? Daftar di sini'}</button>`}<div class="customer-account-footer"><button type="button" class="customer-text" id="customer-admin">Admin TANJ</button><small>Versi uji: akun dan alamat tersimpan pada browser ini.</small></div>`;
 dialog.querySelector('.customer-close').onclick=()=>dialog.close();
 dialog.querySelector('#customer-admin').onclick=()=>{pending=null;dialog.close();window.dispatchEvent(new Event('tanj-open-admin-account'));};
 if(user){dialog.querySelector('#customer-profile').textContent=user.name+' · '+user.email;dialog.querySelector('#customer-logout').onclick=()=>{customerLogout();render();};dialog.querySelector('#customer-orders').onclick=()=>{dialog.close();document.getElementById('bag-open').click();document.getElementById('manual-orders').click();};return;}
 dialog.querySelector('#customer-auth-toggle').onclick=()=>{register=!register;render();};
 dialog.querySelector('form').onsubmit=async e=>{
  e.preventDefault();const button=e.currentTarget.querySelector('[type=submit]');button.disabled=true;
  try{await authenticateCustomer(Object.fromEntries(new FormData(e.currentTarget)),register);const next=pending;pending=null;dialog.close();next?.();}
  catch(err){dialog.querySelector('#customer-auth-error').textContent=err.message;}
  finally{button.disabled=false;}
 };
}
export function showCustomerAccount(next=null){
 if(!dialog){dialog=document.createElement('dialog');dialog.id='customer-account';dialog.className='checkout-dialog';dialog.setAttribute('aria-label','Account customer');document.body.append(dialog);dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});dialog.addEventListener('close',()=>{pending=null;lastFocus?.focus();});}
 pending=next;lastFocus=document.activeElement;register=false;render();if(!dialog.open)dialog.showModal();
}
export function requireCustomer(next){if(customerSession()){next();return true;}showCustomerAccount(next);return false;}

document.querySelectorAll('[data-account-open]').forEach(button=>button.addEventListener('click',()=>showCustomerAccount()));
document.addEventListener('click',e=>{
 const target=e.target.closest('#product-add,#product-buy-now,#bag-next');
 if(target&&!customerSession()){
  e.preventDefault();e.stopImmediatePropagation();showCustomerAccount(()=>target.click());
 }
},true);
