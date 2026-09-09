/**
 * HTML Sanitization and XSS Prevention Utilities
 */

/**
 * Escapes unsafe HTML characters to prevent XSS vulnerabilities when embedding user strings into DOM.
 * @param {string} str - Raw string
 * @returns {string} Safe HTML-encoded string
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Safely creates a Text Node or sets textContent on a DOM element.
 * @param {HTMLElement} element 
 * @param {string} text 
 */
export function setSafeText(element, text) {
  if (element) {
    element.textContent = text || '';
  }
}

/**
 * Converts a string to Proper Case (Title Case)
 * @param {string} str
 * @returns {string} Proper case string
 */
export function toProperCase(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

