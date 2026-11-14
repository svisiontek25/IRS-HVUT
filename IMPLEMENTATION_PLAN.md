# Implementation Plan — IRS HVUT v1.1 (`d:\Local Disk D\truckdues\IRS HVUT-1.1`)

## 1. Save Documentation & Bootstrap Project Workspace
1. Save `MASTER_PROMPT.md` and `IMPLEMENTATION_PLAN.md` in `d:\Local Disk D\truckdues\IRS HVUT-1.1`.
2. Copy base config & `src/` from `D:\Local Disk D\truckdues\IRS HVUT\IRS HVUT`, link `node_modules` via directory junction, and preserve `REFERANCE DOCUMENTS/`.

## 2. Extend Domain Types (`src/lib/adapters/types.ts`)
- Extend `User`, `BusinessEntity`, `FilingVehicleLine`, `ServiceOrder`, `ReturnFiling`, and `ISchedule1Generator` to support registration, `Add Business` fields (`BUSINESS_INFO.jpeg`), private purchase / prior-year suspension / credit / amendment / VIN correction fields, package pricing, and full Form 2290 PDF generation.

## 3. Update SQLite Database & Seed Data (`src/lib/hvut/db.ts`)
- Add `metadata_json` support to `users` and `businesses` tables.
- Persist extended `ReturnFiling` fields in `payload_json`.
- Seed benchmark business `MP BASRA TRANSPORT INC` (`82-0620432`) with the 3 Category V VINs from `REFERANCE DOCUMENTS/SCHEDULE_1_FORMAT.pdf` alongside the 4 demo personas.
- Export `createUser` for `/api/auth/register`.

## 4. Update Service Fee Pricing Engine (`src/lib/adapters/payment-simulator.ts`)
- Support `PER_VEHICLE`, `UNLIMITED_SINGLE` ($139.99), and `UNLIMITED_ANNUAL` ($199.99) packages, plus $1.00 Fax / $1.00 SMS add-ons and free rejection resubmission / native VIN correction waivers.

## 5. Official IRS (Rev. July 2026) PDF Generator (`src/lib/adapters/pdf-generator.ts` & API Routes)
- Implement coordinate-accurate IRS Schedule 1 (Rev. July 2026) with 9-box EIN, 6-box `YYYYMM`, Part I `a/b/c`, Part II 24-row 17-box VIN grid, and diagonal `Received MM/DD/YYYY` watermark.
- Implement full Form 2290 (Rev. July 2026) multi-page package PDF (`generateForm2290Pdf`) + `GET /api/filings/[id]/form2290`.
- Implement `POST /api/auth/register` and update `POST /api/businesses`.

## 6. UI Screens & Navigation
- `src/components/AppShell.tsx`: TruckDues-style top utility bar, main navigation, Persona Switcher, and Sandbox Inbox drawer.
- `src/app/register/page.tsx` & `src/app/login/page.tsx`: Registration matching `REGISTER _ PAGE .jpeg` & Sign In.
- `src/app/businesses/new/page.tsx`: Two-column `Add Business` matching `BUSINESS_INFO.jpeg`.
- `src/app/file/new/page.tsx`: Unified 8-step chevron wizard (`Get Started`, `Tax Options`, `Vehicle Info`, `IRS Options`, `Pricing`, `Checkout`, `Form Summary`, `Submit Return`) covering Form 2290, Amendments, VIN Corrections, and 8849 Claims.
- `src/app/dashboard/page.tsx`: TruckDues `My Business` & `Return Summary` vault with `View PDF` (Form 2290), `Schedule1 PDF`, and `MeF XML`.
- `src/app/user-guide/page.tsx`: Interactive `2290 User Guide` replicating `https://www.truckdues.com/2290-user-guide-2290/`.

## 7. Verification
- Run `npm run build` and verify zero TypeScript / Next.js build errors.
- Verify PDF generation outputs valid PDF buffers for Schedule 1, Form 2290 package, and Form 2290-V.

