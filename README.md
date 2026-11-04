# PartnerPulse

Supplier relationship and performance analytics. React + Tailwind front end, Node/Express API, MongoDB storage, Tableau for dashboards.

## What it does

| Area | What you get |
| --- | --- |
| Suppliers | Records, tiers, categories, status, and a detail sheet per supplier |
| Contracts | Value, term, SLA clauses, renewal runway and reminders for contracts nearing expiry |
| Deliveries | Purchase orders, promised vs received dates, quantities, defects, spend |
| Reviews | Periodic ratings (quality, delivery, communication, pricing, compliance) |
| SLA watch | Breaches are detected automatically from deliveries; open, resolve and track penalties |
| Tableau reports | Flat CSV tables for Tableau, plus a place to show your published dashboard |

### Metrics

- **Performance score (0-100)**: on-time delivery, quality (defect rate), SLA compliance and review rating, weighted and renormalised when a signal is missing. Bands: Excellent, Reliable, Watch, At risk.
- **On-time delivery %**, **SLA compliance rate**, **average delay**, **defect rate**
- **Contract renewal exposure**: value of contracts expiring in the next 30 / 60 / 90 / 180 days
- **Supplier-wise expenditure** and **monthly delay and quality trends**

## Run it

Prerequisites: Node 18+, MongoDB running locally (Compass connected to `mongodb://127.0.0.1:27017`), Tableau Desktop.

```bash
npm run install:all        # root, server and client dependencies
npm run seed               # loads 14 suppliers and ~650 deliveries of demo data
npm run dev                # API on :5000, app on http://localhost:5173
```

Sign in with `admin@partnerpulse.test` / `Pulse@2026`.

Settings live in `server/.env` (copy from `.env.example`): `PORT`, `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`.

Single-process mode: `npm run build` then `npm start` serves the built app from the API on port 5000.

Self-test (no database needed): `npm test --prefix server`

## Using Tableau

1. Run `npm run export:tableau`, or download tables from the **Tableau reports** page. Files are written to `tableau-data/`.
2. In Tableau Desktop choose **Connect > Text file** and add:
   - `partnerpulse_monthly_supplier_kpis.csv` for trends over time (one row per supplier per month)
   - `partnerpulse_supplier_scorecard.csv` for the supplier league table and spend
   - `partnerpulse_deliveries.csv` for delay and quality detail
   - `partnerpulse_contracts.csv` for renewal exposure
   - `partnerpulse_violations.csv` for SLA breaches
3. Suggested sheets: performance score by supplier (bar, coloured by `band`), on-time % by month (line), spend by supplier (treemap), renewal exposure by expiry month (bar), delay vs defect rate (scatter, sized by spend).
4. Publish to Tableau Public, Cloud or Server, turn sharing on, copy the link from **Share**, and paste it on the **Tableau reports** page to show it inside PartnerPulse.
5. When data changes, re-run the export and refresh the extract in Tableau.

## Structure

```
server/   Express API, Mongoose models, metrics engine (src/lib), seed + export scripts
client/   React app (Vite, Tailwind), pages in src/pages
tableau-data/   generated CSV tables
```

API: `/api/auth`, `/api/suppliers`, `/api/contracts`, `/api/deliveries`, `/api/evaluations`, `/api/violations`, `/api/analytics/*`, `/api/exports/:name.csv` (all but auth require a bearer token).
