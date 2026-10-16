// datetime-local has no offset. Interpret it in the admin device's timezone,
// then send an unambiguous UTC timestamp to PostgreSQL timestamptz.
export function normalizePaymentReview(input) {
  const paidAt = new Date(input?.paidAt);
  if (!input?.paidAt || !Number.isFinite(paidAt.getTime()))
    throw Error('Isi waktu transaksi yang valid.');
  return { ...input, paidAt: paidAt.toISOString() };
}
