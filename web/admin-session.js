const key='tanj-payment-admin-local-v1',sessionKey='tanj-admin-session-v1';
function account(){const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null;}
async function digest(password,salt){const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new Uint8Array(salt),iterations:210000,hash:'SHA-256'},material,256);return Array.from(new Uint8Array(bits)).map(b=>b.toString(16).padStart(2,'0')).join('');}

export {account,digest};
export function isAdmin(){try{const saved=account(),session=JSON.parse(sessionStorage.getItem(sessionKey)||'null');return !!(saved&&session&&session.hash===saved.hash&&session.id===saved.id&&session.expires>Date.now());}catch{return false;}}
export function startSession(saved){sessionStorage.setItem(sessionKey,JSON.stringify({id:saved.id,hash:saved.hash,expires:Date.now()+8*60*60*1000}));}
export function logout(){sessionStorage.removeItem(sessionKey);}
export function saveAccount(saved){localStorage.setItem(key,JSON.stringify(saved));}
