# Wine Distribution Belgium - Project Spec

## Stack
- Frontend: HTML / Tailwind CSS / Vanilla JS
- Backend & Hosting: Firebase (Hosting, Firestore, Auth)
- Location: GCP europe-west9 (Belgium)

## Data Models
- Wines: SKU, name, region, vintage, priceBottle, priceCase, image, description
- Orders: shopId, shopName, items, totalAmount, status, createdAt

## Current State
- Static MVP live at: wine-catalog-belgium.web.app
- 10 fast-moving volume wines in public/wines.json

## Roadmap / Next Tasks
1. Add Firebase Auth (Evaluator vs. Depot roles)
2. Connect Firestore for live order placement from Evaluator UI
3. Build real-time Depot Dashboard (/public/depot.html) with auto-print
