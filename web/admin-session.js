import {
  cloudEnabled,
  cloudReady,
  cloudSession,
  cloudIsAdmin,
  cloudAuthenticate,
  cloudLogout,
} from './supabase-customer.js?v=improve-2';
export const usesCloudAdmin = cloudEnabled;
if (cloudEnabled) await cloudReady.catch(() => {});
const key = 'tanj-payment-admin-local-v1',
  sessionKey = 'tanj-admin-session-v2';
function account() {
  if (cloudEnabled) return cloudSession() ? { id: cloudSession().email } : null;
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}
async function digest(password, salt) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new Uint8Array(salt), iterations: 210000, hash: 'SHA-256' },
    material,
    256,
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export { account, digest };
export function isAdmin() {
  if (cloudEnabled) return cloudIsAdmin();
  try {
    const saved = account(),
      session = JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
    return !!(
      saved &&
      typeof saved.id === 'string' &&
      /^[a-f0-9]{64}$/.test(saved.hash) &&
      Array.isArray(saved.salt) &&
      saved.salt.length === 16 &&
      session &&
      session.verified === true &&
      session.issuedAt <= Date.now() &&
      session.expires - session.issuedAt === 8 * 60 * 60 * 1000 &&
      session.hash === saved.hash &&
      session.id === saved.id &&
      session.expires > Date.now()
    );
  } catch {
    return false;
  }
}
function startSession(saved) {
  const now = Date.now();
  sessionStorage.setItem(
    sessionKey,
    JSON.stringify({
      id: saved.id,
      hash: saved.hash,
      verified: true,
      issuedAt: now,
      expires: now + 8 * 60 * 60 * 1000,
    }),
  );
}
export function logout() {
  if (cloudEnabled) return cloudLogout();
  sessionStorage.removeItem(sessionKey);
  sessionStorage.removeItem('tanj-admin-session-v1');
  sessionStorage.removeItem('tanj-studio-session');
}
export function saveAccount(saved) {
  localStorage.setItem(key, JSON.stringify(saved));
}

export async function loginAdmin(data) {
  const id = String(data.id || '').trim(),
    password = String(data.password || '');
  if (!id || id.length > 80) throw Error('Isi ID admin.');
  if (!password.trim() || password.length < 12 || password.length > 128)
    throw Error('Isi password minimal 12 karakter.');
  if (cloudEnabled) {
    await cloudAuthenticate({ email: id.toLowerCase(), password }, false);
    if (!cloudIsAdmin()) throw Error('Akun ini belum diberi akses admin TANJ di database.');
    return;
  }
  let saved = account();
  if (!saved) {
    if (password !== data.repeat) throw Error('Ulangi password yang sama.');
    const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)));
    saved = { id, salt, hash: await digest(password, salt) };
    if (account()) throw Error('Akun sudah dibuat. Muat ulang dan login.');
    saveAccount(saved);
  } else if (saved.id !== id || saved.hash !== (await digest(password, saved.salt)))
    throw Error('ID atau password salah.');
  startSession(saved);
}
