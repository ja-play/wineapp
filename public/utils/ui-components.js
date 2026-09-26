/**
 * Shared UI Components and Helpers for Aurellion Wine Application
 */

export const ORDER_STATUSES = {
  submitted: {
    label: 'Submitted (New)',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    dotClass: 'bg-amber-500'
  },
  packing: {
    label: 'Packing in Progress',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
    dotClass: 'bg-sky-500'
  },
  dispatched: {
    label: 'Dispatched on Truck',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    dotClass: 'bg-indigo-500'
  },
  delivered: {
    label: 'Delivered & Signed',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    dotClass: 'bg-emerald-500'
  },
  cancelled: {
    label: 'Cancelled',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    dotClass: 'bg-rose-500'
  }
};

/**
 * Returns HTML markup for a styled order status badge.
 * @param {string} status - Order status ('submitted', 'packing', 'dispatched', 'delivered')
 * @returns {string} HTML badge markup
 */
export function renderStatusBadge(status) {
  const normalized = (status || 'submitted').toLowerCase();
  const config = ORDER_STATUSES[normalized] || ORDER_STATUSES.submitted;
  
  return `<span class="${config.badgeClass} border text-xs px-3 py-1 rounded-full font-bold inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full ${config.dotClass}"></span>${config.label}</span>`;
}

/**
 * Formats a numeric amount as Euro currency.
 * @param {number|string} amount
 * @returns {string} Formatted string like "€12.50"
 */
export function formatEuro(amount) {
  const num = Number(amount || 0);
  return `€${isNaN(num) ? '0.00' : num.toFixed(2)}`;
}

/**
 * Formats a Firestore timestamp, Date, or date string into localized Belgian date format.
 * @param {any} dateVal
 * @param {string} [locale='fr-BE']
 * @param {boolean} [includeTime=true]
 * @returns {string}
 */
export function formatDate(dateVal, locale = 'fr-BE', includeTime = true) {
  if (!dateVal) return 'N/A';
  let d;
  if (dateVal.toDate && typeof dateVal.toDate === 'function') {
    d = dateVal.toDate();
  } else if (dateVal instanceof Date) {
    d = dateVal;
  } else {
    d = new Date(dateVal);
  }
  if (isNaN(d.getTime())) return 'N/A';
  return includeTime ? d.toLocaleString(locale) : d.toLocaleDateString(locale);
}

/**
 * Displays a toast notification in the lower right of the screen.
 * Automatically injects DOM elements if not already present.
 * @param {string} msg - Message to display
 * @param {boolean} [isError=false] - Whether this is an error notification
 */
export function showToast(msg, isError = false) {
  let toast = document.getElementById('toast');
  let toastMsg = document.getElementById('toast-message');

  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toastMsg = document.createElement('span');
    toastMsg.id = 'toast-message';
    toast.appendChild(toastMsg);
    document.body.appendChild(toast);
  }

  if (toastMsg) {
    toastMsg.textContent = msg;
  } else {
    toast.textContent = msg;
  }

  toast.className = `fixed bottom-5 right-5 z-50 transition-all duration-300 font-medium text-sm px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-white ${isError ? 'bg-rose-600' : 'bg-emerald-600'}`;
  toast.classList.remove('opacity-0', 'translate-y-16');

  if (toast._timer) clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-16');
  }, 3500);
}

// Bind to window for global inline accessibility
if (typeof window !== 'undefined') {
  window.renderStatusBadge = renderStatusBadge;
  window.showToast = showToast;
  window.formatEuro = formatEuro;
  window.formatDate = formatDate;
}
