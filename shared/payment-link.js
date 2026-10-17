export function paymentOrderId(href) {
  const url = new URL(href);
  const hashOrder = url.hash.startsWith('#pesanan')
    ? new URLSearchParams(url.hash.split('?')[1] || '').get('order')
    : null;
  return url.searchParams.get('order') || hashOrder || null;
}
export function isPaymentLink(href) {
  const url = new URL(href);
  return Boolean(url.searchParams.get('order')) || url.hash.startsWith('#pesanan');
}
