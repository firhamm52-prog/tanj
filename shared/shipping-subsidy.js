export function shippingSubsidy(lines, catalog, originalFee, settings = {}) {
  const clothingQty = lines.reduce((sum, line) => {
    const item = catalog.find((product) => product.id === line.id);
    return item && !item.isHijab && !item.id.startsWith('hijab-') ? sum + line.qty : sum;
  }, 0);
  const max = settings.shippingDiscountMax;
  const subsidy =
    settings.shippingDiscountEnabled === true && Number.isInteger(max) && max >= 0 && max <= 1000000
      ? Math.min(max, Math.max(0, originalFee))
      : 0;
  return { originalFee, subsidy, fee: originalFee - subsidy, clothingQty };
}
