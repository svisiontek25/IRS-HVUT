# IRS Form 2290 (HVUT) E-Filing Platform — PoC Simulator

A full-stack **Proof-of-Concept (PoC)** web application simulating an end-to-end IRS Form 2290 Heavy Highway Vehicle Use Tax (HVUT) e-filing platform without requiring real IRS authorization (`EFIN`, `ETIN`, `Software ID`, or `ATS` credentials).

## Architecture (Ports & Adapters)
All domain logic (HVUT tax tables, monthly proration, ISO 3779 VIN validation, filing state machine) runs identically to production, while external integrations sit behind swappable adapter interfaces in `src/lib/adapters/`:

- **`IMefTransmitter` -> `SimulatedMefAdapter`** (`src/lib/adapters/mef-simulator.ts`): Generates IRS Form 2290 / 8849 MeF XML, enforces IRS business rules (EIN, Name Control, duplicate VIN checks), and supports `AUTO_ACCEPT`, `MANUAL_REVIEW`, `AUTO_REJECT`, and `GATEWAY_OUTAGE` modes.
- **`ISchedule1Generator` -> `MockWatermarkedPdfAdapter`** (`src/lib/adapters/pdf-generator.ts`): Generates downloadable Schedule 1 PDFs (with a prominent `"SIMULATED IRS SCHEDULE 1"` watermark) and Form 2290-V payment vouchers via `pdf-lib`.
- **`IPaymentGateway` -> `MockCheckoutAdapter`** (`src/lib/adapters/payment-simulator.ts`): Simulates Stream A tiered service fees, promo codes (`TRUCK10`, `FLEET25`, `POCFREE`), SMS/Fax add-ons, and free resubmissions after IRS rejections.
- **`SQLite` Persistence** (`src/lib/hvut/db.ts`): Uses Node 24's built-in `node:sqlite` (`data/hvut-poc.db`) pre-seeded with Owner-Operator, Fleet Manager, CPA (multi-EIN), and Admin personas.

## Running Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Built-In QA Simulation Triggers
- **Card Approval vs. Decline:** Cards starting with `4242...` approve; `4000...` trigger a simulated decline.
- **Name Control Rejection (`F2290-001`):** Set Name Control to `BAD1` (or mismatch business legal name) or use an EIN ending in `99`.
- **EFIN/EIN Propagation Rejection (`R0000-905`):** Use an EIN ending in `88`.
- **Duplicate VIN Rejection (`F2290-023`):** Submit a VIN that is already `ACCEPTED` for the same EIN and tax year.
- **Manual Review / Outage:** Switch modes in `/admin` (**Simulator Console**) to pause submissions in `TRANSMITTED_TO_IRS` or `QUEUED` and manually trigger Accept/Reject acknowledgments.

