# Software Requirements Specification (SRS): IRS Form 2290 (HVUT) Online E-Filing Platform

**Reference Benchmark:** [TruckDues.com HVUT Service](https://www.truckdues.com/hvut/)  
**Document Status:** Draft v1.0  
**Date:** November 10, 2026

---

## 1. Executive Summary & Product Vision

### 1.1 Purpose
This document defines the functional, regulatory, architectural, and non-functional requirements to build an online **IRS Form 2290 (Heavy Highway Vehicle Use Tax – HVUT)** e-filing platform modeled after **TruckDues.com**. The platform enables owner-operators, fleet managers, and tax professionals (CPAs) to prepare, validate, pay for, and electronically transmit Form 2290 returns and related filings directly to the IRS Modernized e-File (MeF) system, delivering the IRS-watermarked **Schedule 1** within minutes of acceptance.

### 1.2 Core Value Propositions (Benchmark Analysis)
Based on the TruckDues.com service model, the platform differentiates through:
- **Zero Upfront Friction ("Prepare Free, Pay to File"):** Users can create an account, enter business/vehicle data, and calculate taxes before paying platform service fees at final submission.
- **Rapid Schedule 1 Delivery:** Automated MeF transmission and instant delivery of the digitally watermarked IRS Schedule 1 via dashboard download, email, and optional SMS/fax.
- **Transparent Tiered Pricing:** Vehicle-count-based pricing for single trucks, mid-size fleets, and unlimited-vehicle/unlimited-return enterprise plans, plus free VIN corrections for returns originally filed on the platform.
- **Multi-Persona Support:** Guided step-by-step wizards for single owner-operators alongside bulk spreadsheet imports and multi-EIN dashboards for fleets and CPAs.

### 1.3 In-Scope Filings & IRS Forms
1. **IRS Form 2290:** Original Heavy Highway Vehicle Use Tax returns (taxable, logging, and Category W suspended vehicles).
2. **IRS Form 2290 – VIN Correction:** Electronic correction of typographical VIN errors on previously accepted Form 2290 filings.
3. **IRS Form 2290 – Amended Return:** Reporting taxable gross weight increases or suspended vehicles exceeding mileage limits (5,000 / 7,500 miles).
4. **IRS Form 8849 (Schedule 6):** Other Claims for low-mileage, sold, destroyed, or stolen vehicle tax credits/refunds.
5. **IRS Form 2290-V:** Payment Voucher generation for users electing to pay IRS tax dues via check or money order.

---

## 2. User Personas & Access Roles

| Persona / Role | Primary Needs | Key Capabilities Required |
| :--- | :--- | :--- |
| **Owner-Operator** | Fast, affordable, mobile-friendly filing for 1–5 trucks to get Schedule 1 for DMV/IRP/IFTA tags. | Guided wizard, built-in tax calculator, pay-later checkout, instant email/mobile Schedule 1. |
| **Fleet Manager** | Managing 25+ vehicles (mandatory e-file threshold), bulk imports, tracking VINs across renewals. | CSV/Excel bulk upload, fleet vehicle roster, multi-return unlimited packages, status alerts. |
| **CPA / Tax Preparer** | Filing on behalf of dozens of trucking clients under one login. | Multi-business/multi-EIN switcher, client-ready Schedule 1 export, batch management, ERO signature support. |
| **Platform Admin / Support** | Monitoring IRS MeF health, assisting users with IRS rejections, managing promos and refunds. | Rejection code lookup, audit logs, customer impersonation (read-only/support), MeF transmission queue monitor. |

---

## 3. Regulatory & IRS MeF Compliance Requirements

> [!IMPORTANT]
> Taxpayers cannot e-file Form 2290 directly on IRS.gov. The platform must be authorized by the IRS as an **Electronic Return Originator (ERO)** and/or **Transmitter** using software that has passed the **IRS Assurance Testing System (ATS)**.

### 3.1 IRS Authorization & Credentials
- **REQ-REG-001:** Obtain and maintain an IRS **EFIN** (Electronic Filing Identification Number), **ETIN** (Electronic Transmitter Identification Number), and IRS-issued **Software ID** embedded in all Form 2290 and Form 8849 XML submissions.
- **REQ-REG-002:** Pass annual IRS **ATS (Assurance Testing System)** certification for every supported tax year schema before opening production filing for that season.
- **REQ-REG-003:** Enforce the IRS e-file mandate rules and support mandatory electronic signature methods (e.g., 5-digit self-select PIN / Practitioner PIN or Form 8453-EX attachment workflow as specified by current MeF specs).

### 3.2 Mandatory IRS Validation Rules (Pre-Submission Gate)
- **REQ-REG-004 (EIN Only):** Enforce a valid 9-digit **Employer Identification Number (EIN)**; reject Social Security Numbers (SSNs). Warn new businesses that a newly issued EIN may take up to ~2 weeks to propagate in IRS MeF systems.
- **REQ-REG-005 (IRS Name Control):** Capture business legal name and derive/validate the 4-character IRS **Name Control** guidance in the UI to prevent the most common IRS MeF rejection.
- **REQ-REG-006 (VIN Integrity):** Validate all Vehicle Identification Numbers are exactly **17 alphanumeric characters**, strictly prohibiting letters **`I`**, **`O`**, and **`Q`**, and running ISO 3779 check-digit validation (with a soft warning override only if legacy/non-standard pre-1981 VINs are permitted by IRS schema).
- **REQ-REG-007 (Tax Period & First-Use Month):** Support standard tax periods running **July 1 through June 30**, automatically validating **Month of First Use** (July through June) and highlighting statutory filing deadlines (August 31 for July first use; last day of the month following the month of first use for mid-year additions).

---

## 4. Functional Requirements

### 4.1 User Account & Multi-Business Management
- **REQ-ACC-001:** Registration/login via email + password, with optional **Multi-Factor Authentication (MFA)** via SMS or authenticator app.
- **REQ-ACC-002:** **Multi-Business Profile Manager** allowing a single user account to create, edit, search, and switch between multiple legal entities (each keyed by its unique EIN, DBA, business address, signing authority name/title, and optional Third-Party Designee).
- **REQ-ACC-003:** **Prior-Year Carry-Forward:** Allow returning users to clone business details and active vehicle fleets from a prior tax period into the new tax year in one click, editing only added/sold trucks.

### 4.2 Form 2290 Original Return Wizard
A step-by-step, auto-saving draft workflow:
1. **Business & Tax Year Selection:** Select EIN/business, tax period, Month of First Use, and special checkboxes (*Address Change*, *Final Return*, *Amended Return*).
2. **Vehicle Classification & Entry:**
   - **Taxable Vehicles (Categories A–V):** Select taxable gross weight from **55,000 lbs (Category A)** up to **over 75,000 lbs (Category V)**.
   - **Logging Vehicle Indicator:** Toggle for vehicles used exclusively for transporting harvested forest products (**25% tax reduction** across categories A–V).
   - **Suspended Vehicles (Category W):** Vehicles weighing 55,000+ lbs driven **5,000 miles or less** (commercial) or **7,500 miles or less** (agricultural) during the tax period (\$0 tax due, still required on Schedule 1).
   - **Credit Vehicles:** Report sold, destroyed, stolen, or prior-year low-mileage vehicles to claim a credit offset against current-year tax due (with required disposition dates and supporting details).
3. **Review & Pre-Flight Error Check:** Display line-by-line Form 2290 summary (Part I tax calculation, Part II statement in support of suspension, Schedule 1 vehicle list) and run pre-submission validation checks.

### 4.3 HVUT Tax & Proration Calculation Engine
- **REQ-CALC-001 (Standard & Logging Rate Table):** Maintain configurable IRS annual tax tables per tax year:
  - Category A (55,000 lbs): **\$100** base, increasing by **\$22 per additional 1,000 lbs** (or fraction thereof) up to Category U (74,001–75,000 lbs), capping at **\$550** for Category V (>75,000 lbs).
  - Logging vehicles: **75% of standard rate** (25% reduction).
- **REQ-CALC-002 (Monthly Proration):** For vehicles first used after July, compute:
  $$\text{Prorated Tax} = \text{Full Annual Tax} \times \frac{\text{Remaining Months (inclusive of Month of First Use)}}{12}$$
- **REQ-CALC-003 (Public Tax Calculator):** Provide an unauthenticated, standalone **HVUT Tax Calculator** tool on the marketing site/app so prospective users can estimate tax before registering.

### 4.4 Bulk Vehicle Import (Fleet Support)
- **REQ-BULK-001:** Provide downloadable **CSV / Excel (`.xlsx`) templates** with column definitions (`VIN`, `Weight Category`, `Is Logging`, `Is Agricultural`, `Is Suspended`, `First Used Month`).
- **REQ-BULK-002:** Parse uploaded files asynchronously or in-memory with a **staged validation table** highlighting invalid rows (e.g., bad VIN length, forbidden characters `I/O/Q`, duplicate VINs within the same return, invalid category) so users can fix errors inline without re-uploading the entire file.
- **REQ-BULK-003:** Support fleets with **100 to 10,000+ vehicles** per return without UI timeouts (paginated tables and background XML generation).

### 4.5 Post-Filing Corrections, Amendments & Refund Claims
- **REQ-POST-001 (VIN Correction):**
  - Select a previously accepted Form 2290 return (or enter prior filing reference if filed elsewhere).
  - Map `Incorrect VIN` -> `Corrected 17-digit VIN`.
  - Automatically price as **Free** if the original Form 2290 was accepted through this platform; otherwise charge the standard VIN correction fee.
- **REQ-POST-002 (2290 Amendment – Weight Increase):**
  - Select vehicle(s), prior weight category, new higher weight category, and month the weight increase occurred.
  - Calculate incremental tax due: $(\text{New Prorated Tax} - \text{Previously Paid Prorated Tax})$ from the month of change through June 30.
- **REQ-POST-003 (2290 Amendment – Mileage Exceeded):**
  - Convert a Category W suspended vehicle to taxable status upon crossing the 5,000 / 7,500-mile threshold and compute full/prorated tax from the month of first use (per IRS rules for exceeded suspension).
- **REQ-POST-004 (Form 8849 Schedule 6 Claims):**
  - Dedicated workflow to claim tax refunds for sold, destroyed, stolen, or low-mileage vehicles (when credit exceeds current 2290 liability or when no new 2290 is being filed), generating and transmitting Form 8849 Schedule 6 XML to IRS MeF.

### 4.6 Two-Stream Payment & Pricing Engine
Payments must be strictly separated in UI copy and financial processing into **Stream A (Platform Service Fees)** and **Stream B (IRS Tax Dues)**:

#### Stream A: Platform Service Fees (Paid to Platform)
- **REQ-PAY-001 (Tiered Pricing Model):** Configurable pricing engine modeled on TruckDues' vehicle tiers:
  - Single-return tiers by vehicle count (e.g., 1, 2, 3, 4, 5, 6–25, 26–100, and Unlimited Vehicles in Single Return).
  - Multi-return package (e.g., Unlimited Vehicles & Unlimited Returns for a single business/tax year).
  - Flat service fees for 2290 Amendments, Form 8849 Schedule 6 Claims, and non-native VIN Corrections.
  - Support promotional/coupon codes and optional add-on fees (e.g., fax delivery, priority SMS alerts).
- **REQ-PAY-002 (Pay-Later Workflow):** Charge **\$0** during account setup, vehicle entry, and tax calculation. Trigger service-fee checkout (Credit/Debit Card, Apple Pay/Google Pay) only when the user clicks **Submit to IRS**.
- **REQ-PAY-003 (Rejection Resubmission Policy):** If a paid submission is **rejected by the IRS** for a fixable data error (e.g., EIN/Name Control mismatch), allow the user to edit and **resubmit at no additional service fee**.

#### Stream B: IRS HVUT Tax Payment Methods (Paid to IRS)
- **REQ-IRS-PAY-001 (Electronic Funds Withdrawal – EFW):** Collect bank routing number, account number, account type (Checking/Savings), and authorize direct debit within the MeF XML payload.
- **REQ-IRS-PAY-002 (EFTPS):** Allow users to declare payment via the Electronic Federal Tax Payment System, reminding them to schedule payment on EFTPS.gov at least 1 business day before the due date.
- **REQ-IRS-PAY-003 (Credit/Debit Card via IRS Processor):** Provide integration/links to IRS-authorized third-party tax payment processors (disclosing third-party convenience fees).
- **REQ-IRS-PAY-004 (Check or Money Order):** Generate a pre-filled **Form 2290-V Payment Voucher** PDF for mailing with a check/money order to the IRS.

### 4.7 Schedule 1 Delivery, Notifications & Document Vault
- **REQ-DOC-001 (Watermarked Schedule 1 Extraction):** Poll/receive IRS MeF acknowledgments; upon `Accepted` status, retrieve or render the official **IRS digitally watermarked Schedule 1 PDF** (verifying watermark legibility).
- **REQ-DOC-002 (Multi-Channel Delivery):**
  - Immediate availability in the user's web/mobile dashboard.
  - Automatic **email attachment/link** delivery upon IRS acceptance.
  - Optional **SMS/Text notification** for status changes (`Transmitted`, `Accepted`, `Rejected`).
  - Optional **Fax delivery** during checkout (e.g., faxing directly to a DMV office, leasing company, or dispatch).
- **REQ-DOC-003 (Document Retention):** Store filed Form 2290 PDFs, Schedule 1 PDFs, 8849 claims, and IRS acknowledgment receipts in an encrypted **Document Vault** for at least **3–7 years** (IRS record-keeping standard is 3 years minimum).
- **REQ-DOC-004 (Deadline Reminders):** Automated email/SMS reminders ahead of July/August annual renewal and mid-year first-use deadlines.

### 4.8 Multi-Platform Client Channels
- **REQ-CHAN-001 (Responsive Web App):** Full feature parity across desktop, tablet, and mobile browsers.
- **REQ-CHAN-002 (Native / Cross-Platform Mobile Apps):** iOS and Android apps supporting registration, Form 2290 filing, VIN corrections, amendments, tax calculator, push notifications, and offline-accessible downloaded Schedule 1 PDFs.

---

## 5. Non-Functional Requirements

### 5.1 Security & Privacy (IRS Publication 1345 & 4557 Alignment)
- **NFR-SEC-001:** Encrypt all data in transit using **TLS 1.2/1.3** and all sensitive PII/taxpayer data at rest using **AES-256** (specifically EINs, bank routing/account numbers, and PDF documents).
- **NFR-SEC-002:** **PCI-DSS Compliance:** Never store raw credit card PANs or CVVs on platform servers; tokenize service-fee payments via a PCI Level 1 processor (e.g., Stripe, Braintree).
- **NFR-SEC-003:** **Audit Logging:** Maintain immutable logs of all authentication events, return edits, XML transmissions, IRS acknowledgments, and admin actions.
- **NFR-SEC-004:** Automatic session inactivity timeout (e.g., 15–30 minutes) and brute-force/rate-limit protection on login and EIN lookup endpoints.

### 5.2 Performance, Scalability & Seasonal Load
- **NFR-PERF-001:** Traffic peaks sharply between **July 15 and August 31** (annual filing deadline). Infrastructure must auto-scale to handle 10x–20x baseline concurrent users without degraded response times.
- **NFR-PERF-002:** Web API p95 response time `< 300ms` for standard CRUD; bulk imports of 1,000 vehicles validated in `< 5 seconds`.
- **NFR-PERF-003:** Decouple IRS MeF transmission using a durable **message queue / job worker** with idempotent submission tracking, exponential backoff for IRS gateway maintenance windows, and dead-letter alerting.

### 5.3 Reliability & Availability
- **NFR-REL-001:** Target **99.9% uptime** overall and **99.99% uptime** during peak filing months (July–August).
- **NFR-REL-002:** Automated daily encrypted database backups with cross-region replication (`RPO <= 15 minutes`, `RTO <= 1 hour`).

### 5.4 Usability & Accessibility
- **NFR-UX-001:** Comply with **WCAG 2.1 Level AA** accessibility standards.
- **NFR-UX-002:** Clear inline tooltips explaining trucking terminology (e.g., *Taxable Gross Weight vs. Empty Weight*, *Category W mileage limits*, *Name Control*).

---

## 6. High-Level Data Model & Filing State Machine

### 6.1 Core Domain Entities
- **`User`**: `id`, `email`, `password_hash`, `mfa_enabled`, `role` (`OWNER_OP` | `FLEET` | `CPA` | `ADMIN`), `created_at`
- **`BusinessEntity`**: `id`, `owner_user_id`, `ein_encrypted`, `legal_name`, `name_control`, `dba`, `address`, `signing_authority_name`, `signing_authority_title`, `phone`
- **`Vehicle`**: `id`, `business_id`, `vin`, `unit_number`, `default_weight_category`, `is_logging`, `is_agricultural`, `status` (`ACTIVE` | `SOLD` | `DESTROYED` | `STOLEN`)
- **`ReturnFiling`**: `id`, `business_id`, `form_type` (`2290_ORIG` | `2290_VIN_CORR` | `2290_AMEND` | `8849_SCH6`), `tax_year`, `first_used_month`, `status`, `irs_submission_id`, `total_tax_due`, `total_credits`, `net_tax_due`, `submitted_at`, `accepted_at`
- **`FilingVehicleLine`**: `id`, `filing_id`, `vin`, `weight_category` (`A`–`W`), `is_logging`, `line_type` (`TAXABLE` | `SUSPENDED` | `CREDIT` | `VIN_CORRECTION`), `prior_vin`, `computed_tax`
- **`ServiceOrder`**: `id`, `filing_id`, `pricing_tier`, `amount`, `discount_code`, `payment_status`, `processor_tx_id`
- **`TaxPaymentInstruction`**: `id`, `filing_id`, `method` (`EFW` | `EFTPS` | `CARD` | `CHECK`), `routing_enc`, `account_enc`, `debit_date`
- **`Schedule1Document`**: `id`, `filing_id`, `s3_key_encrypted`, `irs_watermark_verified`, `delivered_channels` (`EMAIL`, `SMS`, `FAX`)

### 6.2 Filing Lifecycle State Machine
```
[DRAFT] ──(validate)──> [VALIDATED] ──(pay service fee / active unlimited plan)──> [PAID]
   ▲                                                                                 │
   │                                                                     (enqueue MeF job)
   │                                                                                 ▼
[EDITING_AFTER_REJECT] <──(IRS MeF Reject + Error Codes)── [TRANSMITTED_TO_IRS] <── [QUEUED]
                                                                    │
                                                      (IRS MeF Accept + Schedule 1)
                                                                    ▼
                                                                [ACCEPTED] ──> (Notify & Deliver)
```

---

## 7. Admin, Operations & Customer Support Portal

- **REQ-ADM-001 (IRS Rejection Resolution Center):** Translate raw IRS XML rejection codes (e.g., `F2290-001`, Name Control mismatch, duplicate VIN in same tax period) into human-readable instructions for both users and support agents.
- **REQ-ADM-002 (Pricing & Promo Management):** Dynamic admin UI to update vehicle pricing tiers, seasonal promo codes, and annual IRS tax year calendars/tables without code deployments.
- **REQ-ADM-003 (MeF Operations Monitor):** Real-time dashboard tracking queued vs. transmitted vs. accepted/rejected filings, IRS MeF endpoint latency, and automated alerts when rejection rates spike.
- **REQ-ADM-004 (Support & Audit Console):** Search filings by EIN, Submission ID, or VIN; view delivery logs (email bounce/open status, fax transmission status); resend Schedule 1 links.

---

## 8. Recommended Phased Roadmap

| Phase | Scope & Deliverables | Target Outcome |
| :--- | :--- | :--- |
| **Phase 1: Core MVP (Web + IRS Certification)** | User/Multi-EIN accounts, Form 2290 Original Wizard, Tax Calculator, Pay-Later Service Fee Checkout, EFW/EFTPS/2290-V tax payments, IRS ATS Certification & MeF integration, Email + Dashboard Schedule 1 delivery, Admin Rejection Console. | Launch ready for July–August peak season for owner-operators & small fleets. |
| **Phase 2: Fleet, CPA & Post-Filing Suite** | Bulk CSV/Excel upload, Fleet vehicle roster & prior-year clone, Free/Paid VIN Corrections, 2290 Amendments, Form 8849 Schedule 6 claims, Unlimited Fleet/CPA packages, SMS & Fax delivery. | Capture high-volume fleets, trucking associations, and tax preparers. |
| **Phase 3: Mobile Apps & Ecosystem** | Native/Cross-platform iOS & Android apps, push notifications, public Partner/ELD/TMS API for embedded 2290 filing, multi-language support (e.g., Spanish/Punjabi localization for trucking demographics). | Maximize retention, referrals, and B2B channel partnerships. |

---

## 9. Key Open Decisions for Stakeholder Alignment

1. **IRS Transmitter vs. Aggregator Strategy:** Will your engineering team obtain your own IRS EFIN/ETIN/Software ID and build the MeF SOAP/XML client directly (longer lead time due to IRS ATS testing), or integrate initially with an existing IRS-authorized MeF transmitter API?
2. **Pricing Strategy:** Will you match TruckDues' vehicle tiers (starting around \$7.99 for 1 truck up to \$199.99 unlimited) or introduce subscription/fleet-management bundles?
3. **Mobile App Technology:** Build a responsive PWA + React Native / Flutter mobile app for iOS/Android in Phase 2–3, or launch mobile apps concurrently with the web MVP?
4. **Support Channels:** TruckDues emphasizes phone, email, and chat support during filing season—will you staff live US-based phone support during July–August peak hours?
