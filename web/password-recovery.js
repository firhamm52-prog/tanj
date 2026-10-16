import {cloudEnabled,cloudReady,requestPasswordReset,finishPasswordReset,needsPasswordRecovery} from './supabase-customer.js?v=supabase-3';
let dialog;
export async function sendReset(email,output,button){
 if(button)button.disabled=true;output.textContent='Meminta email pemulihan...';
 try{await requestPasswordReset(email);output.textContent='Jika email terdaftar, tautan pemulihan akan dikirim. Periksa Inbox/Spam, buka tautan terbaru, lalu buat password baru.';}
 catch(error){output.textContent=error.message;}
 finally{if(button)button.disabled=false;}
}
function showRecovery(){
 if(!cloudEnabled||!needsPasswordRecovery()||dialog?.open)return;
 document.querySelectorAll('dialog[open]').forEach(el=>el.close());
 for(const id of ['account-modal','bag-modal','product-modal']){const el=document.getElementById(id);if(el)el.hidden=true;}
 document.body.style.overflow='';
 dialog=document.createElement('dialog');dialog.className='checkout-dialog';dialog.id='password-recovery-dialog';dialog.setAttribute('aria-labelledby','password-recovery-title');
 dialog.innerHTML='<button type="button" class="customer-close" aria-label="Tutup pemulihan">&times;</button><p class="checkout-eyebrow">TANJ / ACCOUNT</p><h2 id="password-recovery-title">Buat password baru</h2><p>Password ini berlaku untuk akun TANJ di semua perangkat.</p><form novalidate><label>Password baru<input name="password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label><label>Ulangi password baru<input name="repeat" type="password" autocomplete="new-password" required></label><p id="password-recovery-error" role="status"></p><button class="shop-primary" type="submit">Simpan password baru</button></form>';
 document.body.append(dialog);dialog.querySelector('.customer-close').onclick=()=>dialog.close();
 dialog.querySelector('form').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;const output=dialog.querySelector('#password-recovery-error');try{const data=Object.fromEntries(new FormData(form));await finishPasswordReset(data.password,data.repeat);form.reset();form.querySelectorAll('label').forEach(el=>el.hidden=true);output.textContent='Password berhasil diperbarui. Login kembali memakai password baru.';button.disabled=false;button.type='button';button.textContent='Kembali ke login';button.onclick=()=>{dialog.close();document.querySelector('[data-account-open]')?.click();};}catch(error){output.textContent=error.message;button.disabled=false;}};
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
}
if(cloudEnabled){window.addEventListener('tanj-password-recovery',showRecovery);cloudReady.then(showRecovery).catch(()=>{});}
