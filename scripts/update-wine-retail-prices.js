/**
 * Populate retail prices on existing wines in Firestore
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'wine-catalog-belgium';
const CONFIG_PATH = path.join(
  process.env.USERPROFILE || process.env.HOME,
  '.config',
  'configstore',
  'firebase-tools.json'
);

async function getAccessToken() {
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const tokens = cfg.tokens || {};
  let token = tokens.access_token;

  const testRes = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/wines?pageSize=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (testRes.status === 401 && tokens.refresh_token) {
    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: tokens.client_id || '563584335869-fgrhgmd47bqnekij5i8b5pr03ho85qd6.apps.googleusercontent.com',
        client_secret: tokens.client_secret || 'j9iVZfY8kkCEFUPaAeJV0sAi',
        refresh_token: tokens.refresh_token,
        grant_type: 'refresh_token'
      })
    });
    const refreshed = await refreshRes.json();
    token = refreshed.access_token;
    tokens.access_token = token;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
  }
  return token;
}

async function main() {
  console.log("Starting wine retail price update...");
  const token = await getAccessToken();

  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/wines?pageSize=100`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const body = await res.json();
  const docs = body.documents || [];
  console.log(`Found ${docs.length} wines in Firestore.`);

  let updatedCount = 0;
  for (const doc of docs) {
    const fields = doc.fields || {};
    const bottleHT = fields.priceBottleHT?.doubleValue ?? fields.priceBottleHT?.integerValue ?? 5.50;
    const caseHT = fields.priceCaseHT?.doubleValue ?? fields.priceCaseHT?.integerValue ?? (bottleHT * 6);
    const caseSize = fields.caseSize?.integerValue ? parseInt(fields.caseSize.integerValue, 10) : 6;

    // Check if retail prices already exist
    const currentBottleRetail = fields.priceBottleRetail?.doubleValue ?? fields.priceBottleRetail?.integerValue;
    const currentCaseRetail = fields.priceCaseRetail?.doubleValue ?? fields.priceCaseRetail?.integerValue;

    if (currentBottleRetail && currentCaseRetail) {
      console.log(`- ${doc.name.split('/').pop()}: already has retail prices (€${currentBottleRetail} / €${currentCaseRetail})`);
      continue;
    }

    const bottleRetail = Number((bottleHT * 1.5).toFixed(2));
    const caseRetail = Number((bottleRetail * caseSize).toFixed(2));

    const patchUrl = `https://firestore.googleapis.com/v1/${doc.name}?updateMask.fieldPaths=priceBottleRetail&updateMask.fieldPaths=priceCaseRetail&updateMask.fieldPaths=priceBottleRetailFormatted&updateMask.fieldPaths=priceCaseRetailFormatted`;

    const patchBody = {
      fields: {
        priceBottleRetail: { doubleValue: bottleRetail },
        priceCaseRetail: { doubleValue: caseRetail },
        priceBottleRetailFormatted: { stringValue: `€${bottleRetail.toFixed(2)}` },
        priceCaseRetailFormatted: { stringValue: `€${caseRetail.toFixed(2)}` }
      }
    };

    const patchRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(patchBody)
    });

    if (patchRes.ok) {
      console.log(`✔ Updated ${doc.name.split('/').pop()}: Wholesale €${bottleHT}/€${caseHT} -> Retail €${bottleRetail}/€${caseRetail}`);
      updatedCount++;
    } else {
      console.error(`✖ Failed to update ${doc.name}:`, await patchRes.text());
    }
  }

  console.log(`\nMigration complete. Updated ${updatedCount} wines with retail prices.`);
}

main().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
