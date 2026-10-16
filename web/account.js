import {
  account,
  isAdmin,
  logout,
  loginAdmin,
  usesCloudAdmin,
} from './admin-session.js?v=improve-2';
import { sendReset } from './password-recovery.js?v=improve-2';
const $ = (id) => document.getElementById(id);
let lastFocus;
const cmsLink = document.getElementById('cms-admin-link');
function updateCmsAccess() {
  if (cmsLink) cmsLink.hidden = !isAdmin();
}
window.addEventListener('pageshow', updateCmsAccess);
updateCmsAccess();
window.addEventListener('tanj-customer-change', updateCmsAccess);
window.addEventListener('focus', updateCmsAccess);
window.addEventListener('tanj-customer-authenticated', updateCmsAccess);
function render() {
  const signed = isAdmin();
  $('admin-view-switch').hidden = !signed;
  $('login').hidden = signed;
  $('admin-account-signed').hidden = !signed;
  $('account-title').textContent = signed ? 'Account admin' : 'Login admin';
  if (signed)
    $('admin-account-name').textContent =
      'Login sebagai ' + account().id + '. Sesi aktif. Logout untuk masuk ulang dengan password.';
  else prepare();
}
function showAccount() {
  render();
  if (!isAdmin()) {
    const form = $('auth-form');
    form.reset();
    form.elements.id.value = '';
    form.elements.id.removeAttribute('placeholder');
  }
  lastFocus = document.activeElement;
  for (const id of ['bag-modal', 'product-modal', 'search-modal']) {
    const overlay = $(id);
    if (overlay) overlay.hidden = true;
  }
  document.querySelector('#customer-account[open]')?.close();
  $('account-modal').hidden = false;
  document.body.style.overflow = 'hidden';
  $('account-close').focus();
}
function closeAccount() {
  $('account-modal').hidden = true;
  document.body.style.overflow = '';
  lastFocus?.focus();
  if (['#account', '#admin-login'].includes(location.hash))
    history.replaceState(null, '', location.pathname + location.search);
}
function prepare() {
  try {
    const first = !usesCloudAdmin && !account();
    $('login-title').textContent = first ? 'Buat akun admin' : 'Login admin';
    $('login-note').textContent = first
      ? 'Atur ID dan password sekali untuk prototipe di browser ini. Gunakan password khusus demo minimal 12 karakter.'
      : usesCloudAdmin
        ? 'Masukkan email dan password akun Supabase yang diberi akses admin TANJ.'
        : 'Masukkan ID dan password yang sudah dibuat di browser ini.';
    if (first) {
      const repeat = $('repeat-label');
      if (repeat) {
        repeat.hidden = false;
        $('auth-form').elements.repeat.required = true;
      }
    } else {
      $('repeat-label')?.remove();
    }
    $('auth-submit').textContent = first ? 'Simpan akun & masuk' : 'Masuk';
  } catch {
    $('auth-error').textContent = 'Penyimpanan akun tidak dapat dibaca.';
    $('auth-submit').disabled = true;
  }
}
$('auth-form').noValidate = true;
$('auth-form').onsubmit = async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  $('auth-error').textContent = '';
  $('auth-submit').disabled = true;
  try {
    const data = Object.fromEntries(new FormData(form));
    if (!String(data.id || '').trim()) throw Error('Isi ID admin.');
    if (!String(data.password || '').trim()) throw Error('Password wajib diisi.');
    await loginAdmin(data);
    updateCmsAccess();
    form.reset();
    closeAccount();
    render();
  } catch (err) {
    $('auth-error').textContent = err.message;
    form.elements.password.value = '';
    form.elements.password.focus();
  } finally {
    $('auth-submit').disabled = false;
  }
};

$('forgot').onclick = () => {
  if (usesCloudAdmin) {
    sendReset($('auth-form').elements.id.value, $('auth-error'), $('forgot'));
    return;
  }
  $('recovery').hidden = !$('recovery').hidden;
};
$('admin-signout').onclick = async () => {
  await logout();
  closeAccount();
  location.href = './';
};
window.addEventListener('tanj-open-admin-account', showAccount);
$('account-close').onclick = closeAccount;
$('account-modal').onclick = (e) => {
  if (e.target === $('account-modal')) closeAccount();
};
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('account-modal').hidden) closeAccount();
});
function route() {
  if (['#account', '#admin-login'].includes(location.hash)) showAccount();
}
window.addEventListener('hashchange', route);
window.addEventListener('pageshow', render);
window.addEventListener('focus', render);
render();
route();

const relogin = document.createElement('button');
relogin.type = 'button';
relogin.className = 'button';
relogin.id = 'admin-reauthenticate';
relogin.textContent = 'Login ulang';
$('admin-account-signed').querySelector('a').replaceWith(relogin);
relogin.onclick = async () => {
  await logout();
  $('auth-form').reset();
  $('auth-error').textContent = '';
  render();
  $('auth-form').elements.password.focus();
};

window.addEventListener('tanj-customer-authenticated', render);
window.addEventListener('tanj-customer-change', () => {
  if (!document.getElementById('account-modal').hidden) render();
});

if (usesCloudAdmin) {
  const field = $('auth-form').elements.id;
  field.type = 'email';
  field.autocomplete = 'off';
  $('auth-form').autocomplete = 'off';
  field.removeAttribute('placeholder');
  field.closest('label').firstChild.textContent = 'Email admin';
}
