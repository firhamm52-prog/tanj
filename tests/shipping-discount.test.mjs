import test from 'node:test';
import assert from 'node:assert/strict';
import { shippingSubsidy } from '../shared/shipping-subsidy.js';
import { defaultSiteSettings, validateSiteSettings } from '../shared/site-settings.js';
test('shipping discount covers actual fee up to cap without a cart minimum', () => {
  const settings = { shippingDiscountEnabled: true, shippingDiscountMax: 20000 };
  for (const fee of [0, 18000, 20000, 35000]) {
    const result = shippingSubsidy([{ id: 'hijab-test', qty: 1 }], [], fee, settings);
    assert.equal(result.subsidy, Math.min(fee, 20000));
    assert.equal(result.fee, Math.max(0, fee - 20000));
    assert.equal(result.originalFee, fee);
  }
  assert.equal(
    shippingSubsidy([], [], 35000, { ...settings, shippingDiscountEnabled: false }).subsidy,
    0,
  );
  assert.equal(shippingSubsidy([], [], 35000).subsidy, 0);
});
test('CMS validates promotion caps and accepts older settings safely', () => {
  assert.throws(
    () => validateSiteSettings({ ...defaultSiteSettings, shippingDiscountMax: -1 }),
    /Batas subsidi/,
  );
  assert.throws(
    () => validateSiteSettings({ ...defaultSiteSettings, shippingDiscountMax: 1000001 }),
    /Batas subsidi/,
  );
  assert.equal(
    validateSiteSettings({ ...defaultSiteSettings, shippingDiscountEnabled: true })
      .shippingDiscountMax,
    20000,
  );
});
