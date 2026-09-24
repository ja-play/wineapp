/**
 * Reusable Barcode / SKU Scanner Controller
 * Powers both Admin Catalog Management and Warehouse Depot Scanner interfaces.
 */

import { escapeHtml } from './sanitizer.js';
import { getIcon } from './icons.js';
import { showToast } from './ui-components.js';

/**
 * Initializes and binds a barcode scanner input and result container.
 * @param {Object} options
 * @param {string} options.inputId - ID of text input
 * @param {string} options.resultContainerId - ID of result display container
 * @param {Function} options.getWines - Function returning array of wine objects
 * @param {Function} options.onAdjustStock - Async callback (wineId, delta) => Promise<void>
 * @param {boolean} [options.isDepot=false] - Whether this is running in Depot warehouse mode
 * @param {string} [options.adjustGlobalName='adjustStock'] - Window global function name for button clicks
 */
export function setupBarcodeScanner({
  inputId,
  resultContainerId,
  getWines,
  onAdjustStock,
  isDepot = false,
  adjustGlobalName = 'adjustStock'
}) {
  const input = document.getElementById(inputId);
  const resContainer = document.getElementById(resultContainerId);

  if (!input || !resContainer) return null;

  // Expose the stock adjustment callback globally for onclick attributes
  if (typeof window !== 'undefined' && onAdjustStock) {
    window[adjustGlobalName] = async function(wineId, delta) {
      await onAdjustStock(wineId, delta);
      doLookup();
    };
  }

  function doLookup() {
    const queryStr = (input.value || '').trim().toLowerCase();
    if (!queryStr) {
      if (!isDepot) showToast("Enter or scan a SKU barcode", true);
      return;
    }

    const wines = typeof getWines === 'function' ? getWines() : [];
    const found = wines.find(w =>
      (w.sku && w.sku.toLowerCase() === queryStr) ||
      (w.id && w.id.toLowerCase() === queryStr) ||
      (w.name && w.name.toLowerCase().includes(queryStr))
    );

    if (!found) {
      resContainer.innerHTML = `
        <div class="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center text-rose-800 font-medium flex items-center justify-center gap-2">
          ${getIcon('errorCircle', { className: 'w-5 h-5 text-rose-600 flex-shrink-0' })}
          <span>SKU / Barcode "${escapeHtml(input.value)}" not found in ${isDepot ? 'warehouse' : 'catalog'}.</span>
        </div>
      `;
      resContainer.classList.remove('hidden');
      return;
    }

    const stockQty = (found.stockQuantity !== undefined && found.stockQuantity !== null && !isNaN(Number(found.stockQuantity)))
      ? Number(found.stockQuantity)
      : 0;

    const isLowStock = isDepot && stockQty < 10 && stockQty > 0;
    const borderClass = isLowStock ? 'border-amber-300 shadow-md' : 'border-slate-200';
    const stockColorClass = isLowStock ? 'text-amber-800 animate-pulse' : 'text-[#BA1628]';
    const imgSource = found.imageUrl || found.image || 'images/34172 DGB Oude kaap_Cab Merlot.png';

    resContainer.innerHTML = `
      <div class="bg-white border ${borderClass} rounded-2xl p-6 shadow-md flex flex-col md:flex-row gap-6 items-center">
        <div class="w-32 h-40 bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-center justify-center relative">
          <img src="${escapeHtml(imgSource)}" alt="${escapeHtml(found.name || '')}" class="h-full object-contain" />
        </div>

        <div class="flex-1 space-y-2">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-mono font-bold bg-rose-50 text-[#BA1628] border border-rose-200 px-2 py-0.5 rounded">${escapeHtml(found.sku || '')}</span>
            <span class="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">${escapeHtml(found.vintage || '2024')}</span>
            ${isLowStock ? `
              <span class="text-xs bg-amber-100 text-amber-800 border border-amber-300 font-bold px-2 py-0.5 rounded inline-flex items-center gap-1 animate-pulse">
                ${getIcon('alert', { className: 'w-3.5 h-3.5 text-amber-700 flex-shrink-0' })} Low Stock Warning
              </span>
            ` : ''}
          </div>
          <h3 class="text-xl font-bold text-slate-900">${escapeHtml(found.name || '')}</h3>
          <p class="text-xs text-slate-600">${escapeHtml(found.region || 'Belgique')} | Case Size: 1x${escapeHtml(found.caseSize || 6)}</p>

          <div class="pt-2 flex items-center gap-4 text-sm font-mono">
            <span class="text-slate-700 font-semibold">${isDepot ? 'Depot Case Stock:' : 'Current Warehouse Inventory:'}</span>
            <span class="text-2xl font-extrabold ${stockColorClass}">${stockQty} Cases ${isLowStock ? '(Low Stock)' : ''}</span>
          </div>

          <!-- Quick Adjuster -->
          <div class="pt-4 flex flex-wrap items-center gap-3">
            <span class="text-xs font-bold text-slate-700 uppercase">${isDepot ? 'Adjust Inventory:' : 'Quick Adjust:'}</span>
            <button onclick="window.${adjustGlobalName}('${found.id}', 5)" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-lg transition">+5 Cases</button>
            <button onclick="window.${adjustGlobalName}('${found.id}', 10)" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-lg transition">+10 Cases</button>
            <button onclick="window.${adjustGlobalName}('${found.id}', -1)" class="bg-slate-100 hover:bg-slate-200 text-rose-700 font-bold text-xs px-3 py-2 rounded-lg border border-slate-200 transition">-1 Case</button>
            ${!isDepot ? `<button onclick="window.${adjustGlobalName}('${found.id}', -5)" class="bg-slate-100 hover:bg-slate-200 text-rose-700 font-bold text-xs px-3 py-2 rounded-lg border border-slate-200 transition">-5 Cases</button>` : ''}
          </div>
        </div>
      </div>
    `;
    resContainer.classList.remove('hidden');
  }

  // Bind Enter key on input to auto-trigger scan lookup
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doLookup();
    }
  });

  return {
    lookup: doLookup,
    clear: () => {
      input.value = '';
      resContainer.innerHTML = '';
      resContainer.classList.add('hidden');
    }
  };
}
