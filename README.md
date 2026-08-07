# Wine Distribution Belgium - B2B Wholesale Portal & Admin System

A lightweight, high-performance B2B wholesale wine catalog and non-technical management dashboard built for **Wine Distribution Belgium**. Serves volume wine catalog data directly to shop evaluators and provides an intuitive, code-free Admin Portal for managers to update pricing and upload bottle images.

---

## 🏗️ Technical Stack & Architecture

- **Frontend:** Vanilla HTML5, JavaScript (ES6 Modules), Tailwind CSS (CDN).
- **Backend Services:** Firebase (Modular Web SDK v10).
  - **Firebase Hosting:** Global CDN deployment for static web assets.
  - **Cloud Firestore:** Real-time NoSQL database powering live catalog & price updates.
  - **Cloud Storage:** Media bucket for high-res bottle images (`wines/`).
  - **Firebase Auth:** Configured for role-based access (Evaluator vs. Manager/Depot).
- **GCP Region:** `europe-west9` (Belgium/Frankfurt).

---

## 📁 Repository Directory Structure

```text
wineapp/
├── .firebaserc              # Firebase project alias configuration (wine-catalog-belgium)
├── firebase.json            # Hosting & site routing rules
├── PROJECT_SPEC.md          # Original project requirements & roadmap
├── README.md                # Comprehensive technical documentation (this file)
└── public/                  # Public web directory (Deployed to Firebase Hosting)
    ├── 404.html             # Custom 404 error page
    ├── admin.html           # Non-technical Admin Portal (CRUD wines, image upload, seeding)
    ├── firebase-config.js   # Centralized Firebase SDK initialization & module exports
    ├── index.html           # Customer/Evaluator public catalog (Real-time Firestore listener)
    ├── wines.json           # Initial fallback wine dataset (10 volume wines)
    └── images/              # Static bottle asset fallback directory
```

---

## 🗄️ Database & Storage Specifications

### 1. Firestore Collection: `wines`

Each document ID is normalized from the wine SKU (e.g. `OK-CABMER-2023-750`).

```json
{
  "sku": "OK-CABMER-2023-750",
  "name": "Oude Kaap Cabernet Sauvignon Merlot",
  "region": "Franschhoek, Western Cape, South Africa",
  "vintage": "2023",
  "priceBottle": "€5.50",
  "priceCase": "€33.00 (Case of 6)",
  "image": "https://firebasestorage.googleapis.com/v0/b/wine-catalog-belgium.appspot.com/o/wines%2F...",
  "description": "A smooth, approachable South African red blend featuring intense aromas of ripe cassis...",
  "updatedAt": "2026-08-07T15:27:00.000Z"
}
```

### 2. Firebase Cloud Storage: `wines/`

- **Upload Directory:** `wines/{timestamp}_{sanitized_filename}`
- **Access Pattern:** Uploaded via `admin.html` -> public download URL generated via `getDownloadURL()` -> stored in Firestore `image` property.

---

## ⚡ Core Developer Workflows

### 1. Seeding Firestore from Local JSON
If Firestore is empty or initializing a fresh environment:
1. Open `public/admin.html`.
2. Click **"Seed from JSON"** in the top header bar.
3. The application will iterate through `public/wines.json` and push all records into Firestore using `setDoc` with `{ merge: true }`.

### 2. Real-Time Synchronization
- `index.html` uses Firestore `onSnapshot(collection(db, "wines"))`.
- Any edit made in `admin.html` triggers instant UI re-renders for all connected clients without requiring a page refresh.
- If Firestore is offline or empty, `index.html` automatically falls back to fetching `./wines.json`.

---

## 🛡️ Recommended Firebase Production Security Rules

### Firestore Security Rules (`firestore.rules`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Anyone can read wine catalog
    match /wines/{wineId} {
      allow read: if true;
      allow write: if request.auth != null; // Restrict writes to authenticated managers
    }
  }
}
```

### Storage Security Rules (`storage.rules`)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /wines/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null; // Only authenticated users can upload bottle images
    }
  }
}
```

---

## 🚀 Deployment & Local Testing

### Local Development
Open `public/index.html` or `public/admin.html` directly in a browser or serve using any static web server (e.g. `npx serve public` or VS Code Live Server).

### Deploying to Firebase Hosting
Make sure you are logged in to Firebase CLI:
```bash
# Login to Firebase CLI
firebase login

# Deploy updated static files & hosting configuration
firebase deploy --only hosting
```

Live Production Site: [wine-catalog-belgium.web.app](https://wine-catalog-belgium.web.app)
