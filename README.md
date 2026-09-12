# Wine Distribution Belgium - B2B Wholesale Portal & Admin System

A lightweight, high-performance B2B wholesale wine catalog, real-time ordering system, automated PDF delivery note generator, and non-technical management dashboard built for **Wine Distribution Belgium**.

---

## 🏗️ Technical Stack & Architecture

- **Frontend:** Vanilla HTML5, JavaScript (ES6 Modules), Tailwind CSS (CDN).
- **Backend & Cloud Infrastructure:** Firebase (Modular Web SDK v10).
  - **Firebase Hosting:** Global CDN deployment with HSTS headers, canonical URL tags, and forced HTTP-to-HTTPS redirection.
  - **Cloud Firestore:** Real-time NoSQL database powering live catalog updates, stock toggles, and real-time order feeds.
  - **Cloud Storage:** Media bucket for high-res bottle images (`wines/`) and generated PDF invoices/delivery notes (`invoices/`).
  - **Firebase Cloud Functions (Node 20 / `europe-west9`):** Background event-driven function (`onDocumentCreated`) using `@sparticuz/chromium` & `puppeteer-core` to generate A4 Belgian "Note d'Envoi" PDFs.
- **SEO & Security:** SSL/HTTPS enforcement, HSTS max-age headers, canonical tags on all HTML pages, `sitemap.xml`, and `robots.txt`.
- **Integrations & AI Workflows:** Automated Jira issue tracking (`WINE` project) and mandatory git pre-commit rule enforcements.

---

## 📁 Repository Directory Structure

```text
wineapp/
├── .agents/
│   └── rules/
│       ├── jira-workflow.md            # Mandatory Jira task creation & commit rule
│       └── doc_update_and_preview.md   # Mandatory pre-commit doc sync & preview rule
├── .firebaserc                         # Firebase project alias (wine-catalog-belgium)
├── firebase.json                       # Hosting rules, HSTS headers & functions config
├── firestore.rules                     # Cloud Firestore security rules
├── storage.rules                       # Cloud Storage security rules
├── PROJECT_SPEC.md                     # Current project specification & architecture
├── README.md                           # Technical documentation & developer guide
├── functions/                          # Node 20 Cloud Functions
│   ├── index.js                        # PDF generation function (onDocumentCreated)
│   ├── templates/                      # Note d'Envoi HTML/CSS templates
│   └── config/                         # App & billing configurations
└── public/                             # Deployed web application directory
    ├── 404.html                        # Custom 404 error page
    ├── admin.html                      # Admin Portal (Catalog management, pricing, images)
    ├── depot.html                      # Real-time Depot Packing & Dispatch Queue
    ├── index.html                      # Evaluator Field Ordering interface
    ├── app-config.js                   # Application configuration & constants
    ├── auth-guard.js                   # Client role authorization guard
    ├── firebase-config.js              # Centralized Firebase SDK initialization
    ├── i18n.js                         # Multilingual translations (FR/NL/EN)
    ├── robots.txt                      # Search engine crawler directives
    ├── sitemap.xml                     # Canonical HTTPS sitemap
    ├── wines.json                      # Fallback initial dataset (10 volume wines)
    ├── images/                         # Static bottle asset fallback directory
    └── utils/                          # Belgian tax & VAT calculation helpers
```

---

## 🗄️ Database & Storage Specifications

### 1. Firestore Collections

#### `wines/{sku}`
```json
{
  "sku": "OK-CABMER-2023-750",
  "name": "Oude Kaap Cabernet Sauvignon Merlot",
  "region": "Franschhoek, Western Cape, South Africa",
  "vintage": "2023",
  "priceBottle": "€5.50",
  "priceCase": "€33.00 (Case of 6)",
  "stockAvailable": true,
  "image": "https://firebasestorage.googleapis.com/v0/b/wine-catalog-belgium.appspot.com/o/wines%2F...",
  "updatedAt": "2026-08-07T15:27:00.000Z"
}
```

#### `orders/{orderId}`
```json
{
  "orderId": "ORD-2026-0908-001",
  "clientName": "Food City Brussels",
  "items": [...],
  "subtotalHT": 198.00,
  "vat21": 41.58,
  "totalTTC": 239.58,
  "status": "ready_for_dispatch",
  "pdfUrl": "https://firebasestorage.googleapis.com/v0/b/wine-catalog-belgium.appspot.com/o/invoices%2F...",
  "createdAt": "2026-09-08T09:40:00.000Z"
}
```

---

## ⚡ Core Workflows & Features

1. **Evaluator Field Ordering Flow (`index.html`)**: Select client, filter live in-stock wines, dynamic subtotal HT, 21% VAT, TTC grand total calculation, and order submission.
2. **Admin Portal (`admin.html`)**: Add/edit wine SKUs, update HT bottle & case pricing, toggle stock availability, upload bottle images to Firebase Storage, and seed initial catalog.
3. **Depot Packing & Dispatch Queue (`depot.html`)**: Live `onSnapshot` feed of orders, dispatch state toggles, and direct print links for generated Note d'Envoi PDFs.
4. **Cloud Function PDF Generator (`functions/index.js`)**: Listens to `orders/{orderId}` creation, renders an A4 Belgian Note d'Envoi via Puppeteer, stores PDF in Cloud Storage, and links URL to Firestore document.
5. **SEO & SSL Protection**: Enforced HTTP to HTTPS redirect, Strict-Transport-Security (HSTS) headers, canonical tags, `sitemap.xml`, and `robots.txt`.
6. **Jira & Pre-Commit Rules**: Automated Sub-task creation in Jira project `WINE`, git commit referencing issue key, and pre-commit documentation preview.

---

## 🚀 Deployment & Local Testing

### Local Testing
Serve static files using any local web server:
```bash
npx serve public
```

### Production Deployment
```bash
# Deploy Firebase static hosting and security headers
npx firebase-tools deploy --only hosting

# Deploy Cloud Functions
npx firebase-tools deploy --only functions
```

Live Site: [https://wine-catalog-belgium.web.app](https://wine-catalog-belgium.web.app) / [https://aurellionwine.com](https://aurellionwine.com)
