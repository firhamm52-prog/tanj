// Reloading a previous visit starts at home; newly opened order links still work.
export function prepareStorefrontEntry({ navigationType, history, href }) {
  if (navigationType === 'back_forward') return;
  const url = new URL(href);
  if (navigationType === 'reload') {
    url.searchParams.delete('order');
    if (url.hash.startsWith('#pesanan')) url.hash = '';
  }
  history.replaceState({ ...history.state, tanjScreen: { screen: 'page' } }, '', url.href);
}

export function showStorefrontHome() {
  const url = new URL(location.href);
  url.searchParams.delete('order');
  url.hash = '';
  history.replaceState({ ...history.state, tanjScreen: { screen: 'page' } }, '', url.href);
  for (const id of [
    'bag-modal',
    'product-modal',
    'account-modal',
    'search-modal',
    'manual-payment',
  ]) {
    const surface = document.getElementById(id);
    if (surface) surface.hidden = true;
  }
  document.body.style.overflow = '';
  window.scrollTo({ top: 0, behavior: 'instant' });
}
