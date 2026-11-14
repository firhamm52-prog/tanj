export function formatOrderNumber(number) {
  if (!Number.isSafeInteger(number) || number < 1) throw Error('Nomor urut pesanan tidak valid.');
  return 'TANJ-' + String(number).padStart(6, '0');
}
export const orderReference = (order) => order.orderNumber || order.id;

// Browser-only demo migration: retain existing references and number older examples.
export function numberDemoOrders(state) {
  let sequence = Number.isSafeInteger(state.orderSequence) ? state.orderSequence : 0;
  for (const order of state.orders) {
    const match = /^TANJ-(\d{1,15})$/.exec(order.orderNumber || '');
    if (match) sequence = Math.max(sequence, Number(match[1]));
  }
  for (const order of [...state.orders].sort(
    (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
  ))
    if (!order.orderNumber) order.orderNumber = formatOrderNumber(++sequence);
  state.orderSequence = sequence;
  return state;
}
