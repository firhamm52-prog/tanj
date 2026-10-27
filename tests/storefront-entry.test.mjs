import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareStorefrontEntry, showStorefrontHome } from '../web/storefront-entry.js';

function entry(navigationType, href) {
  const history = {
    state: { tanjScreen: { screen: 'orders', order: 'old-order' }, other: true },
    replaceState(state, _, url) {
      this.state = state;
      this.url = url;
    },
  };
  prepareStorefrontEntry({ navigationType, href, history });
  return history;
}

test('reloading a payment screen returns to the homepage without changing account data', () => {
  const history = entry('reload', 'https://example.com/tanj/?order=old-order#pesanan');
  assert.equal(history.url, 'https://example.com/tanj/');
  assert.deepEqual(history.state, { tanjScreen: { screen: 'page' }, other: true });
});

test('freshly opened email payment links retain their order route', () => {
  const href = 'https://example.com/tanj/?order=email-order#pesanan';
  assert.equal(entry('navigate', href).url, href);
});

test('new visits discard saved screens, while Back/Forward retains navigation', () => {
  assert.equal(entry('navigate', 'https://example.com/tanj/').state.tanjScreen.screen, 'page');
  const back = entry('back_forward', 'https://example.com/tanj/');
  assert.equal(back.state.tanjScreen.screen, 'orders');
  assert.equal(back.url, undefined);
});

test('ordinary login closes old screens and scrolls home without reloading', () => {
  const surfaces = new Map(
    ['bag-modal', 'product-modal', 'account-modal', 'search-modal', 'manual-payment'].map((id) => [
      id,
      { hidden: false },
    ]),
  );
  const previous = Object.fromEntries(
    ['location', 'history', 'document', 'window'].map((key) => [key, globalThis[key]]),
  );
  try {
    globalThis.location = { href: 'https://example.com/tanj/?order=old#pesanan' };
    globalThis.history = {
      state: {},
      replaceState(state, _, url) {
        this.state = state;
        this.url = url;
      },
    };
    globalThis.document = {
      getElementById: (id) => surfaces.get(id),
      body: { style: { overflow: 'hidden' } },
    };
    let scroll;
    globalThis.window = {
      scrollTo: (options) => {
        scroll = options;
      },
    };
    showStorefrontHome();
    assert.equal(history.url, 'https://example.com/tanj/');
    assert.ok([...surfaces.values()].every((surface) => surface.hidden));
    assert.equal(document.body.style.overflow, '');
    assert.equal(scroll.top, 0);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});
