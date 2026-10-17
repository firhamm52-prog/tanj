import { isPaymentLink } from '../shared/payment-link.js';
// Store screen references only; Back/Forward must never replay shopping actions.
export function mountScreenHistory({ getCatalog, openProduct }) {
  const $ = (id) => document.getElementById(id);
  let restoring = false,
    queued = false,
    restoreVersion = 0;
  function snapshot() {
    if (!$('product-modal').hidden)
      return { screen: 'product', product: $('product-modal').dataset.activeProduct };
    if (!$('search-modal').hidden) return { screen: 'search' };
    if (!$('bag-modal').hidden) {
      if (!$('manual-payment').hidden)
        return { screen: 'orders', order: $('manual-payment').dataset.selectedOrder || null };
      return { screen: $('bag-checkout-view').hidden ? 'cart' : 'checkout' };
    }
    return { screen: 'page' };
  }
  let last = snapshot(),
    lastUrl = location.href;
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function capture() {
    if (restoring || queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (restoring) return;
      const next = snapshot();
      if (!equal(next, last)) {
        const state = { ...history.state, tanjScreen: next };
        if (location.href !== lastUrl) history.replaceState(state, '');
        else history.pushState(state, '');
        last = next;
        lastUrl = location.href;
      }
    });
  }
  async function restore(state) {
    const version = ++restoreVersion;
    restoring = true;
    try {
      for (const id of ['product-modal', 'search-modal', 'bag-modal']) $(id).hidden = true;
      $('manual-payment').hidden = true;
      if (state.screen === 'product') openProduct(getCatalog().find((p) => p.id === state.product));
      else if (state.screen === 'search') $('search-modal').hidden = false;
      else if (['cart', 'checkout', 'orders'].includes(state.screen)) {
        $('bag-modal').hidden = false;
        $('bag-cart-view').hidden = state.screen !== 'cart';
        $('bag-checkout-view').hidden = state.screen !== 'checkout';
        $('bag-modal').classList.toggle('checkout-surface', state.screen === 'checkout');
        if (state.screen === 'orders')
          await new Promise((resolve) =>
            window.dispatchEvent(
              new CustomEvent('tanj-restore-order-screen', {
                detail: { id: state.order, done: resolve },
              }),
            ),
          );
      }
      if (version !== restoreVersion) return;
      document.body.style.overflow = state.screen === 'page' ? '' : 'hidden';
      const surface =
        state.screen === 'product'
          ? $('product-modal')
          : state.screen === 'search'
            ? $('search-modal')
            : state.screen !== 'page'
              ? $('bag-modal')
              : null;
      const panel = surface?.querySelector('.utility-panel,.product-panel');
      if (panel) panel.scrollTop = 0;
      surface?.querySelector('button')?.focus({ preventScroll: true });
    } finally {
      if (version === restoreVersion) {
        last = snapshot();
        lastUrl = location.href;
        restoring = false;
      }
    }
  }
  const saved = isPaymentLink(location.href) ? null : history.state?.tanjScreen;
  history.replaceState({ ...history.state, tanjScreen: saved || last }, '');
  new MutationObserver(capture).observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ['hidden', 'data-active-product', 'data-selected-order'],
  });
  window.addEventListener('popstate', (e) => {
    // A fresh email/hash link belongs to the existing authenticated order router.
    if (!e.state?.tanjScreen && isPaymentLink(location.href)) return;
    void restore(e.state?.tanjScreen || { screen: 'page' });
  });
  window.addEventListener('hashchange', () => {
    lastUrl = location.href;
  });
  if (saved) void restore(saved);
}
