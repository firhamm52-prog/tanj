const resendUntil = new Map();
export function mountSignupVerification(
  dialog,
  email,
  { verify, resend, onVerified, onBack, needsResend = false },
) {
  let disposed = false,
    busy = false;
  if (!needsResend) resendUntil.set(email, Date.now() + 60000);
  dialog.innerHTML = `<button type="button" class="customer-close" aria-label="Tutup verifikasi">&times;</button><p class="checkout-eyebrow">TANJ / VERIFIKASI EMAIL</p><h2>Masukkan kode verifikasi</h2><p>Kode verifikasi dikirim ke <strong data-verification-email></strong>. Periksa Inbox atau Spam. Jangan bagikan kode ini kepada siapa pun.</p><form id="customer-verify" novalidate><label>Kode verifikasi<input name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" minlength="6" maxlength="10" required></label><p id="customer-auth-error" role="alert"></p><button type="submit" class="shop-primary">Verifikasi akun</button></form><button type="button" class="customer-text" data-resend>Kirim ulang kode</button><p data-verification-status role="status"></p><button type="button" class="customer-text" data-back>Kembali ke login</button>`;
  dialog.querySelector('[data-verification-email]').textContent = email;
  const form = dialog.querySelector('form');
  const input = form.elements.code;
  const submit = form.querySelector('[type=submit]');
  const resendButton = dialog.querySelector('[data-resend]');
  const error = dialog.querySelector('#customer-auth-error');
  const status = dialog.querySelector('[data-verification-status]');
  if (needsResend)
    status.textContent =
      'Akun belum terverifikasi. Masukkan kode dari email atau tekan Kirim ulang kode.';
  const update = () => {
    const seconds = Math.max(0, Math.ceil(((resendUntil.get(email) || 0) - Date.now()) / 1000));
    resendButton.disabled = busy || seconds > 0;
    resendButton.textContent = seconds ? `Kirim ulang dalam ${seconds} detik` : 'Kirim ulang kode';
    submit.disabled = busy;
  };
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (busy) return;
    error.textContent = '';
    const token = input.value.trim();
    if (!/^\d{6,10}$/.test(token)) {
      error.textContent = 'Isi kode angka dari email TANJ.';
      input.focus();
      return;
    }
    busy = true;
    update();
    try {
      await verify(email, token);
      if (!disposed) {
        input.value = '';
        onVerified();
      }
    } catch (err) {
      if (!disposed) error.textContent = err.message;
    } finally {
      busy = false;
      if (!disposed) update();
    }
  };
  resendButton.onclick = async () => {
    if (busy || Date.now() < (resendUntil.get(email) || 0)) return;
    busy = true;
    error.textContent = '';
    update();
    // Retain the cooldown on failure to avoid retry storms; provider also rate-limits.
    resendUntil.set(email, Date.now() + 60000);
    try {
      await resend(email);
      if (!disposed)
        status.textContent =
          'Permintaan kode terkirim. Periksa Inbox/Spam dan gunakan kode terbaru.';
    } catch (err) {
      if (!disposed) error.textContent = err.message;
    } finally {
      busy = false;
      if (!disposed) update();
    }
  };
  dialog.querySelector('.customer-close').onclick = () => dialog.close();
  dialog.querySelector('[data-back]').onclick = onBack;
  update();
  input.focus();
  const timer = setInterval(update, 1000);
  return () => {
    disposed = true;
    clearInterval(timer);
    input.value = '';
  };
}
