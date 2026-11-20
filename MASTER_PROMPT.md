# MASTER PROMPT — IRS-HVUT v1.1 Form 2290 E-Filing Platform

## Objective
Build a full-stack Next.js (App Router, TypeScript, Tailwind CSS, `node:sqlite`, `pdf-lib`, `papaparse`) web application in `IRS HVUT-1.1` that implements the complete **Form 2290 User Guide workflow** and generates **pixel-accurate official IRS (Rev. July 2026) PDFs** using the templates in `REFERANCE DOCUMENTS/`, while preserving the local IRS MeF Simulator & Ports-and-Adapters architecture.

---

## 1. Visual Identity, Header & Navigation
1. **Top Utility Bar:**
   - Left: Support contact information | Live Simulator Mode pill (`AUTO_ACCEPT`, `MANUAL_REVIEW`, `AUTO_REJECT`, `GATEWAY_OUTAGE`).
   - Right: Links to `2290 User Guide` (`/user-guide`), `Tax Calculator` (`/`), `Simulator Console` (`/admin`), `Sandbox Inbox` drawer badge, and **Persona / Account Switcher**.
2. **Main Brand Header:**
   - IRS-HVUT federal blue & navy branding (`IRS-HVUT 2290 — simplifies 2290 tax filings`).
   - Primary Navigation: `Home / Dashboard` (`/dashboard`), `File a Return` (`/file/new`), `Add Business` (`/businesses/new`), `Tax Calculator` (`/`), `2290 User Guide` (`/user-guide`), `Register / Login` (`/register`, `/login`), `Simulator Console` (`/admin`).

---

## 2. Authentication & Registration Flow (`REGISTER _ PAGE .jpeg`)
Provide `/register` and `/login` screens faithful to `REFERANCE DOCUMENTS/REGISTER _ PAGE .jpeg`:
- **Register Here (`/register`):**
  - Notice box: *"By filling in the form below and clicking the 'SUBMIT' button, you accept and agree to Terms of Service and Privacy Policy. Already have an account? Sign In"*
  - Required fields: `First Name *`, `Last Name *`, `Email *`, `Phone Number *`, `Password *`, `Confirm Password *`.
  - Actions: Green `Submit` and `Cancel` buttons. Creating an account persists the user in SQLite, signs them in, and redirects to `/businesses/new` (`Add Business`).
- **Sign In (`/login`):** Email + Password login with quick-fill buttons for the pre-seeded demo personas (`Owner-Operator`, `Fleet Manager`, `CPA / Tax Preparer`, `Platform Admin`).

---

## 3. Add / Edit Business Screen (`BUSINESS_INFO.jpeg`)
Implement `/businesses/new` matching `REFERANCE DOCUMENTS/BUSINESS_INFO.jpeg`:
- Breadcrumb: `My Home / Add Business`
- **Two-Column Card Layout:**
  - **Left Column — `Business Info`:**
    - `Business Name *` (with `?` tooltip) & `Name Control` (auto-derived 4-character IRS Name Control with manual override for QA rejection testing and `?` tooltip).
    - `EIN * (Don't use your SSN, IRS might reject)` (9-digit `XX-XXXXXXX` validation) & `Business Type *` dropdown (`Limited Liability Company (LLC)`, `Corporation`, `Partnership`, `Sole Proprietorship`, `Non-Profit / Exempt`).
    - `Address Line1 *` (plus optional `Room / Suite No.` for IRS Form 2290 header).
    - `Country *` (`US`, `Canada`, `Mexico`) & `State *` (US states dropdown).
    - `City *` (input + `Other City` checkbox) & `Zip *`.
    - `Cell Number`.
  - **Right Column Top — `Point of Contact ?`:**
    - `Name`, `E-Mail ID`, `Phone *`.
  - **Right Column Bottom — `Signing Authority ?`:**
    - `Name *` (`Signing Authority Name`), `Title *` (e.g., `Owner/President`), `E-Mail ID *`, `Phone *`.
  - **Bottom Left — `Third Party Designee ?`:**
    - `[+ Add New]` button revealing `Designee Name`, `Designee Phone`, and `5-Digit Personal Identification Number (PIN)` (maps directly to Form 2290 Page 1 Third Party Designee block).
  - **Bottom Right:** Blue `[Save & Continue]` button.

---

## 4. Unified 8-Step Chevron Filing Wizard (`/file/new`)
Implement the 8-step horizontal chevron progress bar:
`Get Started` -> `Tax Options` -> `Vehicle Info` -> `IRS Options` -> `Pricing` -> `Checkout` -> `Form Summary` -> `Submit Return`
Display the active business name and EIN (`BUSINESS NAME (XX-XXXXXXX)`) in the top-right corner of the wizard header.

### Step 1: `Get Started` (`Business and Tax Information`)
- `Select Business *` dropdown (with quick link to `+ Add Business`).
- `Select Your Tax Return to report with IRS *` — 4 interactive visual card tiles:
  1. **Form 2290 Tax** (*"Prepare your heavy vehicle taxes and report it here"*)
  2. **2290 Amendment** (*"Prepare your 2290 Amendment return and report it here"*)
  3. **VIN Correction** (*"Correct your mistakenly reported VIN# here"*)
  4. **2290 Claim** (*"Prepare refund claim on credit vehicles here — Form 8849 Schedule 6"*)
- `Select Tax Year *` (`2026-2027`, `2025-2026`) & `Select Your First Used Month *` (`July` through `June` with statutory due date banner).
- Checkboxes with tooltips:
  - `[ ] Final Return`
  - `[ ] Address Change`
  - `[ ] Third Party Designee` (`Third Party Assigned`)
  - `[ ] Consent to Disclosure` (`I agree with consent to disclosure` — maps to Form 2290 Consent to Disclosure of Tax Information)

