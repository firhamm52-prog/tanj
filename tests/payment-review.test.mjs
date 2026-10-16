import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { normalizePaymentReview } from '../shared/payment-review.js';
test('admin local transaction time is sent as UTC with its original instant', () => {
  const script =
    "import {normalizePaymentReview as n} from './shared/payment-review.js';console.log(JSON.stringify(n({paidAt:'2026-10-16T20:29',amount:'695315',reference:'ok',checked:true,note:'OK'})))";
  for (const [tz, expected] of [
    ['Asia/Jakarta', '2026-10-16T13:29:00.000Z'],
    ['Asia/Makassar', '2026-10-16T12:29:00.000Z'],
    ['Asia/Jayapura', '2026-10-16T11:29:00.000Z'],
    ['UTC', '2026-10-16T20:29:00.000Z'],
  ]) {
    const value = JSON.parse(
      execFileSync(process.execPath, ['--input-type=module', '-e', script], {
        env: { ...process.env, TZ: tz },
        encoding: 'utf8',
      }),
    );
    assert.equal(value.paidAt, expected);
    assert.equal(value.amount, '695315');
    assert.equal(value.reference, 'ok');
    assert.equal(value.checked, true);
  }
});
test('ISO timestamps remain stable and missing/invalid times fail', () => {
  assert.equal(
    normalizePaymentReview({ paidAt: '2026-10-16T20:29:00+07:00' }).paidAt,
    '2026-10-16T13:29:00.000Z',
  );
  for (const paidAt of ['', undefined, 'not-a-date'])
    assert.throws(() => normalizePaymentReview({ paidAt }), /waktu transaksi/);
});
