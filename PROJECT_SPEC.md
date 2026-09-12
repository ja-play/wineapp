# Wine Distribution Belgium - Project Spec

## Stack & Hosting Architecture
- **Frontend**: HTML5 / Tailwind CSS / Modular Vanilla JS (v10 Web SDK CDN).
- **Backend Services & DB**: Cloud Firestore (Real-time NoSQL), Firebase Auth, Cloud Storage.
- **Hosting & Infrastructure**: Firebase Hosting on `wine-catalog-belgium.web.app` & `aurellionwine.com` with mandatory SSL/HTTPS redirection, Strict-Transport-Security (HSTS), canonical tags, `sitemap.xml`, and `robots.txt`.
- **Serverless PDF Engine**: Firebase Cloud Functions Node 20 (`europe-west9`) + Puppeteer (`@sparticuz/chromium`).
- **Development & Project Management**: Workspace rule-based Jira integration (`WINE` project) and pre-commit documentation sync.

## Core Modules & Roles
1. **Admin Product Portal (`/admin.html`)**: Role `admin`. Catalog SKU creation/edits, bottle & case HT pricing, availability toggling (`stockAvailable`), image uploads to Firebase Storage (`wines/{filename}`).
2. **Evaluator Field Ordering Flow (`/index.html`)**: Role `evaluator`. Belgian client shop selection (Food City, Wine Boutique, Le Caveau), dynamic catalog query (`stockAvailable == true`), inline case quantity selectors, cart drawer with subtotal HT, 21% VAT, and total TTC calculation, order submission to Firestore (`orders/{orderId}`).
3. **Automated Note d'Envoi PDF Engine (`functions/index.js`)**: Background event `onDocumentCreated("orders/{orderId}")`. Compiles A4-compliant Belgian "NOTE D'ENVOI" PDF matching wholesale standards, uploads binary to Firebase Storage (`invoices/{orderId}.pdf`), updates order status to `ready_for_dispatch`.
4. **Depot Packing & Dispatch Queue (`/depot.html`)**: Role `depot` or `admin`. Real-time `onSnapshot` feed of incoming orders, line item table, and direct "Print Note d'Envoi PDF" action.

## Workspace Rules & Integrations
- **Jira Workflow (`.agents/rules/jira-workflow.md`)**: Automatically creates Jira Sub-tasks under parent Stories (`WINE-7`, `WINE-6`, `WINE-5`, `WINE-4`, `WINE-3`), includes Jira key in commit message, pushes to `main`, and closes task as Done.
- **Doc Sync & Preview Rule (`.agents/rules/doc_update_and_preview.md`)**: Mandates updating `README.md` and `PROJECT_SPEC.md` and showing changes to the user before running git commit & push.
