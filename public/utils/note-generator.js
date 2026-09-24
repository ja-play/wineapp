/**
 * Reusable Belgian Delivery Note (Note d'Envoi) Generator
 * Single source of truth for delivery note rendering and printing across Aurellion Wine app.
 */

import { COMPANY_CONFIG } from '../app-config.js';
import { escapeHtml } from './sanitizer.js';
import { formatEuro, formatDate } from './ui-components.js';

/**
 * Generates the clean HTML string for a Belgian Note d'Envoi document.
 * Suitable for both inline modal previews and new print windows.
 * @param {Object} order - Order object containing client, items, totals, status
 * @param {Object} [options] - Optional custom configuration
 * @param {boolean} [options.isPrintWindow=false] - Whether wrapping with full printable HTML doc
 * @returns {string} HTML markup
 */
export function generateNoteDenvoiHtml(order, options = {}) {
  const company = options.company || COMPANY_CONFIG || {
    fullName: 'Aurellion Group SRL',
    address: 'Avenue Louise 250, 1050 Bruxelles',
    country: 'Belgique',
    vatNumber: 'BE 0412 876 543'
  };

  const client = order.client || {
    name: 'Food City Bruxelles',
    vat: 'BE 0707843840',
    clientNo: '2340',
    address: 'Place Saint-Pierre 12, 1040 Bruxelles'
  };

  const totals = order.totals || {};
  const discountPercent = Number(order.discountPercent || totals.discountPercent || 0);
  const totalHT = Number(totals.totalHT || 0);
  const totalTVA = Number(totals.totalTVA || 0);
  const totalTTC = Number(totals.totalTTC || 0);

  let rawSubtotalHT = Number(totals.rawSubtotalHT || 0);
  let discountAmount = Number(totals.discountAmount || 0);

  if (discountPercent > 0 && (!rawSubtotalHT || !discountAmount)) {
    rawSubtotalHT = Number((totalHT / ((100 - discountPercent) / 100)).toFixed(2));
    discountAmount = Number((rawSubtotalHT - totalHT).toFixed(2));
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const dateStr = formatDate(order.createdAt, 'fr-BE', false);
  const docRef = order.id ? `NE-${order.id.substring(0, 8).toUpperCase()}` : 'NE-PENDING';

  const bodyContent = `
    <div class="note-denvoi-container max-w-4xl mx-auto p-4 font-sans text-slate-800">
      <div class="flex justify-between items-start border-b-2 border-slate-300 pb-4 mb-4">
        <div>
          <h1 class="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <svg class="w-6 h-6 text-[#BA1628]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 22h8M12 15v7M5 3h14v4a7 7 0 0 1-14 0V3z"/>
            </svg>
            <span>${escapeHtml(company.fullName || 'Aurellion Group SRL')}</span>
          </h1>
          <p class="text-xs text-slate-600 mt-1">${escapeHtml(company.address || '')}, ${escapeHtml(company.country || 'Belgique')}</p>
          <p class="text-xs text-slate-600">N° TVA: ${escapeHtml(company.vatNumber || '')}</p>
        </div>
        <div class="text-right">
          <h2 class="text-lg font-extrabold text-[#BA1628] uppercase tracking-wide">NOTE D'ENVOI</h2>
          <div class="text-xs font-mono font-bold text-slate-800">N° Document: ${escapeHtml(docRef)}</div>
          <div class="text-xs text-slate-600">Date: ${escapeHtml(dateStr)}</div>
          <div class="text-xs text-slate-600 font-medium">Statut: ${escapeHtml(order.status || 'Validé')}</div>
          ${discountPercent > 0 ? `<div class="mt-1 inline-block bg-rose-100 text-[#BA1628] border border-rose-300 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full">Remise Accordée: ${discountPercent}% (-${formatEuro(discountAmount)})</div>` : ''}
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-5 text-xs">
        <div>
          <span class="font-bold uppercase text-slate-500 text-[10px] block mb-1">Destinataire / Client</span>
          <div class="font-bold text-sm text-slate-900">${escapeHtml(client.name || '')}</div>
          <div class="text-slate-700">${escapeHtml(client.address || '')}</div>
          <div class="font-mono text-slate-600 mt-1">N° TVA: ${escapeHtml(client.vat || '-')} | N° Client: ${escapeHtml(client.clientNo || '-')}</div>
          ${client.contactPerson || client.phone ? `<div class="text-slate-700 font-medium mt-0.5">Contact: ${escapeHtml(client.contactPerson || '')}${client.phone ? ' (' + escapeHtml(client.phone) + ')' : ''}</div>` : ''}
        </div>
        <div>
          <span class="font-bold uppercase text-slate-500 text-[10px] block mb-1">Dépôt d'Expédition</span>
          <div class="font-bold text-sm text-slate-900">Dépôt Central Logistique Belux</div>
          <div class="text-slate-700">Port de Bruxelles, Quai des Usines 112</div>
          <div class="font-mono text-slate-600 mt-1">Mode: Camion Frigorifique | Commande: #${escapeHtml((order.id || '').substring(0, 12))}</div>
        </div>
      </div>

      <table class="w-full text-left text-xs mb-5 border-collapse">
        <thead>
          <tr class="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-300">
            <th class="py-2 px-3">Code SKU</th>
            <th class="py-2 px-3">Description du Produit</th>
            <th class="py-2 px-3 text-center">Colisage</th>
            <th class="py-2 px-3 text-center">Quantité (Colis)</th>
            <th class="py-2 px-3 text-right">Prix H.TVA</th>
            <th class="py-2 px-3 text-right">Total H.TVA</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 font-mono text-slate-800">
          ${items.map(item => {
            const desc = item.description || item.name || 'Vin de Réserve';
            const sku = item.sku || '-';
            const colis = item.colis || (item.caseSize ? `1x${item.caseSize}` : '1x6');
            const qty = Number(item.qty || 0);
            const price = Number(item.priceHT || item.priceCaseHT || 0);
            const totalRow = Number(item.montantHT || (price * qty));
            return `
              <tr>
                <td class="py-2 px-3 font-semibold text-slate-600">${escapeHtml(sku)}</td>
                <td class="py-2 px-3 font-sans font-bold text-slate-900">${escapeHtml(desc)}</td>
                <td class="py-2 px-3 text-center">${escapeHtml(colis)}</td>
                <td class="py-2 px-3 text-center font-extrabold text-slate-900">${qty}</td>
                <td class="py-2 px-3 text-right">${formatEuro(price)}</td>
                <td class="py-2 px-3 text-right font-bold">${formatEuro(totalRow)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="flex justify-between items-start pt-3 border-t border-slate-300 mb-5">
        <div class="text-[11px] text-slate-500 max-w-sm">
          <p class="font-bold text-slate-700 mb-1">Conditions de Transport & Réception:</p>
          <p>Conforme aux normes AFSCA de transport frigorifique et d'expédition en gros d'Aurellion Belux.</p>
        </div>
        <div class="w-72 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-xs">
          ${discountAmount > 0 ? `
            <div class="flex justify-between text-slate-600">
              <span>Sous-total Brut H.TVA:</span>
              <span class="font-mono font-bold">${formatEuro(rawSubtotalHT)}</span>
            </div>
            <div class="flex justify-between text-[#BA1628] font-medium">
              <span>Remise Client (${discountPercent}%):</span>
              <span class="font-mono font-bold">- ${formatEuro(discountAmount)}</span>
            </div>
            <div class="flex justify-between text-slate-900 font-bold border-t border-dashed border-slate-300 pt-1">
              <span>Sous-total Net H.TVA:</span>
              <span class="font-mono">${formatEuro(totalHT)}</span>
            </div>
          ` : `
            <div class="flex justify-between text-slate-700">
              <span>Sous-total H.TVA:</span>
              <span class="font-mono font-bold">${formatEuro(totalHT)}</span>
            </div>
          `}
          <div class="flex justify-between text-slate-700">
            <span>T.V.A. Belge (21%):</span>
            <span class="font-mono font-bold">${formatEuro(totalTVA)}</span>
          </div>
          <div class="flex justify-between pt-2 border-t-2 border-slate-300 text-sm font-black text-slate-900">
            <span>TOTAL T.T.C.:</span>
            <span class="font-mono text-[#BA1628]">${formatEuro(totalTTC)}</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-8 pt-5 border-t border-slate-300 text-xs text-slate-600">
        <div>
          <p class="font-bold text-slate-800 mb-8">Pour le Dépôt d'Expédition (Chauffeur):</p>
          <p class="border-t border-slate-400 pt-1 font-mono">Date et Signature: _______________________</p>
        </div>
        <div>
          <p class="font-bold text-slate-800 mb-8">Pour Réception Client (Magasin):</p>
          <p class="border-t border-slate-400 pt-1 font-mono">Date et Signature: _______________________</p>
        </div>
      </div>
    </div>
  `;

  if (!options.isPrintWindow) {
    return bodyContent;
  }

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Note d'Envoi - ${escapeHtml(docRef)}</title>
      <link rel="stylesheet" href="output.css">
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; background: #fff; color: #1e293b; }
        @media print {
          body { padding: 0; background: #fff; }
          @page { size: A4 portrait; margin: 12mm; }
        }
      </style>
    </head>
    <body onload="window.print()">
      ${bodyContent}
    </body>
    </html>
  `;
}

/**
 * Opens a print window and automatically prints the Belgian Note d'Envoi.
 * @param {Object} order
 */
export function openPrintableNote(order) {
  if (!order) return;
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Please allow popups to print the delivery note.");
    return;
  }
  const html = generateNoteDenvoiHtml(order, { isPrintWindow: true });
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Populates a DOM element with the rendered Note d'Envoi HTML.
 * @param {HTMLElement|string} target - Element or Element ID
 * @param {Object} order
 */
export function populateNoteModal(target, order) {
  const el = typeof target === 'string' ? document.getElementById(target) : target;
  if (!el || !order) return;
  el.innerHTML = generateNoteDenvoiHtml(order, { isPrintWindow: false });
}

// Global window attachment for onclick access
if (typeof window !== 'undefined') {
  window.generateNoteDenvoiHtml = generateNoteDenvoiHtml;
  window.openPrintableNote = openPrintableNote;
  window.populateNoteModal = populateNoteModal;
}
