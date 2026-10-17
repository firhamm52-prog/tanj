import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext();
  const requests = [];
  let failConfig = false;
  await context.route('**/*', async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.pathname.endsWith('/web/biteship.js'))
      return route.fulfill({
        contentType: 'text/javascript',
        body: await readFile('web/biteship.js', 'utf8'),
      });
    if (url.pathname.endsWith('/web/supabase-customer.js'))
      return route.fulfill({
        contentType: 'text/javascript',
        body: `export async function cloudClient(){return {auth:{getSession:async()=>({data:{session:{access_token:'customer-jwt'}}})}};}`,
      });
    if (url.pathname.endsWith('/web/supabase-config.js'))
      return route.fulfill({
        contentType: 'text/javascript',
        body: `export const supabaseConfig={enabled:true,url:'https://project.supabase.co',publishableKey:'public-key'};`,
      });
    if (/\/(config|rates)$/.test(url.pathname)) {
      requests.push({
        url,
        method: request.method(),
        headers: request.headers(),
        body: request.postDataJSON(),
      });
      const headers = {
        'Access-Control-Allow-Origin': 'https://firhamm52-prog.github.io',
        'Access-Control-Allow-Headers': 'apikey,authorization,content-type',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      return route.fulfill({
        status: failConfig && url.pathname.endsWith('/config') ? 404 : 200,
        headers,
        json: url.pathname.endsWith('/config')
          ? { enabled: true }
          : { options: [{ name: 'JNE', fee: 9000 }] },
      });
    }
    if (url.pathname.endsWith('/tanj/'))
      return route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><title>Shipping transport test</title>',
      });
    return route.abort();
  });
  const page = await context.newPage();
  await page.goto('https://firhamm52-prog.github.io/tanj/');
  const result = await page.evaluate(async () => {
    const shipping = await import('./web/biteship.js');
    return {
      config: await shipping.shippingConfiguration(),
      rates: await shipping.shippingRates(
        { zip: '11450', provinceId: '31', cityId: '31.73', districtId: '31.73.07' },
        [{ id: 'dress', qty: 1 }],
      ),
    };
  });
  assert.equal(result.config.enabled, true);
  assert.equal(result.rates.options[0].fee, 9000);
  const rate = requests.find((r) => r.method === 'POST');
  assert.equal(rate.url.href, 'https://project.supabase.co/functions/v1/shipping/rates');
  assert.equal(rate.headers.apikey, 'public-key');
  assert.equal(rate.headers.authorization, 'Bearer customer-jwt');
  assert.equal(rate.body.destination.zip, '11450');
  assert.ok(!requests.some((r) => r.url.pathname.startsWith('/api/')));
  failConfig = true;
  await page.reload();
  assert.equal(
    await page.evaluate(
      async () => (await (await import('./web/biteship.js')).shippingConfiguration()).enabled,
    ),
    true,
  );
  failConfig = false;
  requests.length = 0;
  await page.goto('http://localhost:3000/tanj/');
  await page.evaluate(async () => (await import('./web/biteship.js')).shippingConfiguration());
  assert.equal(requests[0].url.href, 'http://localhost:3000/api/shipping/config');
  console.log(
    'PASS: GitHub Pages uses authenticated Edge endpoint; unavailable Edge does not fall back to estimated rates; localhost keeps local server.',
  );
} finally {
  await browser.close();
}
