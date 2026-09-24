/**
 * Centralized Application Configuration & Business Constants
 */

export const COMPANY_CONFIG = {
  name: "Aurellion",
  fullName: "Aurellion Group SRL",
  subTitle: "Distribution Grossiste Vins Belgique - Direct Import",
  address: "Stationsstraat 52, 3070 Kortenberg",
  vatNumber: "BE 1042.846.604",
  country: "Belgique",
  contactEmail: "info@aurellionwine.com",
  contactPhone: "+32 476 24 54 74",
  whatsAppNumber: "32476245474",
  whatsAppLink: "https://wa.me/32476245474"
};

export const TAX_CONFIG = {
  VAT_RATE: 0.21 // 21% Belgian VAT
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
