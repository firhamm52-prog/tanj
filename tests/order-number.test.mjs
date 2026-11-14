import test from 'node:test';
import assert from 'node:assert/strict';
import { formatOrderNumber, numberDemoOrders } from '../shared/order-number.js';
import { buildOrderEmail } from '../shared/order-email.js';
test('simple numbers retain demo references and continue above existing numbers', () => {
  assert.equal(formatOrderNumber(1), 'TANJ-000001');
  assert.throws(() => formatOrderNumber(NaN));
  const state = numberDemoOrders({
    orders: [
      { id: 'legacy-b', createdAt: 2 },
      { id: 'legacy-a', createdAt: 1 },
      { id: 'kept', createdAt: 3, orderNumber: 'TANJ-000010' },
    ],
  });
  assert.equal(state.orders[1].orderNumber, 'TANJ-000011');
  assert.equal(state.orders[0].orderNumber, 'TANJ-000012');
  assert.equal(state.orderSequence, 12);
  assert.deepEqual(numberDemoOrders(structuredClone(state)), state);
});
test('email shows the simple number while preserving its secure order link', () => {
  const order = {
    id: 'TANJ-private-internal-id',
    orderNumber: 'TANJ-000001',
    status: 'WAITING_PAYMENT',
    deadline: Date.now() + 1000,
    total: 100000,
    subtotal: 100000,
    customer: { name: 'Test', email: 'test@example.com', phone: '081234567890', address: 'Test' },
    shipping: { fee: 0 },
    items: [{ name: 'Test', color: 'Cream', qty: 1, price: 100000 }],
  };
  const email = buildOrderEmail(order, { baseUrl: 'https://tanj.example' });
  assert.ok(email.subject.includes('TANJ-000001'));
  assert.ok(!email.subject.includes(order.id));
  assert.equal(new URL(email.url).searchParams.get('order'), order.id);
});
