import { TAX_CONFIG } from '../app-config.js';

/**
 * Unified Tax Calculation Engine
 * Guarantees identical financial math across Evaluator UI, Depot UI, and Cloud Functions.
 */

export function calculateOrderTotals(cartItems = [], discountPercent = 0) {
  let rawSubtotalHT = 0;

  cartItems.forEach(item => {
    const qty = Number(item.qty || item.quantity || 0);
    const priceHT = Number(item.priceHT || item.unitPriceHT || 0);
    const itemSubtotalHT = qty * priceHT;
    rawSubtotalHT += itemSubtotalHT;
  });

  const validDiscount = Math.max(0, Math.min(100, Number(discountPercent || 0)));
  const discountMultiplier = (100 - validDiscount) / 100;
  const totalHT = Number((rawSubtotalHT * discountMultiplier).toFixed(2));
  const totalTVA = Number((totalHT * TAX_CONFIG.VAT_RATE).toFixed(2));
  const totalTTC = Number((totalHT + totalTVA).toFixed(2));

  return {
    rawSubtotalHT: Number(rawSubtotalHT.toFixed(2)),
    discountPercent: validDiscount,
    discountAmount: Number((rawSubtotalHT - totalHT).toFixed(2)),
    totalHT: totalHT,
    totalVidanges: 0,
    totalTVA: totalTVA,
    totalTTC: totalTTC,
    vatRatePercentage: TAX_CONFIG.VAT_RATE * 100
  };
}
