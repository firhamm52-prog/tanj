import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shippingMaster } from '../web/shipping-master.js';
import {
  getShippingEstimate,
  shippingCities,
  shippingProvinces,
  shippingDistricts,
  shippingPostcodes,
  validateShippingDestination,
} from '../web/shipping.js';
test('master covers all supplied regions with positive lower-bound estimates', () => {
  assert.equal(shippingProvinces.length, 38);
  assert.equal(shippingMaster.cities.length, 514);
  assert.equal(new Set(shippingMaster.cities.map((c) => c.id)).size, 514);
  for (const province of shippingProvinces) {
    const cities = shippingCities(province.id);
    assert.ok(cities.length);
    for (const city of cities) {
      const quote = getShippingEstimate(province.id, city.id);
      assert.ok(Number.isSafeInteger(quote.fee) && quote.fee > 0);
      assert.equal(quote.fee, city.fee);
      assert.equal(quote.weightKg, 1);
      assert.equal(quote.estimate, true);
    }
  }
});
test('use workbook lower estimates including city/regency and island exceptions', () => {
  for (const [province, city, fee] of [
    ['36', '36.71', 10000],
    ['32', '32.73', 10000],
    ['32', '32.17', 13000],
    ['35', '35.78', 20000],
    ['31', '31.01', 24000],
    ['91', '91.71', 90000],
    ['95', '95.08', 225000],
  ])
    assert.equal(getShippingEstimate(province, city).fee, fee);
  assert.throws(() => getShippingEstimate('36', '91.71'), /Pilih provinsi/);
  assert.throws(() => getShippingEstimate('', ''), /Pilih provinsi/);
  assert.throws(() => getShippingEstimate('36', '999.99'), /Pilih provinsi/);
});

test('every district and postcode in workbook has a valid parent and string postcode', async () => {
  const ids = new Set();
  let pairs = 0;
  for (const city of shippingMaster.cities) {
    const districts = await shippingDistricts(city.id);
    assert.ok(districts.length);
    for (const district of districts) {
      assert.ok(!ids.has(district.id));
      ids.add(district.id);
      assert.ok(district.id.startsWith(city.id + '.'));
      const codes = await shippingPostcodes(city.id, district.id);
      assert.ok(codes.length);
      assert.equal(new Set(codes.map((p) => p.code)).size, codes.length);
      for (const code of codes) {
        assert.match(code.code, /^[0-9]{5}$/);
        assert.equal(typeof code.villages, 'string');
        pairs++;
      }
    }
  }
  assert.equal(ids.size, 7285);
  assert.equal(pairs, 11580);
  assert.equal(shippingMaster.districtCount, ids.size);
  assert.equal(shippingMaster.postcodePairCount, pairs);
});
test('district and postcode validation cannot alter city shipping or accept wrong parents', async () => {
  const a = await validateShippingDestination('36', '36.71', '36.71.07', '15115');
  const b = await validateShippingDestination('36', '36.71', '36.71.04', '15125');
  assert.equal(a.district, 'Karawaci');
  assert.equal(a.zip, '15115');
  assert.equal(a.shipping.fee, 10000);
  assert.equal(b.shipping.fee, 10000);
  await assert.rejects(
    () => validateShippingDestination('36', '36.74', '36.71.07', '15115'),
    /kecamatan yang sesuai/,
  );
  await assert.rejects(
    () => validateShippingDestination('36', '36.71', '36.71.07', '15125'),
    /kode pos yang sesuai/,
  );
  await assert.rejects(
    () => validateShippingDestination('36', '36.71', '36.71.07', 15115),
    /kode pos yang sesuai/,
  );
  await assert.rejects(
    () => validateShippingDestination('36', '36.71', '', ''),
    /kecamatan yang sesuai/,
  );
});
