export function shippingSubsidy(lines, catalog, originalFee) {
  const clothingQty = lines.reduce((sum, line) => {
    const item = catalog.find((product) => product.id === line.id);
    return item && !item.isHijab && !item.id.startsWith('hijab-') ? sum + line.qty : sum;
  }, 0);
  const subsidy = clothingQty >= 2 ? Math.min(20000, originalFee) : 0;
  return { originalFee, subsidy, fee: originalFee - subsidy, clothingQty };
}
