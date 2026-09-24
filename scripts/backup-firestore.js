/**
 * Firestore Full Backup Script
 * Exports all collections (orders, wines, shops, users, inquiries) to a local timestamped JSON file.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'wine-catalog-belgium';
const COLLECTIONS = ['orders', 'wines', 'shops', 'users', 'inquiries'];
const CONFIG_PATH = path.join(
  process.env.USERPROFILE || process.env.HOME,
  '.config',
  'configstore',
  'firebase-tools.json'
);

function convertFirestoreValue(val) {
  if (val === undefined || val === null) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    const list = val.arrayValue.values || [];
    return list.map(convertFirestoreValue);
  }
  if ('mapValue' in val) {
    const fields = val.mapValue.fields || {};
    const res = {};
    for (const [k, v] of Object.entries(fields)) {
      res[k] = convertFirestoreValue(v);
    }
    return res;
  }
  return val;
}

function parseDocument(doc) {
  const docId = doc.name.split('/').pop();
  const data = {};
  if (doc.fields) {
    for (const [k, v] of Object.entries(doc.fields)) {
      data[k] = convertFirestoreValue(v);
    }
  }
  return {
    _id: docId,
    _createTime: doc.createTime,
    _updateTime: doc.updateTime,
    _rawName: doc.name,
    ...data
  };
}

async function getAccessToken() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Firebase tools config not found at: ${CONFIG_PATH}`);
  }
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const tokens = cfg.tokens || {};
  let token = tokens.access_token;

  // Verify token validity or refresh if needed
  const testRes = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/shops?pageSize=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (testRes.status === 401 && tokens.refresh_token) {
    console.log('Access token expired, refreshing with Google OAuth...');
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
    if (refreshed.access_token) {
      token = refreshed.access_token;
      tokens.access_token = token;
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
      console.log('Token refreshed successfully.');
    } else {
      throw new Error(`Token refresh failed: ${JSON.stringify(refreshed)}`);
    }
  }

  return token;
}

async function fetchCollection(token, collectionName) {
  let documents = [];
  let pageToken = '';

  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionName}`
    );
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to fetch ${collectionName}: ${res.status} ${errText}`);
    }

    const data = await res.json();
    if (data.documents && data.documents.length > 0) {
      documents = documents.concat(data.documents);
    }
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return documents;
}

async function runBackup() {
  console.log(`Starting Firestore Backup for project [${PROJECT_ID}]...`);
  const token = await getAccessToken();

  const backupRoot = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupRoot)) {
    fs.mkdirSync(backupRoot, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `firestore_backup_${timestamp}.json`;
  const backupFilePath = path.join(backupRoot, backupFileName);

  const backupData = {
    metadata: {
      projectId: PROJECT_ID,
      exportTimestamp: new Date().toISOString(),
      collections: {}
    },
    collections: {}
  };

  for (const col of COLLECTIONS) {
    process.stdout.write(`Exporting collection '${col}'... `);
    const rawDocs = await fetchCollection(token, col);
    const parsedDocs = rawDocs.map(parseDocument);

    backupData.collections[col] = {
      count: parsedDocs.length,
      documents: parsedDocs,
      rawDocuments: rawDocs
    };
    backupData.metadata.collections[col] = parsedDocs.length;
    console.log(`OK (${parsedDocs.length} documents)`);
  }

  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');

  // Also write latest pointer
  const latestPath = path.join(backupRoot, 'firestore_backup_latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(backupData, null, 2), 'utf8');

  const stats = fs.statSync(backupFilePath);
  console.log(`\n========================================`);
  console.log(`BACKUP COMPLETE SUCCESSFUL!`);
  console.log(`File: ${backupFilePath}`);
  console.log(`Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`Collections Summary:`);
  for (const [col, count] of Object.entries(backupData.metadata.collections)) {
    console.log(`  - ${col}: ${count} docs`);
  }
  console.log(`========================================\n`);

  return backupFilePath;
}

runBackup().catch(err => {
  console.error('\nBACKUP FAILED:', err);
  process.exit(1);
});
