export function quoteChange(price: number, reference: number) {
  return reference > 0 ? ((price - reference) / reference) * 100 : 0;
}

export function cardProfit(purchasePrice: number, salePrice: number) {
  return salePrice - purchasePrice;
}

export function editionRemaining(limit: number | null, issued: number) {
  return limit === null ? null : Math.max(0, limit - issued);
}