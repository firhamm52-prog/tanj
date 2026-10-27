import { supabaseConfig } from './supabase-config.js?v=improve-2';
import { getShippingEstimate } from './shipping.js?v=districts-1';
export const cloudEnabled = supabaseConfig.enabled;
let client,
  user = null,
  list = [],
  revision = 0,
  admin = false,
  recovering = false;
const change = () => window.dispatchEvent(new Event('tanj-customer-change'));
function check(error) {
  if (error) throw Error(error.message || 'Layanan akun tidak dapat diakses.');
}
function profile(u) {
  return u
    ? { id: u.id, email: u.email, name: u.user_metadata?.full_name || u.email.split('@')[0] }
    : null;
}
function address(row) {
  const shipping = getShippingEstimate(row.province_id, row.city_id);
  return {
    id: row.id,
    name: row.recipient,
    phone: row.phone,
    email: user?.email || '',
    address: row.address,
    provinceId: row.province_id,
    province: shipping.province,
    cityId: row.city_id,
    city: shipping.city,
    districtId: row.district_id,
    district: '',
    zip: row.postcode,
  };
}
export async function refreshAddresses() {
  if (!user) {
    list = [];
    return;
  }
  const id = user.id,
    version = revision;
  const { data, error } = await client
    .from('tb_m_address')
    .select('*')
    .eq('account_id', id)
    .order('created_at');
  check(error);
  if (version === revision && id === user?.id) list = data.map(address);
}
const sessionKey = (id) => 'tanj-customer-until-' + id;
const sessionExpired = (id) => {
  const deadline = Number(localStorage.getItem(sessionKey(id)));
  return !Number.isFinite(deadline) || deadline <= Date.now();
};
async function accept(session) {
  if (session?.user) {
    const key = sessionKey(session.user.id);
    if (!localStorage.getItem(key)) localStorage.setItem(key, String(Date.now() + 60 * 60 * 1000));
    if (sessionExpired(session.user.id)) session = null;
  }
  revision++;
  user = profile(session?.user);
  list = [];
  admin = false;
  change();
}
export const cloudIsAdmin = () => admin && Boolean(cloudSession());
async function loadRole() {
  if (!user) {
    admin = false;
    return;
  }
  const id = user.id;
  const { data, error } = await client.rpc('tanj_is_admin');
  if (user?.id === id) admin = !error && data === true;
}
export const cloudReady = (async () => {
  if (!cloudEnabled) return;
  const { createClient } = await import('./vendor/supabase.js');
  client = createClient(supabaseConfig.url, supabaseConfig.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      recovering = true;
      setTimeout(() => window.dispatchEvent(new Event('tanj-password-recovery')), 0);
    }
    // Do not call other Supabase methods inside the auth callback (SDK lock).
    if (user?.id !== session?.user?.id) {
      accept(session);
      setTimeout(() => loadRole().catch(() => {}), 0);
    }
  });
  const { data, error } = await client.auth.getSession();
  check(error);
  await accept(data.session);
  await loadRole();
})().catch((error) => {
  user = null;
  throw error;
});
// Keep rejected initialization observable by UI actions without an unhandled rejection.
cloudReady.catch(() => {});
export const cloudSession = () => (user && !sessionExpired(user.id) ? user : null);
let sessionCheck = null;
export async function cloudEnsureSession() {
  await cloudReady;
  if (!cloudEnabled) return;
  if (sessionCheck) return sessionCheck;
  sessionCheck = (async () => {
    const { data, error } = await client.auth.getSession();
    check(error);
    // Reject expired sessions before accept() emits events that reload data.
    if (data.session?.user && sessionExpired(data.session.user.id)) {
      await cloudLogout();
      return null;
    }
    if (user?.id !== data.session?.user?.id) {
      await accept(data.session);
      await loadRole();
    }
    return cloudSession();
  })();
  try {
    return await sessionCheck;
  } finally {
    sessionCheck = null;
  }
}
export async function cloudClient() {
  await cloudEnsureSession();
  return client;
}
export const cloudAddresses = () => list.slice();
export async function cloudAuthenticate({ name, email, password }, register) {
  await cloudReady;
  if (register) {
    const { data: exists, error: lookupError } = await client.rpc('tanj_signup_email_exists', {
      candidate_email: email.trim().toLowerCase(),
    });
    if (lookupError)
      throw Error('Pengecekan email belum tersedia. Coba lagi nanti atau hubungi admin TANJ.');
    if (exists === true)
      throw Error('Akun sudah terdaftar, silahkan buat email yang belum terdaftar');
    if (exists !== false) throw Error('Email belum dapat diperiksa. Coba lagi nanti.');
  }
  const { data, error } = register
    ? await client.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: location.origin + location.pathname,
        },
      })
    : await client.auth.signInWithPassword({ email, password });
  if (
    register &&
    (error?.code === 'user_already_exists' ||
      error?.code === 'email_exists' ||
      /already (registered|exists)/i.test(error?.message || '') ||
      (!error && Array.isArray(data?.user?.identities) && data.user.identities.length === 0))
  )
    throw Error('Akun sudah terdaftar, silahkan buat email yang belum terdaftar');
  if (error) {
    if (error.code === 'invalid_credentials' || error.message === 'Invalid login credentials')
      throw Error(
        'Email atau password salah. Gunakan Lupa password untuk mengatur password baru lewat email.',
      );
    if (error.code === 'email_not_confirmed' || error.message === 'Email not confirmed')
      return { needsConfirmation: true, email, needsResend: true };
    check(error);
  }
  if (!data.session) return { needsConfirmation: true, email };
  return acceptLoginSession(data.session);
}
async function acceptLoginSession(session) {
  if (!session?.user) throw Error('Verifikasi belum berhasil. Coba kode terbaru dari email.');
  localStorage.setItem(sessionKey(session.user.id), String(Date.now() + 60 * 60 * 1000));
  localStorage.setItem('tanj-last-activity-' + session.user.id, String(Date.now()));
  await accept(session);
  await loadRole();
  await refreshAddresses();
  return user;
}
export async function cloudVerifySignup(email, token) {
  email = String(email || '')
    .trim()
    .toLowerCase();
  token = String(token || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(token))
    throw Error('Masukkan kode 6 digit dari email verifikasi TANJ.');
  await cloudReady;
  const { data, error } = await client.auth.verifyOtp({ email, token, type: 'email' });
  if (error)
    throw Error('Kode tidak valid atau sudah kedaluwarsa. Gunakan kode terbaru atau kirim ulang.');
  return acceptLoginSession(data.session);
}
export async function cloudResendSignup(email) {
  email = String(email || '')
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('Email belum valid.');
  await cloudReady;
  const { error } = await client.auth.resend({ type: 'signup', email });
  if (error)
    throw Error(
      error.status === 429
        ? 'Terlalu banyak permintaan. Tunggu sebentar sebelum kirim ulang.'
        : 'Kode belum dapat dikirim. Coba lagi nanti.',
    );
}
export async function cloudLogout() {
  await cloudReady;
  const { error } = await client.auth.signOut({ scope: 'local' });
  check(error);
  await accept(null);
}
export async function cloudSaveAddress(a) {
  await cloudReady;
  if (!user) throw Error('Login terlebih dahulu.');
  const id = user.id;
  const values = {
    account_id: id,
    recipient: a.name,
    phone: a.phone,
    address: a.address,
    province_id: a.provinceId,
    city_id: a.cityId,
    district_id: a.districtId,
    postcode: a.zip,
  };
  const query = a.id
    ? client.from('tb_m_address').update(values).eq('id', a.id).eq('account_id', id)
    : client.from('tb_m_address').insert(values);
  const { data, error } = await query.select().single();
  check(error);
  if (user?.id !== id) throw Error('Akun sudah berubah. Login kembali.');
  const saved = { ...a, ...address(data) };
  list = list.filter((x) => x.id !== saved.id);
  list.push(saved);
  return saved;
}
export async function cloudDeleteAddress(id) {
  await cloudReady;
  if (!user) throw Error('Login terlebih dahulu.');
  const { error } = await client
    .from('tb_m_address')
    .delete()
    .eq('id', id)
    .eq('account_id', user.id);
  check(error);
  list = list.filter((a) => a.id !== id);
}
export const needsPasswordRecovery = () => recovering;
export async function requestPasswordReset(email) {
  email = String(email || '')
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('Isi email akun terlebih dahulu.');
  await cloudReady;
  const redirectTo = new URL('../', import.meta.url).href;
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
  check(error);
}
export async function finishPasswordReset(password, repeat) {
  if (!recovering) throw Error('Buka tautan pemulihan terbaru dari email terlebih dahulu.');
  if (!password.trim() || password.length < 12 || password.length > 128)
    throw Error('Password baru minimal 12 karakter, maksimal 128 karakter.');
  if (password !== repeat) throw Error('Ulangi password yang sama.');
  await cloudReady;
  const { error } = await client.auth.updateUser({ password });
  check(error);
  recovering = false;
  await cloudLogout();
}

// Customer sessions follow Supabase expiry/refresh and explicit logout. Reading
// an email or opening another tab must not trigger the old 30-minute idle logout.
