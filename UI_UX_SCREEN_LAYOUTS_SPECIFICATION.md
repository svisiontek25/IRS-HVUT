# UI/UX Screen Layouts & Web Design Specifications
## IRS-HVUT v1.1 Commercial Web Application

**Document Version:** 2.1 (Authentic HVUT-1.1 Application Blueprint)  
**Target Audience:** UI/UX Designers, Web Designers, Frontend Developers, Design System Leads  
**Purpose:** Authentic screen layouts, wireframe blueprints, design tokens, and component specifications extracted directly from the **IRS-HVUT v1.1** application.

---

## 1. Global Design System & Style Tokens

### 1.1 Color Palette
- **Primary Federal Navy:** `#1e3a8a` (Brand authority, headers, key badges)
- **Primary Action Blue:** `#0073b7` (Buttons, active tabs, clickable links)
- **Stripe Express Purple:** `#635bff` (Express checkout, payment highlights)
- **Neutral Dark / Charcoal:** `#0f172a` (Headings, primary body text)
- **Neutral Slate / Muted:** `#64748b` (Helper text, secondary labels, borders)
- **Background Light:** `#f8fafc` (Page background, subtle table striping)
- **Surface White:** `#ffffff` (Card containers, modal backgrounds)
- **Success Emerald:** `#10b981` (Accepted badges, valid checksum indicators)
- **Warning Amber:** `#f59e0b` (Transmitted / In-Review status, deadlines)
- **Error / Reject Rose:** `#ef4444` (IRS rejections, validation alerts)

### 1.2 Typography Hierarchy
- **Primary Font Family:** Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- **Monospace Font Family:** "Consolas", "Roboto Mono", "Courier New", monospace (Used for VINs, EINs, Routing Numbers, and XML payloads)
- **Scale:**
  - Page Title (H1): `24px / 1.3` (Font weight 700)
  - Section Header (H2): `18px / 1.3` (Font weight 600)
  - Card Header (H3): `15px / 1.4` (Font weight 600)
  - Body Text: `13px / 1.5` (Font weight 400)
  - Secondary / Captions: `11px / 1.4` (Font weight 500)

### 1.3 Layout & Grid Standards
- **Container Max-Width:** `1280px` (Centered with `16px` mobile padding, `24px` desktop padding)
- **Card Styling:** `border border-slate-200 bg-white rounded-lg shadow-sm`
- **Form Controls:** Height `38px`, border `#cbd5e1`, focus ring `#0073b7`, border radius `4px`
- **Responsive Breakpoints:**
  - Mobile: `< 640px` (Single column stacked layout)
  - Tablet: `640px – 1023px` (2-column grids)
  - Desktop: `>= 1024px` (Full multi-column layout with fixed sidebars/summaries)

---

## 2. Screen-by-Screen Layout Specifications (Authentic HVUT-1.1 Screens)

### 1. User Sign In Screen

