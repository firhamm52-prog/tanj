import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shippingSubsidy } from '../shared/shipping-subsidy.js';
const catalog = [
  { id: 'dress-a' },
  { id: 'dress-b' },
  { id: 'hijab-a', isHijab: true },
  { id: 'scarf-custom', isHijab: true },
];
test('shipping discount is disabled even for two clothing pieces', () => {
  assert.equal(shippingSubsidy([{ id: 'dress-a', qty: 1 }], catalog, 35000).subsidy, 0);
  assert.equal(shippingSubsidy([{ id: 'dress-a', qty: 2 }], catalog, 35000).fee, 35000);
  assert.equal(
    shippingSubsidy(
      [
        { id: 'dress-a', qty: 1 },
        { id: 'dress-b', qty: 1 },
      ],
      catalog,
      35000,
    ).subsidy,
    0,
  );
});
test('hijabs do not qualify and do not contribute to the clothing count', () => {
  assert.equal(shippingSubsidy([{ id: 'hijab-a', qty: 2 }], catalog, 35000).subsidy, 0);
  assert.equal(
    shippingSubsidy(
      [
        { id: 'dress-a', qty: 1 },
        { id: 'scarf-custom', qty: 2 },
      ],
      catalog,
      35000,
    ).subsidy,
    0,
  );
  assert.equal(
    shippingSubsidy(
      [
        { id: 'dress-a', qty: 2 },
        { id: 'hijab-a', qty: 2 },
      ],
      catalog,
      35000,
    ).subsidy,
    0,
  );
});
test('disabled subsidy preserves the full courier fee', () => {
  assert.deepEqual(shippingSubsidy([{ id: 'dress-a', qty: 2 }], catalog, 15000), {
    originalFee: 15000,
    subsidy: 0,
    fee: 15000,
    clothingQty: 2,
  });
  assert.equal(shippingSubsidy([{ id: 'dress-a', qty: 2 }], catalog, 0).fee, 0);
});
