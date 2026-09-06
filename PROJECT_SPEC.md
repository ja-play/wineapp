# Wine Distribution Belgium - Project Spec

## Stack
- Frontend: HTML5 / Tailwind CSS / Modular Vanilla JS (v10 CDN)
- Backend & Hosting: Firebase (Hosting, Firestore, Auth, Cloud Storage)
- Serverless PDF Engine: Firebase Cloud Functions Node 20 (`europe-west9`) + Puppeteer (`@sparticuz/chromium`)

## Modules & Roles
1. **Admin Product Portal (`/admin.html`)**: Role `admin`. Catalog SKU creation/edits, bottle & case HT pricing, deposit vidanges (€1.35), availability toggling (`stockAvailable`), image uploads to Firebase Storage (`wine-images/{sku}.jpg`).
2. **Evaluator Field Ordering Flow (`/index.html`)**: Role `evaluator`. Belgian client shop selection (Food City, Wine Boutique, Le Caveau), dynamic catalog query (`stockAvailable == true`), inline case quantity selectors, cart drawer with subtotal HT, 21% VAT, Vidanges, and total TTC calculation, order submission to Firestore (`orders/{orderId}`).
3. **Automated Note d'Envoi PDF Engine (`functions/index.js`)**: Background event `onDocumentCreated("orders/{orderId}")`. Compiles A4-compliant Belgian "NOTE D'ENVOI" PDF matching wholesale standards, uploads binary to Firebase Storage (`invoices/{orderId}.pdf`), updates order status to `ready_for_dispatch`.
4. **Depot Packing & Dispatch Queue (`/depot.html`)**: Role `depot` or `admin`. Real-time `onSnapshot` feed of incoming orders, line item table, and direct "Print Note d'Envoi PDF" action.

