import { paymentAccessToken } from '../shared/payment-link.js?v=orders-label-20261115';
// Reloading ordinary visits starts at home; explicit guest email links remain usable.
export function prepareStorefrontEntry({ navigationType, history, href }) {
  if (navigationType === 'back_forward') return;
  const url = new URL(href);
  if (navigationType === 'reload' && !paymentAccessToken(href)) {
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
