// i18n Module for Wine Distribution Belgium Public Catalog
export const translations = {
  en: {
    pageTitle: "Wine Distribution Belgium - Volume Catalog",
    brandTitle: "Wine Select",
    brandSubtitle: "Belgium B2B Wholesale Selection",
    adminPortal: "Admin Portal",
    contactEvaluator: "Contact Evaluator",
    heroTitle: "Fast-Moving & Volume Wines",
    heroSub: "High-turnover stock selection ready for shop fulfillment. Click any wine image to view full bottle detail.",
    viewFullImage: "View Full Image",
    bottlePrice: "Bottle Price:",
    casePrice: "Case Price:",
    closeEsc: "Close (Esc)",
    skuPrefix: "SKU:",
    copyright: "© 2026 Wine Distribution Belgium. Client Wholesale Portal."
  },
  fr: {
    pageTitle: "Wine Distribution Belgium - Catalogue Grossiste",
    brandTitle: "Wine Select",
    brandSubtitle: "Sélection Grossiste B2B Belgique",
    adminPortal: "Portail Admin",
    contactEvaluator: "Contacter Évaluateur",
    heroTitle: "Vins à Forte Rotation & Volume",
    heroSub: "Sélection de stock à forte rotation prête pour le réapprovisionnement. Cliquez sur une image pour voir la bouteille.",
    viewFullImage: "Voir l'image entière",
    bottlePrice: "Prix Bouteille:",
    casePrice: "Prix Carton:",
    closeEsc: "Fermer (Échap)",
    skuPrefix: "SKU:",
    copyright: "© 2026 Wine Distribution Belgium. Portail Grossiste Client."
  },
  nl: {
    pageTitle: "Wine Distribution Belgium - Groothandel Catalogus",
    brandTitle: "Wine Select",
    brandSubtitle: "België B2B Groothandel Selectie",
    adminPortal: "Beheerdersportaal",
    contactEvaluator: "Contact Beoordelaar",
    heroTitle: "Snelverkopende & Volume Wijnen",
    heroSub: "Hoge omloopsnelheid voorraad klaar voor levering. Klik op een afbeelding voor het volledige flesdetail.",
    viewFullImage: "Bekijk Afbeelding",
    bottlePrice: "Flesprijs:",
    casePrice: "Doos Prijs:",
    closeEsc: "Sluiten (Esc)",
    skuPrefix: "SKU:",
    copyright: "© 2026 Wine Distribution Belgium. Groothandel Klantenportaal."
  },
  ur: {
    pageTitle: "وائن ڈسٹری بیوشن بیلجیئم - والیم کیٹلاگ",
    brandTitle: "وائن سلیکٹ",
    brandSubtitle: "بیلجیئم B2B ہول سیل سلیکشن",
    adminPortal: "ایڈمن پورٹل",
    contactEvaluator: "رابطہ ایویلیوایٹر",
    heroTitle: "تیزی سے فروخت ہونے والی اور والیم وائنز",
    heroSub: "شاپ کی فوری فراہمی کے لیے تیز رفتار اسٹاک کا انتخاب۔ تفصیل کے لیے کسی بھی تصویر پر کلک کریں۔",
    viewFullImage: "مکمل تصویر دیکھیں",
    bottlePrice: "بوتل کی قیمت:",
    casePrice: "پیٹی کی قیمت:",
    closeEsc: "بند کریں (Esc)",
    skuPrefix: "ایس کے یو:",
    copyright: "© 2026 وائن ڈسٹری بیوشن بیلجیئم۔ کلائنٹ ہول سیل پورٹل۔"
  }
};

const STORAGE_KEY = 'wineapp_lang';

export function getCurrentLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && translations[saved]) {
    return saved;
  }
  return 'en';
}

export function t(key, lang = getCurrentLanguage()) {
  const langObj = translations[lang] || translations.en;
  return langObj[key] || translations.en[key] || key;
}

export function setLanguage(lang) {
  if (!translations[lang]) return;
  localStorage.setItem(STORAGE_KEY, lang);
  applyTranslations(lang);
}

export function applyTranslations(lang = getCurrentLanguage()) {
  document.documentElement.lang = lang;
  
  // Handle RTL for Urdu
  if (lang === 'ur') {
    document.documentElement.dir = 'rtl';
  } else {
    document.documentElement.dir = 'ltr';
  }

  // Update elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key, lang);
    if (translation) {
      el.textContent = translation;
    }
  });

  // Update page title
  document.title = t('pageTitle', lang);

  // Trigger custom event for dynamic JS components (e.g., wine grid)
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}
