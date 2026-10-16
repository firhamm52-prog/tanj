import {supabaseConfig} from './supabase-config.js?v=supabase-2';
import {getShippingEstimate} from './shipping.js?v=districts-1';
export const cloudEnabled=supabaseConfig.enabled;
let client,user=null,list=[],revision=0,admin=false,recovering=false;
const change=()=>window.dispatchEvent(new Event('tanj-customer-change'));
function check(error){if(error)throw Error(error.message||'Layanan akun tidak dapat diakses.');}
function profile(u){return u?{id:u.id,email:u.email,name:u.user_metadata?.full_name||u.email.split('@')[0]}:null;}
function address(row){const shipping=getShippingEstimate(row.province_id,row.city_id);return {id:row.id,name:row.recipient,phone:row.phone,email:user?.email||'',address:row.address,provinceId:row.province_id,province:shipping.province,cityId:row.city_id,city:shipping.city,districtId:row.district_id,district:'',zip:row.postcode};}
export async function refreshAddresses(){
 if(!user){list=[];return;}const id=user.id,version=revision;
 const {data,error}=await client.from('tb_m_address').select('*').eq('account_id',id).order('created_at');check(error);
 if(version===revision&&id===user?.id)list=data.map(address);
}
async function accept(session){revision++;user=profile(session?.user);list=[];admin=false;change();}
export const cloudIsAdmin=()=>admin;
async function loadRole(){if(!user){admin=false;return;}const id=user.id;const {data,error}=await client.rpc('tanj_is_admin');if(user?.id===id)admin=!error&&data===true;}
export const cloudReady=(async()=>{
 if(!cloudEnabled)return;
 const {createClient}=await import('./vendor/supabase.js');
 client=createClient(supabaseConfig.url,supabaseConfig.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 client.auth.onAuthStateChange((event,session)=>{
  if(event==='PASSWORD_RECOVERY'){recovering=true;setTimeout(()=>window.dispatchEvent(new Event('tanj-password-recovery')),0);}
  // Do not call other Supabase methods inside the auth callback (SDK lock).
  if(user?.id!==session?.user?.id){accept(session);setTimeout(()=>loadRole().catch(()=>{}),0);}
 });
 const {data,error}=await client.auth.getSession();check(error);await accept(data.session);await loadRole();
})().catch(error=>{user=null;throw error;});
// Keep rejected initialization observable by UI actions without an unhandled rejection.
cloudReady.catch(()=>{});
export const cloudSession=()=>user;
export async function cloudClient(){await cloudReady;return client;}
export const cloudAddresses=()=>list.slice();
export async function cloudAuthenticate({name,email,password},register){
 await cloudReady;
 const {data,error}=register?await client.auth.signUp({email,password,options:{data:{full_name:name.trim()},emailRedirectTo:location.origin+location.pathname}}):await client.auth.signInWithPassword({email,password});
 if(error){if(error.code==='invalid_credentials'||error.message==='Invalid login credentials')throw Error('Email atau password salah. Gunakan Lupa password untuk mengatur password baru lewat email.');if(error.code==='email_not_confirmed'||error.message==='Email not confirmed')throw Error('Verifikasi email terlebih dahulu melalui Inbox/Spam.');check(error);}
 if(!data.session)return {needsConfirmation:true};
 await accept(data.session);await loadRole();await refreshAddresses();return user;
}
export async function cloudLogout(){await cloudReady;const {error}=await client.auth.signOut({scope:'local'});check(error);await accept(null);}
export async function cloudSaveAddress(a){
 await cloudReady;if(!user)throw Error('Login terlebih dahulu.');const id=user.id;
 const values={account_id:id,recipient:a.name,phone:a.phone,address:a.address,province_id:a.provinceId,city_id:a.cityId,district_id:a.districtId,postcode:a.zip};
 const query=a.id?client.from('tb_m_address').update(values).eq('id',a.id).eq('account_id',id):client.from('tb_m_address').insert(values);
 const {data,error}=await query.select().single();check(error);if(user?.id!==id)throw Error('Akun sudah berubah. Login kembali.');
 const saved={...a,...address(data)};list=list.filter(x=>x.id!==saved.id);list.push(saved);return saved;
}
export async function cloudDeleteAddress(id){await cloudReady;if(!user)throw Error('Login terlebih dahulu.');const {error}=await client.from('tb_m_address').delete().eq('id',id).eq('account_id',user.id);check(error);list=list.filter(a=>a.id!==id);}
export const needsPasswordRecovery=()=>recovering;
export async function requestPasswordReset(email){
 email=String(email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Isi email akun terlebih dahulu.');
 await cloudReady;const redirectTo=new URL('../',import.meta.url).href;
 const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo});check(error);
}
export async function finishPasswordReset(password,repeat){
 if(!recovering)throw Error('Buka tautan pemulihan terbaru dari email terlebih dahulu.');
 if(!password.trim()||password.length<12||password.length>128)throw Error('Password baru minimal 12 karakter, maksimal 128 karakter.');
 if(password!==repeat)throw Error('Ulangi password yang sama.');
 await cloudReady;const {error}=await client.auth.updateUser({password});check(error);recovering=false;await cloudLogout();
}
