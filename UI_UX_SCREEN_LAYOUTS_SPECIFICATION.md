# UI/UX Screen Layouts & Web Design Specifications
## IRS Form 2290 (HVUT) Commercial Web Application

**Document Version:** 2.0 (Design & Frontend Procurement Blueprint)  
**Target Audience:** UI/UX Designers, Web Designers, Frontend Developers, Design System Leads  
**Purpose:** Comprehensive visual screen layout blueprints, wireframe architectures, design tokens, and component specifications.

---

## 1. Global Design System & Style Tokens

### 1.1 Color Palette
- **Primary Federal Navy:** `#1e3a8a` (Brand authority, headers, key badges)
- **Primary Action Blue:** `#0073b7` (Buttons, active tabs, clickable links)
- **Accent Purple / Stripe:** `#635bff` (Express checkout, payment highlights)
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

## 2. Complete Screen-by-Screen Layout Specifications

### 1. User Registration & Account Creation

- **Route:** `/register`
- **Screen Purpose:** Allows owner-operators, fleet managers, and CPAs to register an account with role selection.
- **Layout Architecture:** Centered card layout (max-w-md), header with IRS-HVUT federal shield branding, clean form field grouping.
- **Key UI Components:**
  - Role Selector (Owner Operator / Fleet Manager / Tax Preparer CPA)
  - First Name & Last Name (2-column grid)
  - Email Address (RFC 5322 validation, unique constraint)
  - Phone Number (with US formatting mask)
  - Password & Confirm Password (strength indicator: min 8 chars, 1 uppercase, 1 number)
  - Terms of Service & Privacy Policy agreement checkbox
  - Primary Action Button: 'Create Account' (Blue #0073b7)
  - Secondary Link: 'Already have an account? Sign In'
- **Design & Interaction Notes:** Mobile-responsive single column on screens < 640px. Auto-focus on First Name field.

---

### 2. Business Entity Profile Setup (Onboarding)

- **Route:** `/businesses/new?onboarding=1`
- **Screen Purpose:** Mandatory first-time onboarding step to establish the legal taxpayer identity and federal EIN.
- **Layout Architecture:** Multi-section card layout with instructional guidance alert at the top.
- **Key UI Components:**
  - Employer Identification Number (EIN): 9-digit format with automated hyphen insertion (XX-XXXXXXX)
  - IRS Name Control Box: Auto-generated 4-character uppercase string with override checkbox
  - Legal Business Name & DBA / Trade Name
  - Business Type Dropdown (LLC, Corporation, Partnership, Sole Proprietorship, Non-Profit)
  - Physical Address (Address Line 1, Suite/Unit, City, State dropdown, 5-digit Zip Code)
  - Signing Authority Details (Authorized Officer Name, Title e.g. 'President/Owner', Daytime Phone, Email)
  - Action Buttons: 'Save & Continue to Filing' (Primary), 'Cancel'
- **Design & Interaction Notes:** EIN input triggers immediate pre-submission validation. Red warning if SSN-like prefix (00, 66) is detected.

---

### 3. Main Customer Dashboard & Vault

- **Route:** `/dashboard`
- **Screen Purpose:** Central command center for managing filings, fleet vehicles, tax alerts, and document downloads.
- **Layout Architecture:** Top app navigation bar, active business profile summary banner, action toolbar, filterable returns table.
- **Key UI Components:**
  - Business Context Switcher: Dropdown to toggle between multiple client businesses (essential for CPAs)
  - Action Toolbar: 'Start New Form 2290', 'Carry Forward Fleet', 'Add Vehicle', 'Tax Calculator'
  - Filing Summary Table: Tax Year, Form Type, Return ID, Vehicle Count, Filing Date, Status Badge, PDF Actions
  - Status Badges: Accepted (Blue/Green), Transmitted (Amber), Editing After Reject (Rose), Paid (Indigo)
  - Sync Status Button: Real-time query to IRS MeF gateway with loading spinner animation
  - Action Icons: Edit / Resume Return, Download Form 2290 PDF, Download Watermarked Schedule 1 PDF, 2290-V Voucher, Inspect MeF XML
- **Design & Interaction Notes:** Empty state shows guided illustration directing user to create their first return or upload fleet.

---

### 4. Step 1 — Get Started (Form Type & Period)

- **Route:** `/file/new?step=1`
- **Screen Purpose:** Initial wizard step to select the filing return type, tax period, and business entity.
- **Layout Architecture:** Top 8-step horizontal wizard stepper, 2-column selection grid, IRS legal disclosure card.
- **Key UI Components:**
  - Wizard Stepper: 1. Get Started (Active) -> 2. Tax Options -> 3. Vehicle Info -> 4. IRS Options -> 5. Pricing -> 6. Checkout -> 7. Summary -> 8. Finish
  - Tax Year Dropdown: Standard '2026-2027 (July 1, 2026 - June 30, 2027)'
  - Form Type Radio Cards: Form 2290 Original, Form 2290 Amendment, Form 2290 VIN Correction, Form 8849 Schedule 6
  - Filer Options: Checkbox for 'Address Change', Checkbox for 'Final Return (Ceased Operations)'
  - Business Selector: Displays chosen legal name, masked EIN, and physical address
  - Action Buttons: 'Next: Reporting Vehicles' (Primary #0073b7), 'Save Draft'
- **Design & Interaction Notes:** Changing form type dynamically configures downstream steps (e.g. VIN correction skips pricing).

---

### 5. Step 2 — Reporting Vehicles & First Used Month

- **Route:** `/file/new?step=2`
- **Screen Purpose:** Captures the operational timeline (First Used Month) and types of vehicles reported on this return.
- **Layout Architecture:** Card container with month picker and category checkboxes.
- **Key UI Components:**
  - Month of First Use (FUM) Dropdown: July through June
  - Statutory Deadline Banner: Computes and displays exact filing due date (e.g. 'Due by August 31, 2026')
  - Vehicle Inclusions Checkboxes: Taxable Vehicles (55k+ lbs), Suspended Vehicles (Category W), Credit Vehicles, Prior Year Suspended
  - Navigation: 'Back', 'Next: Vehicle Information'
- **Design & Interaction Notes:** Countdown pill highlights urgency if due date is within 10 days.

---

### 6. Step 3 — Vehicle Information & Fleet Grid

- **Route:** `/file/new?step=3`
- **Screen Purpose:** Primary data entry grid where users enter individual trucks or review uploaded fleets.
- **Layout Architecture:** Action bar with 'Add Vehicle' and 'Bulk Upload' buttons, categorized tabs, responsive data table, running tax tally footer.
- **Key UI Components:**
  - Category Tabs: Taxable Vehicles (Count badge), Suspended Vehicles, Credits, VIN Corrections
  - Action Buttons: '+ Add Vehicle Manually', 'Upload CSV Spreadsheet', 'Export Template'
  - Vehicle Table Columns: Seq #, Unit #, 17-Char VIN, Weight Category (A-V), Logging (Yes/No), Computed Tax, Actions (Edit/Delete)
  - Running Financial Tally Card: Gross Vehicle Tax, Credits Claimed, Net Tax Due to IRS
  - Validation Callout: Real-time duplicate VIN detection and ISO check digit warning flags
- **Design & Interaction Notes:** Table supports inline sorting and filtering. Paging activates when fleet exceeds 25 vehicles.

---

### 7. Step 3b — Add Taxable Vehicle Modal

- **Route:** `/file/new (Modal)`
- **Screen Purpose:** Modal dialog for adding or editing an individual vehicle.
- **Layout Architecture:** Centered modal overlay with backdrop blur, 2-column form.
- **Key UI Components:**
  - Unit / Truck Number (Optional reference for fleet managers)
  - 17-Character VIN Input: Uppercase transformation, forbidden character guard (no I, O, Q)
  - Taxable Gross Weight Category Dropdown (A: 55,000 lbs to V: Over 75,000 lbs)
  - Logging Vehicle Checkbox (Applies statutory 25% tax discount)
  - Agricultural Vehicle Checkbox (Applies 7,500 mile suspended threshold)
  - Dynamic Calculated Tax Display: Shows instant prorated dollar amount
  - Modal Actions: 'Add Vehicle to Return', 'Cancel'
- **Design & Interaction Notes:** Modal closes on ESC key or backdrop click with unsaved changes prompt.

---

### 8. Step 3c — Bulk CSV Upload Screen

- **Route:** `/file/new (CSV Drawer)`
- **Screen Purpose:** Enables fleet managers to upload hundreds of vehicles in seconds via spreadsheet.
- **Layout Architecture:** Drag-and-drop file upload zone, downloadable sample CSV template, preview error resolution table.
- **Key UI Components:**
  - Drag-and-Drop Dropzone: Supports .csv, .xlsx
  - Sample CSV Template Download link
  - Interactive Validation Grid: Highlights missing fields or invalid VINs in red
  - Inline Correction: Filer can fix invalid VINs directly in the grid without re-uploading
  - Action Buttons: 'Import Valid Vehicles', 'Clear'
- **Design & Interaction Notes:** Client-side parsing via PapaParse ensures instantaneous processing of 1,000+ rows.

---

### 9. Step 4 — IRS Filing & Payment Options (Stream 2)

- **Route:** `/file/new?step=4`
- **Screen Purpose:** Captures how the taxpayer wants to pay their actual tax liability to the US Treasury.
- **Layout Architecture:** Radio selection cards with conditional dynamic nested form panels.
- **Key UI Components:**
  - E-file Method Selection (E-file vs Paper)
  - Third-Party Designee Checkbox (Name, Phone, 5-digit PIN)
  - IRS Payment Method Radio Group: EFW Direct Debit, EFTPS, Credit/Debit Card, Check/Voucher
  - EFW Banking Form: 9-Digit ABA Routing Number (with live checksum badge), Account Number, Confirm Account Number, Account Type (Checking/Savings), Debit Date
  - Mandatory IRS EFW Authorization Consent Checkbox
  - EFTPS Guidance Box with direct link to EFTPS.gov
  - Credit Card Guidance Box with direct link to IRS.gov/PayByCard
  - Check Guidance Box explaining Form 2290-V voucher mailing instructions
- **Design & Interaction Notes:** Routing number validates live using standard ABA modulo 10 checksum algorithm.

---

### 10. Step 5 — Pricing, Packages & Value Add-Ons

- **Route:** `/file/new?step=5`
- **Screen Purpose:** Platform service pricing selection, packages, and optional convenience add-ons.
- **Layout Architecture:** 3-column pricing card layout, add-on checkboxes, promotional discount voucher field.
- **Key UI Components:**
  - Pricing Cards: Per-Vehicle Tier ($7.99+), Unlimited Single Return ($139.99), Unlimited Annual ($199.99)
  - Active Selection Highlight with radio selector
  - Add-On Options: Fax Schedule 1 to State DMV ($1.00), SMS Text Alerts ($1.00), Email CCs
  - Promo Code Box: Input field with 'Apply' button and instant discount recalculation
  - Order Summary Table: Base Fee, Add-Ons, Discounts, Final Platform Fee
- **Design & Interaction Notes:** Resubmissions after rejection display '$0.00 - Free IRS Resubmission' with fee waived.

---

### 11. Step 6 — Platform Service Fee Checkout (Stripe)

- **Route:** `/file/new?step=6`
- **Screen Purpose:** Secure collection of platform service revenue (Stream 1) via Stripe.
- **Layout Architecture:** Two-column checkout: Left column has Stripe Express Checkout + embedded card form; Right column has itemized order summary.
- **Key UI Components:**
  - Stripe Express Checkout Banner: 1-click button for Apple Pay, Google Pay, Link, and Cards via Stripe Hosted Checkout
  - Divider: 'Or pay with credit / debit card below'
  - Cardholder Name, Card Number, Expiration Month/Year, CVV/CVC, Billing Zip Code
  - Security Assurance Badges: SSL 256-Bit Encryption, PCI-DSS Level 1 Compliant
  - Action Button: 'Pay Platform Fee & Continue' (with loading state)
- **Design & Interaction Notes:** Test cards (4242...) approve in demo/sandbox; live Stripe API key handles production.

---

### 12. Step 7 — Form Summary Review & PDF Audit

- **Route:** `/file/new?step=7`
- **Screen Purpose:** Final review screen allowing the filer to inspect all return figures before signing.
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

### 13. Step 8a — Electronic PIN Signature Modal

- **Route:** `/file/new (PIN Modal)`
- **Screen Purpose:** Legally binding digital signature under IRS penalties of perjury.
- **Layout Architecture:** Centered high-contrast modal with official IRS jurat statement.
- **Key UI Components:**
  - Official IRS Declaration: 'Under penalties of perjury, I declare that I have examined this return...'
  - Signer Name & Title (pre-populated from business profile)
  - 5-Digit Personal Identification Number (PIN) Input (e.g. 12345, cannot be 00000)
  - Date of Signature (Auto-set to current date)
  - Action Button: 'Sign & Transmit Return to IRS' (Triggers IRS MeF submission)
- **Design & Interaction Notes:** PIN input is masked with numeric-only keyboard on mobile devices.

---

### 14. Step 8b — Transmission Status & Schedule 1 Vault

- **Route:** `/file/new?step=8`
- **Screen Purpose:** Live transmission status tracker and delivery portal for the official stamped Schedule 1.
- **Layout Architecture:** Success banner, status stepper timeline, document download cards.
- **Key UI Components:**
  - IRS Submission ID Pill (e.g. 'TB-SUB-2026-98124')
  - Status Stepper: Validated -> Paid -> Transmitted -> IRS Accepted
  - Live Status Message: 'Your return has been accepted by the IRS!'
  - Document Download Buttons: 'Download Official Stamped Schedule 1 PDF' (Primary Blue), 'Download Form 2290 Copy', 'Download Form 2290-V Voucher'
  - Receipt & Confirmation details for accounting
  - Secondary Button: 'Return to Dashboard'
- **Design & Interaction Notes:** If return is in progress, polling animation pings the server until acceptance occurs.

---

### 15. Official IRS Stamped Schedule 1 Document

- **Route:** `/api/filings/:id/schedule1 (PDF View)`
- **Screen Purpose:** The final deliverable required by State DMVs and DOT/IFTA registration offices.
- **Layout Architecture:** Standard 8.5 x 11 inch PDF document, Copy A & Copy B, official IRS digital watermark.
- **Key UI Components:**
  - Official IRS Form 2290 Schedule 1 Header
  - Taxpayer Name, Masked EIN, Address
  - Taxable Vehicle VIN List & Category letters
  - Official Digital IRS Watermark Stamp: 'IRS e-file - RECEIVED / DATE / INTERNAL REVENUE SERVICE'
  - State DMV validation barcode & receipt identifier
- **Design & Interaction Notes:** Rendered via pdf-lib with exact IRS font, comb characters, and navy ink.

---

### 16. Amendment — Increase in Taxable Gross Weight

- **Route:** `/file/new?formType=2290_AMEND&amendReason=WEIGHT_INCREASE`
- **Screen Purpose:** Specialized amendment flow when a truck moves to a heavier weight category mid-year.
- **Layout Architecture:** Amendment comparison card showing previous vs new weight categories.
- **Key UI Components:**
  - Vehicle VIN Selector
  - Prior Taxable Gross Weight Category (e.g. Category A - 55,000 lbs)
  - New Taxable Gross Weight Category (e.g. Category V - Over 75,000 lbs)
  - Month Weight Increased Dropdown
  - Incremental Prorated Tax Calculation: Calculates only the net difference owed
  - Submit Amendment Button
- **Design & Interaction Notes:** Prevents double taxation by automatically subtracting previously paid taxes.

---

### 17. Amendment — Suspended Vehicle Exceeded Mileage

- **Route:** `/file/new?formType=2290_AMEND&amendReason=MILEAGE_EXCEEDED`
- **Screen Purpose:** Specialized amendment flow when a Category W vehicle exceeds 5,000 (or 7,500) miles.
- **Layout Architecture:** Warning callout card with vehicle selector and mileage reporting date.
- **Key UI Components:**
  - Suspended Vehicle Selector
  - Month Mileage Limit Exceeded Dropdown
  - Full Taxable Category Selector
  - Tax Computation Notice: Tax calculated from original first-used month per IRS rules
  - Submit Amendment Button
- **Design & Interaction Notes:** Alert banner clearly cites Title 26 IRS statutory requirement.

---

### 18. Form 8849 Schedule 6 — Refund Claims

- **Route:** `/file/new?formType=8849_SCH6`
- **Screen Purpose:** Direct refund claim submission for sold, destroyed, or low-mileage vehicles.
- **Layout Architecture:** Claim type tabs, vehicle casualty input form, explanation textarea.
- **Key UI Components:**
  - Claim Type Selector: Sold / Destroyed / Stolen, Low Mileage Prior Year, Overpayment
  - Date of Disposition / Casualty Date Picker
  - Purchaser Name & Address (if sold)
  - Detailed Explanation Textarea (Mandatory for IRS review)
  - Claim Amount Calculation: Prorated refund based on casualty month
  - Submit Claim to IRS Button
- **Design & Interaction Notes:** Validates that claim amount does not exceed original tax paid.

---

