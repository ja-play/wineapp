import { TAX_CONFIG } from '../app-config.js';

/**
 * Unified Tax Calculation Engine
 * Guarantees identical financial math across Evaluator UI, Depot UI, and Cloud Functions.
 */

export function calculateOrderTotals(cartItems = []) {
  let totalHT = 0;

  cartItems.forEach(item => {
    const qty = Number(item.qty || item.quantity || 0);
    const priceHT = Number(item.priceHT || item.unitPriceHT || 0);
    const itemSubtotalHT = qty * priceHT;
    totalHT += itemSubtotalHT;
  });

  const totalTVA = totalHT * TAX_CONFIG.VAT_RATE;
  const totalTTC = totalHT + totalTVA;

  return {
    totalHT: Number(totalHT.toFixed(2)),
    totalVidanges: 0,
    totalTVA: Number(totalTVA.toFixed(2)),
    totalTTC: Number(totalTTC.toFixed(2)),
    vatRatePercentage: TAX_CONFIG.VAT_RATE * 100
  };
}
