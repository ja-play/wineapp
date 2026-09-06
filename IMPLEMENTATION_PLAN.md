# Multi-Role Auth, Dynamic Catalog, Evaluator Field Ordering & Headless PDF Invoicing

Implement role-based access control (Admin, Evaluator, Depot), dynamic Firestore catalog management, field evaluator ordering flow with Belgian VAT & Vidange calculation, headless PDF invoice generation via Firebase Cloud Functions + Puppeteer (`@sparticuz/chromium`), and a real-time Depot dispatch view.

---

## Architecture & Role Access Control Matrix

| Role | Allowed Actions | Target Portal |
|---|---|---|
| **Admin** (`admin`) | Full catalog read/write, image upload, price edits, order view & dispatch | `/admin.html` |
| **Evaluator** (`evaluator`) | View available catalog (`stockAvailable == true`), select shop client, place orders | `/index.html` |
| **Depot** (`depot`) | Real-time order stream, view incoming orders, print/download delivery note PDF | `/depot.html` |

---

## Cloud Function & Engine Configuration

- **Runtime**: Node 20
- **Region**: `europe-west9`
- **Memory**: `1GiB`
- **Timeout**: `120s`
- **Engine**: `@sparticuz/chromium` + `puppeteer-core`
- **Trigger**: `onDocumentCreated("orders/{orderId}")`

---

## Demo Credentials & Seed Accounts

- `admin@winedistribution.be` (Role: `admin`)
- `evaluator@winedistribution.be` (Role: `evaluator`)
- `depot@winedistribution.be` (Role: `depot`)

---

## Proposed Changes

### Database & Security Configuration

#### [firestore.rules](file:///d:/Learnings/AI/wineapp/firestore.rules)
- Role isolation using `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role`.
- `users`: Read by authenticated self; write by self/admin.
- `wines`: Read by authenticated users; write by `admin`.
- `orders`: Read by `evaluator` (own orders), `depot`, or `admin`; create by `evaluator` or `admin`.

#### [storage.rules](file:///d:/Learnings/AI/wineapp/storage.rules)
- Restrict `wine-images/{sku}.jpg` uploads to `admin`.
- Allow read access to `invoices/{orderId}.pdf` for `evaluator`, `depot`, and `admin`.

#### [firebase.json](file:///d:/Learnings/AI/wineapp/firebase.json)
- Register `functions` configuration block linking to `./functions`.

---

### Backend & PDF Generation Engine

#### [functions/package.json](file:///d:/Learnings/AI/wineapp/functions/package.json)
- Dependencies: `firebase-admin`, `firebase-functions@^5.0.0`, `@sparticuz/chromium@^123.0.0`, `puppeteer-core@^22.0.0`.

#### [functions/index.js](file:///d:/Learnings/AI/wineapp/functions/index.js)
- Implement `generateNoteDenvoi` v2 Cloud Function on `onDocumentCreated("orders/{orderId}")` in `europe-west9`.
- Render A4-compliant Belgian "NOTE D'ENVOI" HTML with Aurellion Wine branding, client VAT (BE 0707843840), delivery breakdown, HT subtotal, 21% VAT, total Vidanges, and TTC grand total.
- Launch `@sparticuz/chromium` headless browser, generate A4 PDF binary, upload to Firebase Storage bucket at `invoices/{orderId}.pdf`, obtain signed/public URL, and update Firestore order document with `invoicePdfUrl` and status `ready_for_dispatch`.

---

### Client Application & Shared Modules

#### [public/firebase-config.js](file:///d:/Learnings/AI/wineapp/public/firebase-config.js)
- Export Auth helpers, Firestore helpers (`doc`, `getDoc`, `setDoc`, `updateDoc`, `query`, `where`, `orderBy`), and current user role state utilities.

#### [public/auth-guard.js](file:///d:/Learnings/AI/wineapp/public/auth-guard.js)
- Centralized role-based page guard script.
- Fetches user role from `users/{uid}` upon `onAuthStateChanged`.
- Redirects unauthorized users to their respective portal or login view.

#### [public/admin.html](file:///d:/Learnings/AI/wineapp/public/admin.html)
- Enforce `admin` role guard.
- Expand product form: Name, Vintage, SKU, Case Config (1x6, 1x12), Bottle Price HT, Case Price HT, Deposit per Case (Vidange), VAT Rate (21%).
- Write SKU records to Firestore `wines/{sku}` and upload image to `wine-images/{sku}.jpg`.
- Add live `stockAvailable` toggle and inline price editing.
- Add quick seed button for initial `wines.json` migration + user role bootstrapping.

#### [public/index.html](file:///d:/Learnings/AI/wineapp/public/index.html)
- Enforce `evaluator` access guard (with fallback login modal).
- Header Persistent Client Selector with 3 Belgian test shops:
  1. `Food City Bruxelles` (Place Saint-Pierre 12, 1040 Bruxelles - VAT: BE 0707843840, Client #: 2340)
  2. `Wine Boutique Gent` (Veldstraat 45, 9000 Gent - VAT: BE 0812345678, Client #: 3120)
  3. `Le Caveau Liège` (Rue Souverain-Pont 8, 4000 Liège - VAT: BE 0987654321, Client #: 4050)
- Prevent adding to cart until a client shop is selected.
- Query Firestore `wines` where `stockAvailable == true`.
- Display case configuration, bottle price HT, and deposit tag (`+€1.35 Vidange consignée`).
- Add inline `[-] [qty] [+]` controls updating local cart state.
- Order Review Drawer: Total cases, Subtotal excl. VAT (Total H.TVA), Belgian VAT (21%), Deposits (Vidanges), Grand Total (TTC).
- Submit order to `orders/{orderId}` doc with schema specified.

#### [public/depot.html](file:///d:/Learnings/AI/wineapp/public/depot.html)
- Enforce `depot` or `admin` role access guard.
- Real-time `onSnapshot` stream on `orders` ordered by `createdAt desc`.
- Displays client info, order status badge (`submitted` vs `ready_for_dispatch`), item table, total TTC, and a "Print Note d'Envoi" button linking directly to `invoicePdfUrl`.

---

## Verification Plan

### Automated / Code Validation
- Test Firestore & Storage rules compilation.
- Lint and verify Node 20 Cloud Functions syntax and package dependencies.

### Manual Verification
1. **User Role Switcher & Auth Flow**:
   - Log in as `admin@winedistribution.be` -> verify access to `/admin.html`.
   - Log in as `evaluator@winedistribution.be` -> verify access to `/index.html`.
   - Log in as `depot@winedistribution.be` -> verify access to `/depot.html`.
2. **Admin Product Management**:
   - Seed default wines from `public/wines.json`.
   - Add new wine item with Vidange deposit & case configuration.
   - Toggle `stockAvailable` off and verify it disappears from evaluator mobile view.
3. **Evaluator Field Ordering Flow**:
   - Select client shop "Food City Bruxelles".
   - Select wine case quantities using `[-] [qty] [+]`.
   - Verify calculation of Subtotal HT, 21% VAT, Vidanges, and Total TTC in cart drawer.
   - Click "Submit Order" and verify document creation in Firestore `orders`.
4. **Headless PDF Invoicing & Depot Dispatch**:
   - Observe Cloud Function execution logs on order creation.
   - Check `depot.html` real-time feed update and status change to `ready_for_dispatch`.
   - Click "Print Note d'Envoi" to preview the generated Belgian A4 PDF delivery note.
