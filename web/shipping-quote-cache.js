const prefix = 'tanj-shipping-quotes-v1:';
const memory = new Map();
const keyFor = (address, lines) =>
  JSON.stringify([
    String(address.zip),
    address.provinceId,
    address.cityId,
    address.districtId,
    lines.map(({ id, qty }) => ({ id, qty })).sort((a, b) => a.id.localeCompare(b.id)),
  ]);
function bucket(owner) {
  try {
    return JSON.parse(localStorage.getItem(prefix + owner) || '{}');
  } catch {
    return memory.get(owner) || {};
  }
}
function persist(owner, data) {
  memory.set(owner, data);
  try {
    localStorage.setItem(prefix + owner, JSON.stringify(data));
  } catch {}
}
export function cachedShippingQuote(owner, address, lines) {
  if (!owner || !address) return null;
  const entry = bucket(owner).quotes?.[keyFor(address, lines)];
  if (
    !entry?.quote?.quoteId ||
    !Array.isArray(entry.quote.options) ||
    !entry.quote.options.length ||
    Date.parse(entry.quote.expiresAt) <= Date.now() + 15000 ||
    !Number.isFinite(Date.parse(entry.quote.expiresAt))
  )
    return null;
  return structuredClone(entry);
}
export function saveShippingQuote(owner, address, lines, quote) {
  if (!owner || !quote?.quoteId || !quote.options?.length) return;
  const data = bucket(owner),
    key = keyFor(address, lines);
  data.quotes = Object.fromEntries(
    Object.entries(data.quotes || {})
      .filter(([, v]) => Date.parse(v.quote?.expiresAt) > Date.now() + 15000)
      .slice(-9),
  );
  data.quotes[key] = {
    quote: structuredClone(quote),
    selectedId: data.quotes[key]?.selectedId || null,
  };
  persist(owner, data);
}
export function selectShippingQuote(owner, address, lines, selectedId) {
  const entry = cachedShippingQuote(owner, address, lines);
  if (!entry?.quote.options.some((o) => o.id === selectedId)) return;
  const data = bucket(owner);
  data.quotes[keyFor(address, lines)] = { ...entry, selectedId };
  data.addressId = address.id;
  persist(owner, data);
}
export const lastShippingAddress = (owner) => (owner ? bucket(owner).addressId : null);
export function forgetShippingQuotes(owner) {
  if (!owner) return;
  persist(owner, {});
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('tanj-shipping-quote-invalid'));
}
