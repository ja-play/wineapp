/**
 * Centralized Application Configuration & Business Constants
 */

export const COMPANY_CONFIG = {
  name: "Aurellion Wine Selection",
  fullName: "Aurellion Wine SRL",
  subTitle: "Distribution Grossiste Vins Belgique - Direct Import",
  address: "Rue de la Station 48, 1000 Bruxelles",
  vatNumber: "BE 0123.456.789",
  country: "Belgique",
  contactEmail: "info@winedistribution.be"
};

export const TAX_CONFIG = {
  VAT_RATE: 0.21, // 21% Belgian VAT
  DEFAULT_VIDANGE_PER_CASE: 1.35 // Default bottle/case Vidange deposit in EUR
};

export const FIREBASE_APP_CONFIG = {
  projectId: "wine-catalog-belgium",
  authDomain: "wine-catalog-belgium.firebaseapp.com",
  storageBucket: "wine-catalog-belgium.appspot.com",
  region: "europe-west9"
};

export const LOCALE_CONFIG = {
  defaultLocale: "fr-BE",
  currency: "EUR",
  currencySymbol: "€"
};

/**
 * Format currency helper
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat(LOCALE_CONFIG.defaultLocale, {
    style: 'currency',
    currency: LOCALE_CONFIG.currency
  }).format(Number(amount || 0));
}
