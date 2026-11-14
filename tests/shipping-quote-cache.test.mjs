import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cachedShippingQuote,
  saveShippingQuote,
  selectShippingQuote,
  lastShippingAddress,
  forgetShippingQuotes,
} from '../web/shipping-quote-cache.js';
test('shipping quote survives module reload, isolates owners/cart/address and expires', async () => {
  const original = globalThis.localStorage,
    data = new Map();
  globalThis.localStorage = {
    getItem: (k) => data.get(k) || null,
    setItem: (k, v) => data.set(k, v),
  };
  try {
    const a = {
        id: 'address-1',
        zip: '15115',
        provinceId: '36',
        cityId: '36.71',
        districtId: '36.71.07',
      },
      lines = [{ id: 'dress', qty: 1 }];
    const q = {
      quoteId: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 600000).toISOString(),
      options: [{ id: 'jne', fee: 35000 }],
    };
    saveShippingQuote('owner', a, lines, q);
    assert.equal(
      cachedShippingQuote('owner', a, lines).selectedId,
      null,
      'raw rates are not automatically selected',
    );
    selectShippingQuote('owner', a, lines, 'jne');
    const reloaded = await import('../web/shipping-quote-cache.js?reloaded');
    assert.equal(reloaded.cachedShippingQuote('owner', a, lines).selectedId, 'jne');
    assert.equal(lastShippingAddress('owner'), a.id);
    assert.equal(cachedShippingQuote('other', a, lines), null);
    assert.equal(cachedShippingQuote('owner', { ...a, zip: '12345' }, lines), null);
    assert.equal(cachedShippingQuote('owner', a, [{ id: 'dress', qty: 2 }]), null);
    const returned = cachedShippingQuote('owner', a, lines);
    returned.quote.options[0].fee = 1;
    assert.equal(cachedShippingQuote('owner', a, lines).quote.options[0].fee, 35000);
    saveShippingQuote('owner', a, lines, {
      ...q,
      expiresAt: new Date(Date.now() - 1).toISOString(),
    });
    assert.equal(cachedShippingQuote('owner', a, lines), null);
    saveShippingQuote('owner', a, lines, q);
    forgetShippingQuotes('owner');
    assert.equal(cachedShippingQuote('owner', a, lines), null, 'consumed quotes cannot be reused');
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  }
});
