// Optional account invitation; guest checkout uses required contact details.
export function mountAccountSuggestion({ ready, getUser, openAccount }) {
  const dismissedKey = 'tanj-account-invitation-dismissed-v1';
  let dismissed = false;
  try {
    dismissed = sessionStorage.getItem(dismissedKey) === 'yes';
  } catch {}
  if (dismissed || !document.getElementById('product-modal')) return;
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = new URL('./account-suggestion.css?v=guest-email-20261115', import.meta.url).href;
  document.head.append(css);
  const card = document.createElement('aside');
  card.className = 'account-suggestion';
  card.hidden = true;
  card.setAttribute('aria-labelledby', 'account-suggestion-title');
  card.innerHTML = `<button type="button" class="account-suggestion-close" aria-label="Tutup ajakan login">&times;</button>
    <p class="account-suggestion-brand">TANJ / FOR YOU</p>
    <h2 id="account-suggestion-title">Kabar terbaru, untukmu.</h2>
    <p>Masuk atau daftar untuk mendapatkan update produk terbaru dan promo pilihan langsung ke email kamu.</p>
    <button type="button" class="account-suggestion-login">Masuk / Daftar</button>
    <button type="button" class="account-suggestion-later">Lanjut lihat koleksi</button>`;
  document.body.append(card);
  const dismiss = () => {
    dismissed = true;
    card.hidden = true;
    try {
      sessionStorage.setItem(dismissedKey, 'yes');
    } catch {}
  };
  card.querySelector('.account-suggestion-close').onclick = dismiss;
  card.querySelector('.account-suggestion-later').onclick = dismiss;
  card.querySelector('.account-suggestion-login').onclick = () => {
    dismiss();
    openAccount();
  };
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !card.hidden) dismiss();
  });
  window.addEventListener('tanj-customer-change', () => {
    if (getUser()) card.hidden = true;
  });
  Promise.resolve(ready)
    .catch(() => {})
    .then(() => {
      setTimeout(() => {
        if (!dismissed && !getUser() && !document.querySelector('dialog[open]'))
          card.hidden = false;
      }, 1500);
    });
}
