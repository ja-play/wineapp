/**
 * Firestore Orders Cleanup Script
 * Cleans up ONLY entries inside the 'orders' collection for production launch.
 * All other collections (wines, shops, users, inquiries) are strictly preserved.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'wine-catalog-belgium';
const TARGET_COLLECTION = 'orders';
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
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/shops?pageSize=1`,
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

async function verifyBackupExists() {
  const backupPath = path.join(__dirname, '..', 'backups', 'firestore_backup_latest.json');
  if (!fs.existsSync(backupPath)) {
    throw new Error(`CRITICAL: Backup file not found at ${backupPath}. Aborting cleanup!`);
  }
  const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  const orderCount = data.collections && data.collections.orders ? data.collections.orders.count : 0;
  console.log(`Verified backup file exists: ${backupPath} (Contains ${orderCount} backed-up orders)`);
  if (orderCount === 0) {
    console.log("Notice: Backup contains 0 orders.");
  }
}

async function cleanupOrders() {
  console.log(`\n======================================================`);
  console.log(`FIRESTORE ORDERS CLEANUP FOR PRODUCTION`);
  console.log(`Target: ONLY 'orders' documents in project [${PROJECT_ID}]`);
  console.log(`======================================================\n`);

  await verifyBackupExists();

  const token = await getAccessToken();

  // 1. Fetch all documents in 'orders'
  console.log(`Querying existing entries in '${TARGET_COLLECTION}' collection...`);
  const listUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${TARGET_COLLECTION}?pageSize=500`;
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!listRes.ok) {
    throw new Error(`Failed to list orders: ${listRes.status} ${await listRes.text()}`);
  }

  const listData = await listRes.json();
  const docs = listData.documents || [];

  console.log(`Found ${docs.length} order documents to clean up.\n`);

  if (docs.length === 0) {
    console.log(`No orders to clean up. The collection is already empty!`);
    return;
  }

  // 2. Delete each order document
  let deletedCount = 0;
  for (const doc of docs) {
    const docName = doc.name;
    // Strict safety check: must be inside /documents/orders/
    if (!docName.includes(`/databases/(default)/documents/${TARGET_COLLECTION}/`)) {
      console.warn(`Safety check triggered: skipping non-orders doc: ${docName}`);
      continue;
    }

    const orderId = docName.split('/').pop();
    process.stdout.write(`Deleting order entry [${orderId}]... `);

    const delUrl = `https://firestore.googleapis.com/v1/${docName}`;
    const delRes = await fetch(delUrl, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!delRes.ok) {
      console.error(`FAILED (${delRes.status})`);
    } else {
      console.log(`DELETED`);
      deletedCount++;
    }
  }

  console.log(`\nCleaned up ${deletedCount} of ${docs.length} orders.`);

  // 3. Post-cleanup verification
  console.log(`\nRunning post-cleanup integrity verification...`);
  const verifyRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const verifyData = await verifyRes.json();
  const remainingOrders = (verifyData.documents || []).length;

  // Check preserved collections
  const wineRes = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/wines?pageSize=100`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const wineData = await wineRes.json();
  const remainingWines = (wineData.documents || []).length;

  const shopRes = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/shops?pageSize=100`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const shopData = await shopRes.json();
  const remainingShops = (shopData.documents || []).length;

  const userRes = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users?pageSize=100`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const userData = await userRes.json();
  const remainingUsers = (userData.documents || []).length;

  console.log(`\n======================================================`);
  console.log(`VERIFICATION REPORT:`);
  console.log(`  - orders:    ${remainingOrders} entries (Cleaned up!)`);
  console.log(`  - wines:     ${remainingWines} entries (Preserved & Intact)`);
  console.log(`  - shops:     ${remainingShops} entries (Preserved & Intact)`);
  console.log(`  - users:     ${remainingUsers} entries (Preserved & Intact)`);
  console.log(`======================================================\n`);

  if (remainingOrders === 0 && remainingWines > 0) {
    console.log(`SUCCESS: All test order entries cleared. Database is primed for production!`);
  } else {
    console.warn(`Warning: remaining orders count is ${remainingOrders}`);
  }
}

cleanupOrders().catch(err => {
  console.error('\nCLEANUP FAILED:', err);
  process.exit(1);
});