- **Route:** `/login`
- **Screen Purpose:** Secure authentication portal for owner-operators, fleet managers, and CPAs to access their filings.
- **Layout Architecture:** Clean, centered federal-styled card container, IRS-HVUT branding header, email & password credentials form.
- **Key UI Components:**
  - Top App Shell: IRS-HVUT brand logo with federal eagle emblem & support contact details
  - Email Address Input (with format validation)
  - Password Input (masked with visibility toggle)
  - Remember Me Checkbox & Forgot Password Link
  - Primary Action Button: 'Sign In' (Action Blue #0073b7)
  - Quick Demo Persona Switcher: 1-click test fill buttons (Owner-Operator, Fleet Manager, CPA, Platform Admin)
  - Secondary Link: 'Need an account? Register Here'
- **Design & Interaction Notes:** Authentic screen from IRS-HVUT v1.1. Responsive single-column card on mobile devices.

---

### 2. User Registration & Role Selection

- **Route:** `/register`
- **Screen Purpose:** Onboarding screen to register new filers with role-based access control.
- **Layout Architecture:** Multi-field card layout with role-selector radio cards and legal terms acknowledgment.
- **Key UI Components:**
  - Account Persona Selector: Owner-Operator (1-5 trucks), Fleet Manager (25+ trucks), or Tax Preparer / CPA
  - First Name & Last Name (2-column desktop grid, 1-column mobile)
  - Email Address (unique account identifier)
  - Phone Number (US standard formatting)
  - Password & Confirm Password (strength validation rules)
  - Terms of Service & Privacy Policy acceptance checkbox
  - Action Button: 'Create Account' (Primary #0073b7)
  - Back to Sign In link
- **Design & Interaction Notes:** Auto-routes to business onboarding (/businesses/new) upon successful creation.

---

### 3. Business Profile Setup (Multi-EIN)

- **Route:** `/businesses/new`
- **Screen Purpose:** Establishes the taxpayer identity, legal name, 9-digit EIN, and IRS Name Control.
- **Layout Architecture:** Structured 2-column form card with IRS compliance guidelines and signing authority fields.
- **Key UI Components:**
  - Employer Identification Number (EIN): 9 digits with automated formatting (XX-XXXXXXX), strictly forbidding SSNs
  - IRS Name Control Box: Auto-derived 4-character uppercase code (e.g., 'SMIT') with manual override
  - Legal Business Name & DBA / Trade Name (optional)
  - Business Entity Type Dropdown: LLC, Corporation, Partnership, Sole Proprietorship, Non-Profit
  - Physical & Mailing Address: Street, Suite/Unit, City, State dropdown, 5-digit Zip Code
  - Signing Authority Details: Authorized Signer Name, Title (e.g. Owner/President), Daytime Phone, Email
  - Third-Party Designee Block: Optional authorization for representative IRS discussion
  - Primary Action Button: 'Save & Continue to Filing'
- **Design & Interaction Notes:** Supports multi-business profile creation. CPAs can create and manage unlimited client EINs.

---

### 4. Filer Dashboard & Return Summary Vault

- **Route:** `/dashboard`
- **Screen Purpose:** Central command center displaying filing history, live status, and PDF document downloads.
- **Layout Architecture:** Top navigation bar with multi-EIN context switcher, quick-action toolbar, and comprehensive returns table.
- **Key UI Components:**
  - Multi-Business Context Switcher: Dropdown allowing 1-click switching between client trucking companies
  - Action Toolbar: 'Start New Form 2290', 'Carry Forward Fleet', 'Tax Calculator', 'User Guide'
  - Filings Table Columns: Return ID, Tax Year, Form Type, Return Date, Status Badge, Filing Method, View Form 2290 PDF, Stamped Schedule 1 PDF, MeF XML
  - Interactive Sync Status Button: Allows filers to poll the IRS MeF gateway for real-time status updates on demand
  - Status Badges: Accepted (Blue/Green), Transmitted to IRS (Amber), Editing After Reject (Rose), Paid (Indigo)
  - 1-Click Document Vault: Immediate download of official watermarked Schedule 1 PDF upon acceptance
- **Design & Interaction Notes:** Designed for high data density with horizontal scrolling on tablets and mobile.

---

### 5. Wizard Step 1 — Business & Tax Information

- **Route:** `/file/new?step=1`
- **Screen Purpose:** Step 1 of the 8-step filing wizard: selects the return type, tax year, and operational flags.
- **Layout Architecture:** Top 8-step horizontal chevron stepper, active business identity card, form type selection tiles.
- **Key UI Components:**
  - 8-Step Progress Stepper: 1. Get Started -> 2. Tax Options -> 3. Vehicle Info -> 4. IRS Options -> 5. Pricing -> 6. Checkout -> 7. Summary -> 8. Finish
  - Active Business Card: Shows selected business legal name, masked EIN, and physical address
  - Tax Year Selector: Defaults to current tax period '2026-2027 (July 1, 2026 - June 30, 2027)'
  - Form Type Radio Cards: Form 2290 Original, 2290 Amendment, VIN Correction, Form 8849 Schedule 6 Claim
  - Statutory Checkboxes: Address Change, Final Return (Going out of business), Consent to Disclosure
  - Primary Action Button: 'Next: Reporting Vehicles'
- **Design & Interaction Notes:** Progress stepper dynamically highlights active step and allows backwards navigation to completed steps.

---

### 6. Wizard Step 2 — Reporting Vehicles & First Used Month

- **Route:** `/file/new?step=2`
- **Screen Purpose:** Step 2 of the wizard: captures the First Used Month (FUM) and category inclusions.
- **Layout Architecture:** Card container with month picker and category inclusion checkboxes.
- **Key UI Components:**
  - Month of First Use (FUM) Dropdown: July through June
  - Statutory Deadline Countdown Banner: Computes exact filing deadline (e.g. 'Due by August 31, 2026')
  - Vehicle Inclusions: Taxable Vehicles (55,000+ lbs), Suspended Category W (Under 5,000 / 7,500 mi), Prior Year Suspended
  - Navigation: 'Back', 'Next: Vehicle Information'
- **Design & Interaction Notes:** Selecting mid-year months automatically triggers prorated tax calculation rules.

---

### 7. Wizard Step 3 — Vehicle Inventory & Fleet Grid

- **Route:** `/file/new?step=3`
- **Screen Purpose:** Step 3 of the wizard: vehicle entry table, single vehicle entry modal, and bulk CSV upload.
- **Layout Architecture:** Action bar with '+ Add Vehicle' and 'Bulk Upload CSV', categorized tabs, interactive vehicle data table.
- **Key UI Components:**
  - Category Tabs: Taxable Vehicles (with vehicle count pill), Suspended Category W, Credits, VIN Corrections
  - Action Toolbar: '+ Add Vehicle Manually', 'Bulk Upload Spreadsheet', 'Download CSV Template'
  - Vehicle Data Table: Seq #, Unit Number, 17-Char VIN, Weight Category (A-V), Logging Status, Computed Tax, Action Icons (Edit/Delete)
  - Live Financial Summary Footer: Gross Vehicle Tax, Credits Claimed, Net Balance Due to IRS
  - Validation Guard: Enforces 17 alphanumeric characters, disallows I/O/Q, and runs ISO check-digit validation
- **Design & Interaction Notes:** Supports instant sorting and filtering. Paging activates when fleet exceeds 25 trucks.

---

### 8. Wizard Step 4 — IRS Filing & Two-Stream Payment Options

- **Route:** `/file/new?step=4`
- **Screen Purpose:** Step 4 of the wizard: selects the method to pay tax liability to the US Treasury (Stream 2).
- **Layout Architecture:** Radio selection cards with conditional nested banking and guidance panels.
- **Key UI Components:**
  - E-file Election Radio: E-file (Recommended) vs. Paper return
  - IRS Tax Payment Method Options: EFW Direct Debit, EFTPS, Credit/Debit Card, Check / Money Order
  - EFW Direct Debit Panel: Full 9-digit ABA Routing Number with real-time checksum badge, Account Number, Confirm Account Number, Account Type, Debit Date
  - Mandatory IRS EFW Authorization Consent Checkbox and disclosure statement
  - EFTPS Guidance Box with direct link to EFTPS.gov
  - IRS Card Guidance Box with direct link to IRS.gov/PayByCard (explains 2-payment limit and processor fee)
  - Check/Money Order Box explaining Form 2290-V payment voucher generation and mailing instructions
- **Design & Interaction Notes:** Routing number validates live using standard ABA modulo 10 checksum algorithm.

---

### 9. Wizard Step 5 — Pricing, Packages & Value Add-Ons

- **Route:** `/file/new?step=5`
- **Screen Purpose:** Step 5 of the wizard: selects platform service pricing package (Stream 1) and optional convenience add-ons.
- **Layout Architecture:** 3-column pricing card layout, add-on checkboxes, promotional discount voucher field, itemized purchase summary.
- **Key UI Components:**
  - Pricing Cards: Per-Vehicle Tier ($7.99+), Unlimited Single Return ($139.99), Unlimited Annual ($199.99)
  - Value Add-Ons: Instant Fax of Schedule 1 to State DMV ($1.00), SMS Text Status Alerts ($1.00), Additional Email CCs
  - Promo Code Box: Input field with 'Apply' button and instant discount recalculation
  - Purchase Summary Table: Base Software Fee, Add-Ons, Discounts, Total Platform Service Fee
- **Design & Interaction Notes:** Resubmissions after rejection display '$0.00 - Free IRS Resubmission' with fee waived.

---

### 10. Wizard Step 6 — Platform Checkout & Stripe Integration

- **Route:** `/file/new?step=6`
- **Screen Purpose:** Step 6 of the wizard: collection of platform service fee via Stripe.
- **Layout Architecture:** Two-column checkout: Left column has Stripe Express Checkout + embedded card form; Right column has itemized order summary.
- **Key UI Components:**
  - Stripe Express Checkout Banner: 1-click button for Apple Pay, Google Pay, Link, and Cards via Stripe Hosted Checkout
  - Divider: 'Or pay with credit / debit card below'
  - Cardholder Name, Card Number, Expiration Month/Year, CVV/CVC, Billing Zip Code
  - Security Assurance Badges: SSL 256-Bit Encryption, PCI-DSS Level 1 Compliant
  - Action Button: 'Pay Platform Fee & Continue' (with loading state)
- **Design & Interaction Notes:** Test cards (4242...) approve in demo/sandbox; live Stripe API key handles production.

---

### 11. Wizard Step 7 — Form Summary Review & Audit

- **Route:** `/file/new?step=7`
- **Screen Purpose:** Step 7 of the wizard: comprehensive audit summary and downloadable Draft PDF preview before digital signing.
- **Layout Architecture:** Full-width summary audit sheet with downloadable Draft Form 2290 PDF button.
- **Key UI Components:**
  - Filer & Business Identification Summary
  - Tax Period & First Used Month Summary
  - Vehicle Schedule Table: VINs, Categories, Tax Amounts
  - Tax Liability Calculation Summary: Total Tax Due, Credits, Net Tax Balance
  - IRS Payment Method Summary
  - Draft PDF Preview Button: Generates instant watermarked 'DRAFT NOT FOR FILING' PDF
  - Primary Action Button: 'Submit Return to IRS' (Opens PIN Signature Modal)
- **Design & Interaction Notes:** Clear visual hierarchy prevents accidental submissions.

---

### 12. Post-Filing Corrections, Amendments & Claims Hub

- **Route:** `/post-filing`
- **Screen Purpose:** Dedicated portal for handling post-filing adjustments after original return acceptance.
- **Layout Architecture:** Card grid presenting the three post-filing workflows with statutory instructions.
- **Key UI Components:**
  - 1. Free Native VIN Correction Card: Corrects erroneous 17-char VINs against accepted Schedule 1s at $0.00 fee
  - 2. Weight Increase Amendment Card: Mid-year taxable gross weight upgrade with incremental tax calculation
  - 3. Mileage Exceeded Amendment Card: Suspended vehicles exceeding 5,000 (or 7,500) miles with tax recalculation
  - 4. Form 8849 Schedule 6 Claim Card: Direct tax refund claims for sold, destroyed, stolen, or low-mileage vehicles
  - Action Buttons on each card directing to the pre-configured wizard flow
- **Design & Interaction Notes:** Includes guidance text explaining when to amend vs. when to file a claim.

---

### 13. Standalone Public Tax Calculator

- **Route:** `/tax-calculator`
- **Screen Purpose:** Publicly accessible tool for computing prorated Form 2290 taxes and viewing deadlines without signing in.
- **Layout Architecture:** Interactive single-page calculator card with dynamic results panel.
- **Key UI Components:**
  - Tax Period Selector (Current vs Prior Tax Years)
  - First Used Month Dropdown (July through June)
  - Taxable Gross Weight Category Dropdown (A: 55,000 lbs to V: Over 75,000 lbs)
  - Logging Vehicle Checkbox (Applies 25% statutory tax reduction)
  - Vehicle Count Input (Multiplies tax for fleet estimations)
  - Calculated Results Card: Displays Total Annual Tax, Monthly Prorated Tax, and Statutory Filing Deadline
  - Call-to-Action Button: 'Start E-Filing This Return' (directs to /file/new)
- **Design & Interaction Notes:** Serves as an effective SEO and user acquisition funnel.

---

### 14. Admin & IRS MeF Gateway Console

- **Route:** `/admin`
- **Screen Purpose:** Super-admin console for monitoring IRS MeF transmission pipeline, audit logs, and queue behavior.
- **Layout Architecture:** Admin control panel with transmission pipeline status cards, queue manager, and simulator toggles.
- **Key UI Components:**
  - Simulator Mode Selector: AUTO_ACCEPT, MANUAL_REVIEW, AUTO_REJECT, GATEWAY_OUTAGE
  - Pending Filings Queue Table: Lists all returns awaiting MeF transmission or manual review
  - Manual Review Actions: 'Accept Return' (generates watermarked Schedule 1) or 'Reject Return' (with reject code)
  - Rejection Code Dictionary Dropdown: F2290-001 (Name Control mismatch), R0000-900-01 (EIN issue), etc.
  - Transmission Audit Log: Live chronological event stream recording all system actions, IP addresses, and timestamps
  - Reseed Demo Database Action Button
- **Design & Interaction Notes:** Restricted to users with role = 'ADMIN'.

---

