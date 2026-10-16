import {test} from 'node:test';
import assert from 'node:assert/strict';
import {shippingMaster} from '../web/shipping-master.js';
import {getShippingEstimate,shippingCities,shippingProvinces} from '../web/shipping.js';
test('master covers all supplied regions with positive lower-bound estimates',()=>{
 assert.equal(shippingProvinces.length,38);assert.equal(shippingMaster.cities.length,514);assert.equal(new Set(shippingMaster.cities.map(c=>c.id)).size,514);
 for(const province of shippingProvinces){const cities=shippingCities(province.id);assert.ok(cities.length);for(const city of cities){const quote=getShippingEstimate(province.id,city.id);assert.ok(Number.isSafeInteger(quote.fee)&&quote.fee>0);assert.equal(quote.fee,city.fee);assert.equal(quote.weightKg,1);assert.equal(quote.estimate,true);}}
});
test('use workbook lower estimates including city/regency and island exceptions',()=>{
 for(const [province,city,fee] of [['36','36.71',10000],['32','32.73',10000],['32','32.17',13000],['35','35.78',20000],['31','31.01',24000],['91','91.71',90000],['95','95.08',225000]])assert.equal(getShippingEstimate(province,city).fee,fee);
 assert.throws(()=>getShippingEstimate('36','91.71'),/Pilih provinsi/);assert.throws(()=>getShippingEstimate('',''),/Pilih provinsi/);assert.throws(()=>getShippingEstimate('36','999.99'),/Pilih provinsi/);
});