### Step 2: `Tax Options` / `Select Amendment` / `Claim Options`
Adapts dynamically to the return type chosen in Step 1:
- **If `Form 2290 Tax`:** Visual truck-icon checkboxes grouped into 3 columns (`Select Reporting Vehicles`):
  - **Taxable Vehicle:** `Taxable Vehicle`, `Suspended Vehicle (Exempt from Tax)`
  - **Credit Vehicle:** `Sold, Destroyed, and Stolen Vehicle Credits`, `Low Mileage Vehicle Credits`
  - **Prior Year Vehicle:** `Prior Year Suspended Vehicle` (populates Form 2290 Part II Line 8a/8b/9)
- **If `2290 Amendment`:** Visual truck-icon radio cards:
  - `Increase in Taxable Gross Vehicle Weight` + `Gross Weight Category Changed on *` (month selector)
  - `Suspended Vehicle Exceeded Mileage Use Limit` + `Vehicle Exceeds Mileage Use Limit on *` (month selector)
- **If `VIN Correction`:** Select prior accepted Form 2290 return (or external reference) and choose correction category (`Taxable`, `Suspended`, `Credit`).
- **If `2290 Claim` (Form 8849 Schedule 6):** Select claim categories (`Sold/Transferred Credits`, `Low Mileage Credits`, `Overpaid Credits`).

### Step 3: `Vehicle Info` / `Add VIN` / `Claim Info`
- Tabbed section switcher for active categories (`Taxable Vehicles`, `Suspended Vehicles`, `Prior Year Suspended Vehicles`, `Sold or Destroyed Credits`, `Low Mileage Credits`).
- Category panels include:
  - **`[+ Add Vehicles]` Modal** (Taxable with `Privately Purchased` & `[Save & Add Another]`, Suspended, Credits, Weight Increase Amendment, VIN Correction).
  - **`[Import Vehicles]` Modal:** Pick vehicles from the business's saved Fleet Roster or previous filings.
  - **`[Bulk Upload]` Modal:** Download CSV template or upload CSV rows into a staged preview table (`Unit Number`, `VIN`, `Gross Weight/Category`, `Logging`, `Privately Purchased`, `Purchased Month`) with ISO 3779 check-digit & `I/O/Q` validation and inline repair before clicking `[Upload]`.
  - **Paginated Vehicle Table:** `Search VIN here...` filter, `[Delete All]`, inline Edit/Delete actions, and live bottom-right totals (`Tax Due`, `Credits`, `Balance Due`).

### Step 4: `IRS Options` (`IRS Filing and Payment Options`)
- E-filing Method (`Yes` / `No`) + IRS Payment Method (Stream B: `EFW`, `EFTPS`, `Credit / Debit Card`, `Check or Money Order / 2290-V`).

### Step 5: `Pricing` (`Pricing & Purchase Summary`)
- `Select Package` (`Reporting Vehicles`, `Unlimited Vehicles - Single Return $139.99`, `Unlimited Vehicles & Unlimited Returns $199.99`).
- Subscriptions (`FAX Copies of Sch-1: $1.00`, `TEXT alert: $1.00`, `Additional EMAIL alert`).
- Right-column `Purchase Summary`.

### Step 6: `Checkout` (`Payment Information`)
- `Card Type *`, `Card Number *` (`4242...` approves, `4000...` declines), `Expiry Date *`, `CVV *`, `Promo Code` (`TRUCK10`, `FLEET25`, `POCFREE`), `[ ] Edit Billing Address`, `[Make Payment]` button, and `Purchase Summary`.

### Step 7: `Form Summary`
- Business Information, Filing & IRS Payment Details, Vehicle Details breakdown + `[Verify VIN Details]` modal, Tax Due summary, red **`[View Tax Form in PDF]`** (`/api/filings/[id]/form2290`), and red **`[Submit Return To IRS]`** button.

### Step 8: `Submit Return` / `Finish`
- `Transaction PIN` 5-digit modal, 3-Stage Visual Status Tracker (`Tax Return Completed`, `Tax Return Submitted`, `Sch-1 Receipt Ready`), and printable `Payment Receipt` / Invoice.

---

## 5. Official IRS (Rev. July 2026) PDF Generation (`pdf-lib` + `REFERANCE DOCUMENTS`)
1. `GET /api/filings/[id]/schedule1` — Official IRS Schedule 1 (Form 2290) `(Rev. July 2026)` with 9-box EIN, 6-box `YYYYMM`, Part I `a/b/c`, Part II 24-row 17-box VIN grid, and diagonal `Received MM/DD/YYYY` watermark.
2. `GET /api/filings/[id]/form2290` — Full multi-page IRS Form 2290 `(Rev. July 2026)` package (Page 1, Page 2 Tax Computation Table, Schedule 1 copies, Consent to Disclosure, and Form 2290-V Payment Voucher).
3. `GET /api/filings/[id]/voucher` — Form 2290-V Payment Voucher PDF.

---

## 6. Application Dashboard (`/dashboard`) & Interactive 2290 User Guide (`/user-guide`)
1. `/dashboard`: `My Business` bar + `Return Summary` table (`Return ID`, `Form Type`, `Return Date`, `Return Status`, `Filing Method`, `Action`, `View PDF`, `Schedule1 PDF`, `MeF XML`).
2. `/user-guide`: Interactive step-by-step walkthrough.

