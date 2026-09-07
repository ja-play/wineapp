const config = require('../config/app.config');

/**
 * Escapes HTML characters for backend template safety
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Builds A4-compliant Belgian "NOTE D'ENVOI / BON DE LIVRAISON" HTML template
 */
function buildNoteDenvoiHtml(orderId, order) {
  const client = order.client || { name: 'Client Inconnu', vat: 'BE 0000000000', clientNo: 'N/A', address: 'Belgique' };
  const items = order.items || [];
  const totals = order.totals || { totalHT: 0, totalVidanges: 0, totalTVA: 0, totalTTC: 0 };
  
  const createdDate = order.createdAt && order.createdAt.toDate 
    ? order.createdAt.toDate().toLocaleDateString('fr-BE') 
    : new Date().toLocaleDateString('fr-BE');

  const itemRowsHtml = items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 11px;">${escapeHtml(item.sku || '-')}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${escapeHtml(item.description || 'Vin Selection')}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${escapeHtml(item.colis || '1x6')}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 700;">${Number(item.qty || 1)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">€${Number(item.priceHT || 0).toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">€${Number(item.montantHT || (item.qty * item.priceHT) || 0).toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${Number(item.tvaRate || (config.VAT_RATE * 100))}%</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>NOTE D'ENVOI - ${escapeHtml(orderId)}</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; font-size: 13px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #d97706; padding-bottom: 20px; margin-bottom: 30px; }
    .brand { font-size: 24px; font-weight: 800; color: #92400e; letter-spacing: -0.5px; }
    .subbrand { font-size: 12px; color: #64748b; font-weight: 500; }
    .doc-title { text-align: right; }
    .doc-title h1 { margin: 0; font-size: 20px; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
    .doc-meta { font-size: 11px; color: #475569; margin-top: 4px; }
    .details-grid { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 30px; }
    .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; flex: 1; }
    .card-title { font-size: 11px; font-weight: 700; color: #d97706; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background-color: #0f172a; color: #ffffff; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; }
    .totals-wrapper { display: flex; justify-content: flex-end; }
    .totals-table { width: 320px; border-collapse: collapse; }
    .totals-table td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
    .grand-total { background-color: #fef3c7; font-weight: 800; color: #92400e; font-size: 15px; }
    .footer { margin-top: 50px; border-top: 1px solid #cbd5e1; padding-top: 15px; text-align: center; font-size: 10px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">🍷 ${escapeHtml(config.COMPANY.name)}</div>
      <div class="subbrand">${escapeHtml(config.COMPANY.subTitle)}</div>
      <div style="font-size: 11px; color: #475569; margin-top: 6px;">
        ${escapeHtml(config.COMPANY.address)} | N° TVA: ${escapeHtml(config.COMPANY.vatNumber)}
      </div>
    </div>
    <div class="doc-title">
      <h1>NOTE D'ENVOI</h1>
      <div class="doc-meta"><strong>N° Commande:</strong> ${escapeHtml(orderId)}</div>
      <div class="doc-meta"><strong>Date d'Émission:</strong> ${escapeHtml(createdDate)}</div>
      <div class="doc-meta"><strong>Statut:</strong> Ready for Dispatch</div>
    </div>
  </div>

  <div class="details-grid">
    <div class="card">
      <div class="card-title">Destinataire (Client)</div>
      <div style="font-weight: 700; font-size: 14px; color: #0f172a;">${escapeHtml(client.name)}</div>
      <div>${escapeHtml(client.address || '')}</div>
      <div style="margin-top: 6px; font-size: 12px;"><strong>N° TVA Client:</strong> ${escapeHtml(client.vat || 'BE 0000000000')}</div>
      <div style="font-size: 12px;"><strong>N° Client Aurellion:</strong> ${escapeHtml(client.clientNo || 'N/A')}</div>
    </div>
    <div class="card">
      <div class="card-title">Informations de Livraison</div>
      <div><strong>Transporteur:</strong> ${escapeHtml(config.COMPANY.carrier)}</div>
      <div><strong>Lieu de Déchargement:</strong> Réception Magasin</div>
      <div><strong>Conditions de Règlement:</strong> Compris dans le Compte Client</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 15%;">Code SKU</th>
        <th style="width: 35%;">Désignation Produit</th>
        <th style="width: 10%; text-align: center;">Colis</th>
        <th style="width: 10%; text-align: center;">Quantité</th>
        <th style="width: 10%; text-align: right;">Prix H.T.</th>
        <th style="width: 12%; text-align: right;">Montant H.T.</th>
        <th style="width: 8%; text-align: center;">TVA</th>
      </tr>
    </thead>
    <tbody>
      ${itemRowsHtml}
    </tbody>
  </table>

  <div class="totals-wrapper">
    <table class="totals-table">
      <tr>
        <td><strong>Total des Vidanges Consignées:</strong></td>
        <td style="text-align: right;">€${Number(totals.totalVidanges || 0).toFixed(2)}</td>
      </tr>
      <tr>
        <td><strong>TOTAL HORS TVA (H.TVA):</strong></td>
        <td style="text-align: right;">€${Number(totals.totalHT || 0).toFixed(2)}</td>
      </tr>
      <tr>
        <td><strong>Montant TVA (21%):</strong></td>
        <td style="text-align: right;">€${Number(totals.totalTVA || 0).toFixed(2)}</td>
      </tr>
      <tr class="grand-total">
        <td>TOTAL TTC / Solde à payer:</td>
        <td style="text-align: right;">€${Number(totals.totalTTC || 0).toFixed(2)}</td>
      </tr>
    </table>
  </div>

  <div class="footer">
    ${escapeHtml(config.COMPANY.fullName)} - Note d'Envoi Officielle conforme à la réglementation douanière et fiscale belge. <br>
    Les marchandises restent la propriété d'Aurellion SRL jusqu'au paiement intégral du solde.
  </div>
</body>
</html>
  `;
}

module.exports = { buildNoteDenvoiHtml };
