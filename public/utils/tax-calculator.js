import { TAX_CONFIG } from '../app-config.js';

/**
 * Unified Tax and Vidange Calculation Engine
 * Guarantees identical financial math across Evaluator UI, Depot UI, and Cloud Functions.
 */

export function calculateOrderTotals(cartItems = []) {
  let totalHT = 0;
  let totalVidanges = 0;

  cartItems.forEach(item => {
    const qty = Number(item.qty || item.quantity || 0);
    const priceHT = Number(item.priceHT || item.unitPriceHT || 0);
    const vidangeRate = Number(item.vidangeRate !== undefined ? item.vidangeRate : TAX_CONFIG.DEFAULT_VIDANGE_PER_CASE);

    const itemSubtotalHT = qty * priceHT;
    const itemVidanges = qty * vidangeRate;

    totalHT += itemSubtotalHT;
    totalVidanges += itemVidanges;
  });

  const totalTVA = (totalHT + totalVidanges) * TAX_CONFIG.VAT_RATE;
  const totalTTC = totalHT + totalVidanges + totalTVA;

  return {
    totalHT: Number(totalHT.toFixed(2)),
    totalVidanges: Number(totalVidanges.toFixed(2)),
    totalTVA: Number(totalTVA.toFixed(2)),
    totalTTC: Number(totalTTC.toFixed(2)),
    vatRatePercentage: TAX_CONFIG.VAT_RATE * 100
  };
}
