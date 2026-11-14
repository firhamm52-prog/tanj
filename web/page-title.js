const visible = (selector) => {
  const element = document.querySelector(selector);
  return element && element.getClientRects().length ? element : null;
};
function currentTitle() {
  if (document.getElementById('login-screen')) {
    if (visible('#login-screen')) return 'Login admin';
    return document.getElementById('page-title')?.textContent.trim() || 'CMS';
  }
  if (!document.getElementById('product-modal')) return;
  const dialog = visible('dialog[open]');
  if (dialog) {
    if (dialog.id === 'customer-account') return 'Akun';
    return (
      document.getElementById(dialog.getAttribute('aria-labelledby'))?.textContent.trim() ||
      dialog.getAttribute('aria-label') ||
      'TANJ'
    );
  }
  if (visible('#account-modal')) return 'Admin';
  if (visible('#search-modal')) return 'Pencarian';
  if (visible('#bag-modal')) {
    if (visible('#manual-payment')) return 'Pesanan';
    return visible('#bag-checkout-view') ? 'Checkout' : 'Tas belanja';
  }
  if (visible('#product-modal'))
    return document.getElementById('product-modal-title')?.textContent.trim() || 'Produk';
  if (visible('#all-products'))
    return document.querySelector('.catalog-heading h1')?.textContent.trim() || 'Collection';
  return (
    { '#collection': 'Collection', '#lookbook': 'Lookbook', '#hijab-catalog': 'Scarves' }[
      location.hash
    ] || 'TANJ'
  );
}
let queued = false;
function update() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    const title = currentTitle();
    if (title && document.title !== title) document.title = title;
  });
}
new MutationObserver(update).observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['hidden', 'open', 'class', 'aria-current'],
});
window.addEventListener('hashchange', update);
window.addEventListener('popstate', update);
window.addEventListener('pageshow', update);
update();
