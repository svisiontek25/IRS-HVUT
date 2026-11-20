# IRS-HVUT v1.1: Complete Application Screen Flow & End-to-End User Interaction Workflow Specification

> **Document Type:** Comprehensive UI/UX Wireframe, Screen Inventory & Interactive Action-State Workflow Specification  
> **Target Audience:** Software Development Agency, UI/UX Designers, Frontend/Backend Engineers, QA Testers  
> **Application Version:** IRS-HVUT v1.1 (IRS Form 2290 Heavy Highway Vehicle Use Tax Platform)  
> **Revision:** July 2026 IRS Modernized e-File (MeF) Release  
> **PDF Version:** Saved alongside this document as [COMPLETE_APPLICATION_WORKFLOW_AND_SCREEN_SPECIFICATION.pdf](COMPLETE_APPLICATION_WORKFLOW_AND_SCREEN_SPECIFICATION.pdf)

---

## 1. Executive Summary & Document Purpose

This document provides an **exhaustive, screen-by-screen visual and functional blueprint** of the entire **IRS-HVUT v1.1** web application. It includes **all 16 distinct screens** across both pre-authentication and post-authentication states.

For every single screen, this specification details:
1. **Authentic Screen Layout Capture** from the live running application.
2. **Access Tier & Pre-Conditions** (How the user arrives on this screen).
3. **Screen Layout & Component Inventory**.
4. **Complete User Interaction Workflow Matrix ("What Happens When User Takes Any Action")** covering every button, link, form input, dropdown, validation rule, API call, loading state, error condition, and next destination.
5. **State Transition Diagram** illustrating the end-to-end user journey.

---

## 2. End-to-End Application State Machine & User Journey

The diagram below outlines the complete screen flow and decision tree:

```mermaid
flowchart TD
    SCR01["SCR-01: Homepage (/)"] -->|Click Register| SCR02["SCR-02: Register (/register)"]
    SCR01 -->|Click Sign In| SCR03["SCR-03: Sign In (/login)"]
    SCR01 -->|Click Calculator| SCR04["SCR-04: Tax Calculator (/tax-calculator)"]
    SCR01 -->|Click User Guide| SCR05["SCR-05: User Guide (/user-guide)"]

    SCR02 -->|Create Account| SCR06["SCR-06: Business Profile (/businesses/new)"]
    SCR03 -->|Sign In (No Biz)| SCR06
    SCR03 -->|Sign In (Has Biz)| SCR07["SCR-07: Dashboard (/dashboard)"]
    SCR03 -->|Sign In (Admin)| SCR16["SCR-16: Admin Console (/admin)"]

    SCR06 -->|Save Business| SCR07

    SCR07 -->|Start New Return| SCR08["SCR-08: Wizard Step 1: Setup (/file/new?step=1)"]
    SCR07 -->|Sync IRS Status| API_SYNC["API: Sync MeF Status"]
    SCR07 -->|Download Schedule 1| PDF_S1["Download Stamped Schedule 1 PDF"]
    SCR07 -->|Edit Business| SCR06

    SCR08 -->|Next| SCR09["SCR-09: Wizard Step 2: Categories (/file/new?step=2)"]
    SCR09 -->|Next| SCR10["SCR-10: Wizard Step 3: Vehicles (/file/new?step=3)"]
    SCR10 -->|Next| SCR11["SCR-11: Wizard Step 4: IRS Options (/file/new?step=4)"]
    SCR11 -->|Next| SCR12["SCR-12: Wizard Step 5: Pricing (/file/new?step=5)"]
    SCR12 -->|Next| SCR13["SCR-13: Wizard Step 6: Checkout (/file/new?step=6)"]
    SCR13 -->|Card Charged| SCR14["SCR-14: Wizard Step 7: Review & Transmit (/file/new?step=7)"]
    
    SCR14 -->|Transmit to IRS| SCR15["SCR-15: Post-Filing Tracker (/post-filing)"]
    SCR15 -->|Accepted| PDF_S1
    SCR15 -->|Back to Dashboard| SCR07
```

---

## 3. Screen-by-Screen Layout & Action Workflow

### SCR-01: Public Landing / Homepage

- **Route URL:** `/`
- **Access Tier:** Public (Guest / All Users)
- **Pre-condition / Entry Point:** Direct entry via web domain root URL, or clicking "Home" in top navigation.
- **Summary:** Serves as the high-converting marketing, product overview, and instant onboarding portal. Features the federal-blue hero banner, instant filing CTA, pricing transparency ($7.99/filing), quick login widget, and trust badges.

![Public Landing / Homepage](public/app-screens/hvut-01-home.png)

#### Interactive Action Matrix (What Happens When User Takes Any Action)

| UI Element / Control | Element Type | User Trigger | System Action, Validation & State Transition |
|---|---|---|---|
| **Register Free Account Button** | Primary CTA Button (Amber) | `Click` | Redirects to /register to initiate new user account creation. |
| **Sign In Link / Button** | Secondary Navigation Button | `Click` | Redirects to /login. |
| **Tax Calculator Navigation Link** | Header Navigation Link | `Click` | Navigates to /tax-calculator for instant gross vehicle tax estimates. |
| **Quick Sign-In Card** | Interactive Inline Form | `Submit with Email & Password` | Calls /api/auth/login. On success: sets active session and routes to /dashboard (or /businesses/new if first-time user). On error: displays red alert. |
| **Start Form 2290 Now Button** | Hero Call-to-Action | `Click` | If authenticated: routes to /file/new?step=1. If unauthenticated: routes to /register. |
| **IRS Compliance Badge** | Trust Indicator | `View` | Displays official "IRS Authorized e-File Provider · Rev. July 2026" verification seal. |

- **Next Destination:** User clicks Register -> /register; User logs in -> /dashboard or /businesses/new; User clicks Calculator -> /tax-calculator.

---

### SCR-02: User Registration & Account Creation

- **Route URL:** `/register`
- **Access Tier:** Public (Guest)
- **Pre-condition / Entry Point:** User clicked "Register Free Account" from Homepage or Header Navigation.
- **Summary:** Captures essential account credentials for truck owners, fleet managers, and CPAs. Features client-side validation, password security meter, and automatic role assignment.

![User Registration & Account Creation](public/app-screens/hvut-02-register.png)

#### Interactive Action Matrix (What Happens When User Takes Any Action)

| UI Element / Control | Element Type | User Trigger | System Action, Validation & State Transition |
|---|---|---|---|
| **First Name & Last Name Inputs** | Text Inputs | `Type` | Captures full legal identity. Minimum 2 characters each. |
| **Email Address Input** | Email Input | `Type & Blur` | Validates RFC 5322 email syntax; checks for existing registered account. |
| **Cell / Contact Phone Input** | Tel Input | `Type` | Formats US 10-digit telephone (XXX-XXX-XXXX). |
| **Password & Confirm Password** | Password Inputs | `Type` | Enforces minimum 8 characters, at least 1 digit and 1 special symbol. Real-time match validation. |
| **Terms of Service Checkbox** | Checkbox | `Click` | Mandatory consent. If unchecked, submission button remains disabled. |
| **Create Free Account Button** | Primary Submit Button (Blue) | `Click / Submit` | Sends POST to /api/auth/register. Automatically creates user record, initializes session in localStorage, and navigates immediately to /businesses/new?onboarding=1. |
| **Already have an account? Sign in** | Text Link | `Click` | Navigates to /login. |

- **Next Destination:** Successful account creation -> /businesses/new?onboarding=1; Existing user link -> /login.

---

### SCR-03: Secure User Sign-In / Login

- **Route URL:** `/login`
- **Access Tier:** Public (Guest)
- **Pre-condition / Entry Point:** User clicked "Sign In" from header or was redirected from a protected route.
- **Summary:** Authenticates returning carriers and tax professionals with email/password credentials or demo quick-fill profiles for testing.

![Secure User Sign-In / Login](public/app-screens/hvut-03-login.png)

#### Interactive Action Matrix (What Happens When User Takes Any Action)

| UI Element / Control | Element Type | User Trigger | System Action, Validation & State Transition |
|---|---|---|---|
| **Email Address Field** | Email Input | `Type` | Accepts registered email (e.g. sandeep@gmail.com). |
| **Password Field** | Password Input with Eye Toggle | `Type / Toggle Visibility` | Hides/unmasks characters. Validates against database. |
| **Sign In Button** | Primary Submit Button (Blue) | `Click / Submit` | Calls POST /api/auth/login. On success: sets irs_hvut_active_user in localStorage, loads business profiles. If role=ADMIN -> /admin; if has business -> /dashboard; if no business -> /businesses/new. |
| **Forgot Password Link** | Action Link | `Click` | Opens password recovery modal to send reset link to email. |
| **Quick Demo Switcher Buttons** | Developer / QA Buttons | `Click` | Pre-fills credentials for Owner Operator, Fleet Manager, CPA, or Admin for instant 1-click evaluation. |

- **Next Destination:** Valid credentials -> /dashboard (or /businesses/new if no business profile); Invalid -> inline error alert.

---

### SCR-04: Standalone HVUT Tax Estimator / Calculator

- **Route URL:** `/tax-calculator`
- **Access Tier:** Public (No login required)
- **Pre-condition / Entry Point:** User clicked "Tax Calculator" in header or footer.
- **Summary:** Public utility that calculates exact IRS Form 2290 tax liability without needing an account. Supports prorated months, logging discounts, and vehicle weight categories A through V.

![Standalone HVUT Tax Estimator / Calculator](public/app-screens/hvut-04-tax-calculator.png)

#### Interactive Action Matrix (What Happens When User Takes Any Action)

| UI Element / Control | Element Type | User Trigger | System Action, Validation & State Transition |
|---|---|---|---|
| **Tax Year Dropdown** | Select Dropdown | `Select` | Selects tax period (e.g. July 2026 – June 2027). |
| **Month of First Use Dropdown** | Select Dropdown | `Select` | Calculates prorated factor: July = 12/12 (100%), August = 11/12, down to June = 1/12. |
| **Logging / Forestry Vehicle Toggle** | Checkbox | `Toggle` | Applies IRS statutory 25% logging reduction rate. |
| **Vehicle Weight Category Selector** | Dropdown / Slider (A–V) | `Change` | Selects gross weight bracket (55,000 lbs up to 75,000+ lbs). |
| **Calculated Tax Liability Card** | Live Computed Metric | `Auto-update` | Displays exact dollar amount ($100.00 to $550.00 prorated). |
| **Start Filing Form 2290 Now Button** | Call to Action Button | `Click` | If logged in: transfers values to /file/new?step=1. If not logged in: transfers to /login?returnTo=/file/new. |

- **Next Destination:** Click Start Filing -> /file/new (or /login).

---

### SCR-05: User Guide & Interactive Knowledge Base

- **Route URL:** `/user-guide`
- **Access Tier:** Public / Authenticated
- **Pre-condition / Entry Point:** User clicked "User Guide" in navigation.
- **Summary:** Educational multi-step guide explaining IRS Form 2290 filing requirements, Schedule 1 issuance, VIN corrections, amendments, and IRS refund claim schedules.

![User Guide & Interactive Knowledge Base](public/app-screens/hvut-05-user-guide.png)

#### Interactive Action Matrix (What Happens When User Takes Any Action)

| UI Element / Control | Element Type | User Trigger | System Action, Validation & State Transition |
|---|---|---|---|
| **Category Navigation Pills** | Tab Bar | `Click` | Switches between "2290 e-file", "Amendments", "VIN Corrections", and "Form 8849 Schedule 6". |
| **Interactive Slide Deck Carousel** | Step Carousel | `Next / Previous Arrows` | Browses sequentially through each filing phase with visual reference slides and instructions. |
| **Start e-File For This Category Button** | Deep-Link CTA | `Click` | Navigates directly into wizard with preselected formType parameter. |

- **Next Destination:** Click Start e-File -> /file/new?formType=...; Click Home -> /.

---

### SCR-06: Business Entity Profile & Signing Authority Manager

- **Route URL:** `/businesses/new`
- **Access Tier:** Authenticated Client / CPA
- **Pre-condition / Entry Point:** First-time user after registration (/businesses/new?onboarding=1) or clicking "+ Add Business" / "Edit Business" on Dashboard.
- **Summary:** Manages legal business identity, IRS 9-digit EIN, IRS Name Control, physical street address, and IRS Signing Authority declaration with 5-digit filing PIN.

![Business Entity Profile & Signing Authority Manager](public/app-screens/hvut-06-business-edit.png)

#### Interactive Action Matrix (What Happens When User Takes Any Action)

| UI Element / Control | Element Type | User Trigger | System Action, Validation & State Transition |
|---|---|---|---|
| **Legal Business Name Input** | Text Input | `Type` | Accepts registered business name (e.g. SVISIONTEK). Automatically extracts first 4 letters as default Name Control. |
| **Employer Identification Number (EIN)** | Formatted Text Input | `Type` | Enforces 9-digit federal format (XX-XXXXXXX). Validates EIN presence. |
| **IRS Name Control Field** | 4-Character Uppercase Input | `Type / Override` | Matches official IRS CP-575 EIN letter (e.g. SVIS). Crucial for preventing MeF rejection R0000-900-01. |
| **Business Type Dropdown** | Select Dropdown | `Select` | Sole Proprietor, LLC, C-Corporation, S-Corporation, Partnership, Government. |
| **Physical Address, City, State, ZIP** | Address Form Block | `Type` | USPS street address and 5-digit ZIP. |
| **Signing Authority Name, Title, Phone** | Contact Inputs | `Type` | Authorized corporate officer or owner operator signing the return. |
| **5-Digit IRS E-File PIN Input** | Numeric 5-Digit Input | `Type` | Taxpayer personal identification number used as digital signature for IRS transmission. |
| **Save & Continue to Dashboard Button** | Primary Submit Button | `Click / Submit` | Validates inputs, commits business to database, sets as active business, and redirects to /dashboard. |
| **Cancel / Back to Dashboard Link** | Secondary Link | `Click` | Aborts edits and returns to /dashboard. |

- **Next Destination:** Save successful -> /dashboard with active business selected; Validation error -> inline error flags.

---

### SCR-07: Client Return Dashboard (Return Central)

- **Route URL:** `/dashboard`
- **Access Tier:** Authenticated Client / CPA
- **Pre-condition / Entry Point:** User logs in or finishes business profile creation.
- **Summary:** The primary operations command center. Allows switching between business entities, initiating new returns, monitoring live IRS filing status, viewing XML payloads, downloading official IRS-watermarked Schedule 1 PDFs, and resolving rejections.

![Client Return Dashboard (Return Central)](public/app-screens/hvut-07-dashboard.png)

#### Interactive Action Matrix (What Happens When User Takes Any Action)

| UI Element / Control | Element Type | User Trigger | System Action, Validation & State Transition |
|---|---|---|---|
| **My Business Selector Dropdown** | Entity Switcher Select | `Change Selection` | Switches active business entity (e.g. SVISIONTEK). Instantly filters returns and vehicle fleet data. |
| **Edit Business Link** | Secondary Action Button | `Click` | Navigates to /businesses/new?editBusinessId=... to update EIN, address, or signing officers. |
| **Add Business Link** | Secondary Action Button | `Click` | Navigates to /businesses/new to register an additional company profile. |
| **Carry-Forward Fleet Button** | Automation Button | `Click` | Copies all registered VINs and categories from prior tax year into a new current-year draft return with 1 click. |
| **Start My New Return Button** | Primary Action CTA (Blue) | `Click` | Creates a new draft filing record and launches Wizard Step 1 (/file/new?step=1). |
| **Return Summary Table** | Data Grid | `View` | Lists all filings: Return ID, Form Type, Return Date, Status Badge, Filing Method, Actions, and PDF links. |
| **Sync IRS Status Button** | Table Action Button | `Click` | Calls /api/filings/{id}/sync-status. Connects to IRS MeF gateway, updates status, and displays toast notification. |
| **Schedule 1 (Watermarked PDF) Button** | Download Link (Green) | `Click` | Downloads official IRS-watermarked Schedule 1 PDF document with digital acceptance stamp and DMV barcode. |
| **View Summary PDF Link** | Download Link | `Click` | Downloads complete Form 2290 return summary worksheet. |
| **View MeF XML Modal Trigger** | Technical Inspection Button | `Click` | Opens modal showing the exact schema-validated XML payload transmitted to IRS. |

- **Next Destination:** Click "Start My New Return" -> /file/new?step=1; Click "Schedule 1" -> Downloads PDF; Click "Edit Business" -> /businesses/new.

---

### SCR-08: Filing Wizard Step 1: Get Started / Return Setup

- **Route URL:** `/file/new?step=1`
- **Access Tier:** Authenticated Client
- **Pre-condition / Entry Point:** User clicked "Start My New Return" on Dashboard or "Edit" on a draft filing.
- **Summary:** Configures return foundation: active business verification, tax year selection (2026-2027), return type (Original Form 2290, Amendment, VIN Correction), First Used Month, and special return flags.

![Filing Wizard Step 1: Get Started / Return Setup](public/app-screens/hvut-08-wizard-step1-get-started.png)

#### Interactive Action Matrix (What Happens When User Takes Any Action)

| UI Element / Control | Element Type | User Trigger | System Action, Validation & State Transition |
|---|---|---|---|
| **Active Business Entity Card** | Display Banner | `View` | Displays selected business name, EIN, and IRS Name Control. |
| **Tax Year Dropdown** | Select Dropdown | `Select` | Sets tax period. Defaults to current statutory year (July 2026 – June 2027). |
| **Return Type Selector** | Radio Group | `Select` | Options: Form 2290 Tax Return, Amendment (Mileage Exceeded), Amendment (Weight Increase), VIN Correction. |
| **First Used Month Dropdown** | Select Dropdown | `Select` | Month vehicle first operated on public highways during the tax year. Dynamically updates prorated months calculation. |
| **Final Return Checkbox** | Checkbox | `Toggle` | Flags return as final if taxpayer went out of business or ceased operations. |
| **Address Change Checkbox** | Checkbox | `Toggle` | Notifies IRS of official business address update. |
| **Next: Reporting Vehicles Button** | Primary Action Button (Blue) | `Click` | Validates selections, saves draft filing to SQLite database, advances to Step 2. |
| **Save as Draft & Exit Link** | Secondary Link | `Click` | Persists current state and returns user safely to Dashboard. |

- **Next Destination:** Click "Next" -> /file/new?step=2; Click "Save as Draft" -> /dashboard.

---

### SCR-09: Filing Wizard Step 2: Reporting Vehicles / Category Selection

- **Route URL:** `/file/new?step=2`
- **Access Tier:** Authenticated Client
- **Pre-condition / Entry Point:** Completed Step 1 or clicked Step 2 tab in wizard breadcrumb.
- **Summary:** Determines the vehicle fleet composition for this return by enabling Taxable vehicles, Suspended / exempt vehicles (Category W), and prior year credit claims.

![Filing Wizard Step 2: Reporting Vehicles / Category Selection](public/app-screens/hvut-09-wizard-step2-reporting-vehicles.png)

#### Interactive Action Matrix (What Happens When User Takes Any Action)

| UI Element / Control | Element Type | User Trigger | System Action, Validation & State Transition |
|---|---|---|---|
| **Taxable Vehicles Checkbox** | Category Toggle Card | `Click` | Enables reporting of heavy highway motor vehicles with taxable gross weight >= 55,000 lbs. |
| **Suspended Vehicles Checkbox (Category W)** | Category Toggle Card | `Click` | Enables reporting of vehicles expected to be operated 5,000 miles or less (7,500 miles for agricultural vehicles). No tax due, but Schedule 1 required. |
| **Claiming Credits Checkbox** | Category Toggle Card | `Click` | Enables credit deductions for vehicles sold, destroyed, stolen, or driven under mileage limit in prior year. |
| **Next: Vehicle Information Button** | Primary Action Button (Blue) | `Click` | Stores vehicle configuration choices and navigates to Step 3. |
| **Back to Step 1 Button** | Secondary Button | `Click` | Navigates back to Step 1 without data loss. |

- **Next Destination:** Click "Next" -> /file/new?step=3; Click "Back" -> /file/new?step=1.

---

### SCR-10: Filing Wizard Step 3: Vehicle Information & Fleet Manager

- **Route URL:** `/file/new?step=3`
- **Access Tier:** Authenticated Client
- **Pre-condition / Entry Point:** Completed Step 2 or clicked Step 3 tab.
- **Summary:** The core vehicle fleet entry engine. Features real-time 17-character VIN syntax and checksum validation, IRS weight category mapping (A–V), logging vehicle toggles, and bulk CSV/Excel fleet import.

![Filing Wizard Step 3: Vehicle Information & Fleet Manager](public/app-screens/hvut-10-wizard-step3-vehicle-info.png)

#### Interactive Action Matrix (What Happens When User Takes Any Action)

| UI Element / Control | Element Type | User Trigger | System Action, Validation & State Transition |
|---|---|---|---|
| **Vehicle Identification Number (VIN) Input** | Uppercase Text Input | `Type` | Enforces exactly 17 characters. Rejects forbidden characters (I, O, Q) per federal standard. Live character counter. |
| **Vehicle Gross Weight Category Dropdown** | Select Dropdown (A–V) | `Select` | Maps weight brackets: Category A (55,000–56,000 lbs, $100 base) through Category V (>75,000 lbs, $550 max). |
| **Logging / Forestry Vehicle Checkbox** | Checkbox | `Toggle` | Applies statutory 25% tax reduction for qualifying forestry/logging trucks. |
| **Add Vehicle Button** | Action Button (Amber/Blue) | `Click` | Validates VIN format and uniqueness within return; adds row to vehicle fleet table; recalculates total tax. |
| **Bulk Upload Vehicles Button** | Modal Trigger Button | `Click` | Opens CSV/Excel upload modal with template download, column mapping, and batch VIN parsing. |
| **Registered Vehicles Table** | Data Grid | `View / Edit / Delete` | Displays VIN, Category, Logging Status, Prorated Tax, and row removal actions. |
| **Total Estimated Tax Banner** | Computed Summary Bar | `Auto-update` | Displays cumulative tax liability based on reported fleet. |
| **Next: IRS Options Button** | Primary Action Button (Blue) | `Click` | Validates at least 1 vehicle is present; saves fleet to database; advances to Step 4. |
| **Back to Step 2 Button** | Secondary Button | `Click` | Navigates back to Step 2. |

- **Next Destination:** Click "Next" -> /file/new?step=4; Click "Back" -> /file/new?step=2.

---

### SCR-11: Filing Wizard Step 4: IRS Tax Options & Prior-Year Credits

- **Route URL:** `/file/new?step=4`
- **Access Tier:** Authenticated Client
- **Pre-condition / Entry Point:** Completed Step 3 or clicked Step 4 tab.
- **Summary:** Configures prior year credit deductions and selects the taxpayer IRS tax payment method: Direct Debit (EFW), Electronic Federal Tax Payment System (EFTPS), or Check/Money Order.

![Filing Wizard Step 4: IRS Tax Options & Prior-Year Credits](public/app-screens/hvut-11-wizard-step4-irs-options.png)

#### Interactive Action Matrix (What Happens When User Takes Any Action)

| UI Element / Control | Element Type | User Trigger | System Action, Validation & State Transition |
|---|---|---|---|
| **Prior Year Credit Claims Card** | Deductions Manager | `Input Credit Data` | Enter VIN, Reason (Sold, Destroyed, Stolen, Low Mileage), and credit amount. Deducts from gross tax liability. |
| **Option 1: Electronic Funds Withdrawal (EFW / Direct Debit)** | Payment Method Radio | `Select` | Reveals bank routing number (ABA 9-digit algorithm check), account number, account type (Checking/Savings), and requested debit date. |
| **Option 2: EFTPS (Electronic Federal Tax Payment System)** | Payment Method Radio | `Select` | Selects EFTPS. Displays instructions explaining taxpayer must pay via EFTPS.gov before due date. |
| **Option 3: Check or Money Order** | Payment Method Radio | `Select` | Selects mail-in payment. Generates official Form 2290-V Payment Voucher with return. |
| **Net Tax Calculation Box** | Computed Summary | `Auto-update` | Displays: Gross Tax Due - Prior Year Credits = Net Tax Payable to IRS. |
| **Next: Pricing Summary Button** | Primary Action Button (Blue) | `Click` | Validates payment details; saves choices; advances to Step 5. |
| **Back to Step 3 Button** | Secondary Button | `Click` | Navigates back to Step 3. |

- **Next Destination:** Click "Next" -> /file/new?step=5; Click "Back" -> /file/new?step=3.

---

### SCR-12: Filing Wizard Step 5: Pricing & Purchase Summary

- **Route URL:** `/file/new?step=5`
- **Access Tier:** Authenticated Client
- **Pre-condition / Entry Point:** Completed Step 4 or clicked Step 5 tab.
- **Summary:** Itemizes platform filing service fees, optional carrier add-on services, promo discount codes, and calculates final checkout order total.

![Filing Wizard Step 5: Pricing & Purchase Summary](public/app-screens/hvut-12-wizard-step5-pricing-summary.png)

#### Interactive Action Matrix (What Happens When User Takes Any Action)

| UI Element / Control | Element Type | User Trigger | System Action, Validation & State Transition |
|---|---|---|---|
| **E-File Service Fee Itemization** | Order Summary Card | `View` | Displays base platform filing fee ($7.99 for single vehicle / discounted fleet tier). |
| **SMS Text Status Alert Add-on** | Optional Checkbox ($1.99) | `Toggle` | Enables instant SMS alert when IRS accepts return or issues Schedule 1. Updates total. |
| **USPS Hardcopy Watermarked Schedule 1 Add-on** | Optional Checkbox ($4.99) | `Toggle` | Mails printed, watermarked Schedule 1 via USPS First Class mail. Updates total. |
| **Promo / Coupon Code Input** | Text Input with "Apply" Button | `Type & Apply` | Validates coupon code; applies dollar or percentage discount to order. |
| **Total Order Amount Card** | Computed Total | `Auto-update` | Displays final payable amount for platform e-filing services. |
| **Next: Payment Information Button** | Primary Action Button (Blue) | `Click` | Locks fee total and proceeds to Step 6 Stripe Checkout. |
| **Back to Step 4 Button** | Secondary Button | `Click` | Navigates back to Step 4. |

- **Next Destination:** Click "Next" -> /file/new?step=6; Click "Back" -> /file/new?step=4.

---

### SCR-13: Filing Wizard Step 6: Platform Filing Fee & Stripe Checkout

- **Route URL:** `/file/new?step=6`
- **Access Tier:** Authenticated Client
- **Pre-condition / Entry Point:** Completed Step 5 or clicked Step 6 tab.
- **Summary:** PCI-DSS compliant credit/debit card checkout powered by Stripe Elements. Collects cardholder name, card number, expiry, CVC, and billing ZIP to pay the platform filing fee.

![Filing Wizard Step 6: Platform Filing Fee & Stripe Checkout](public/app-screens/hvut-13-wizard-step6-payment-checkout.png)

#### Interactive Action Matrix (What Happens When User Takes Any Action)

| UI Element / Control | Element Type | User Trigger | System Action, Validation & State Transition |
|---|---|---|---|
| **Order Recap Summary Box** | Display Panel | `View` | Recaps business name, return type, and total fee payable. |
| **Cardholder Name Input** | Text Input | `Type` | Name printed on credit/debit card. |
| **Card Number (Stripe Elements)** | Secure Tokenized Input | `Type` | Validates 16-digit card number with Luhn algorithm; detects card brand (Visa, MC, Amex, Discover). |
| **Expiry Date & CVC Inputs** | Secure Inputs | `Type` | Validates future expiry (MM/YY) and 3/4-digit card security code. |
| **Billing ZIP Code Input** | Numeric Input | `Type` | Verifies AVS (Address Verification System) billing ZIP. |
| **Security Badges** | Trust Seals | `View` | Displays "256-Bit SSL Encryption" and "PCI-DSS Level 1 Certified". |
| **Pay Platform Fee & Continue Button** | Primary Submit Button (Blue) | `Click / Submit` | Creates Stripe payment token, processes transaction via /api/filings/{id}/charge. On success: marks filing as PAID and advances to Step 7. On decline: shows clear error message. |
| **Back to Step 5 Button** | Secondary Button | `Click` | Navigates back to Step 5. |

- **Next Destination:** Payment success -> /file/new?step=7; Payment declined -> inline error alert; Click "Back" -> /file/new?step=5.

---

### SCR-14: Filing Wizard Step 7: Form Review, Tax Audit & IRS Submission

- **Route URL:** `/file/new?step=7`
- **Access Tier:** Authenticated Client
- **Pre-condition / Entry Point:** Completed Step 6 with successful payment, or clicked Step 7 tab.
- **Summary:** The final pre-filing compliance audit and IRS declaration screen. Verifies all return lines, displays automated audit diagnostics, captures IRS Jurat perjury consent, validates 5-digit E-File PIN, and transmits to the IRS MeF Gateway.

![Filing Wizard Step 7: Form Review, Tax Audit & IRS Submission](public/app-screens/hvut-14-wizard-step7-form-summary.png)

#### Interactive Action Matrix (What Happens When User Takes Any Action)

| UI Element / Control | Element Type | User Trigger | System Action, Validation & State Transition |
|---|---|---|---|
| **Pre-Filing Diagnostic Audit Box** | Status Checklist (Green/Amber) | `Auto-verify` | Validates EIN syntax, Name Control match, 17-character VIN formats, payment method, and fee payment status. |
| **Form 2290 Line-by-Line Summary** | Financial Preview Grid | `View` | Displays Line 1 (Gross Tax), Line 2 (Credits), Line 3 (Net Tax Balance Due). |
| **IRS Jurat Consent Declaration Checkbox** | Mandatory Legal Checkbox | `Click` | Statutory perjury disclosure: "Under penalties of perjury, I declare that I have examined this return...". |
| **Third-Party Designee Authorization** | Optional Checkbox | `Toggle` | Authorizes IRS to speak with third-party representative or preparer. |
| **Taxpayer 5-Digit E-File PIN Input** | Numeric 5-Digit Input | `Type` | Personal digital signature authorizing electronic transmission. |
| **Submit Return to IRS MeF Gateway Button** | Primary Submission CTA (Green/Blue) | `Click / Transmit` | Compiles schema-validated XML (ReturnData2290.xml), generates SOAP envelope, transmits to IRS MeF gateway, updates status to TRANSMITTED_TO_IRS, and redirects to /post-filing?filingId=... |
| **Print Form Summary Worksheet Button** | Utility Link | `Click` | Opens print-ready summary of all 7 wizard steps. |

- **Next Destination:** Click Submit -> /post-filing?filingId=...; Validation fail -> highlights missing PIN or unchecked consent.

---

### SCR-15: Post-Filing Submission Tracker & Schedule 1 Screen

- **Route URL:** `/post-filing?filingId=...`
- **Access Tier:** Authenticated Client
- **Pre-condition / Entry Point:** Automatically redirected here upon clicking "Submit Return to IRS MeF Gateway" in Step 7.
- **Summary:** Live transmission tracking portal. Confirms official IRS submission ID, transmission timestamp, and provides instant download of the IRS-stamped, watermarked Schedule 1 PDF required for state vehicle registration and DMV tags.

![Post-Filing Submission Tracker & Schedule 1 Screen](public/app-screens/hvut-15-post-filing.png)

#### Interactive Action Matrix (What Happens When User Takes Any Action)

| UI Element / Control | Element Type | User Trigger | System Action, Validation & State Transition |
|---|---|---|---|
| **Submission Acknowledgment Banner** | Success Hero Banner (Green) | `View` | Confirms electronic transmission received with green checkmark. |
| **Official IRS Submission ID Badge** | System Identifier (Monospace) | `View / Copy` | Unique 20-digit federal tracking number (e.g. 1123456782026113279). |
| **Transmission Timestamp** | Audit Timestamp | `View` | Exact UTC/Local time of transmission recorded in audit logs. |
| **Live IRS Status Stepper** | Progress Stepper | `Auto-poll` | Visual stages: Queued -> Transmitted to IRS -> Accepted by IRS (Schedule 1 Ready). |
| **Download Watermarked Schedule 1 (PDF) Button** | Primary Action CTA (Green) | `Click` | Downloads official IRS-watermarked Schedule 1 PDF with digital acceptance e-stamp and DMV barcode. |
| **Print Complete Form 2290 Button** | Secondary Button | `Click` | Opens print preview of complete Form 2290 return with Schedule 1. |
| **Return to Dashboard Button** | Navigation Button (Blue) | `Click` | Navigates back to /dashboard with filing marked as "Schedule 1 Ready". |

- **Next Destination:** Click "Download Schedule 1" -> Downloads PDF; Click "Return to Dashboard" -> /dashboard.

---

### SCR-16: System Administration & MeF Gateway Compliance Console

- **Route URL:** `/admin`
- **Access Tier:** Authenticated Administrator (role=ADMIN)
- **Pre-condition / Entry Point:** Administrator sign-in or navigating to /admin.
- **Summary:** Internal control cockpit for platform operators, compliance teams, and CPAs. Monitors platform-wide filings, audits MeF XML transmissions, simulates IRS acceptance/rejection responses, and manages users.

![System Administration & MeF Gateway Compliance Console](public/app-screens/hvut-16-admin.png)

#### Interactive Action Matrix (What Happens When User Takes Any Action)

| UI Element / Control | Element Type | User Trigger | System Action, Validation & State Transition |
|---|---|---|---|
| **Platform KPI Cards** | Metric Display Cards | `View` | Total Submissions, Accepted Returns, Rejection Rate, Gross IRS Tax Processed, Platform Revenue. |
| **Global Submissions Audit Grid** | Filterable Table | `Search / Filter` | Inspects returns across all registered businesses and filers. |
| **MeF XML Inspector Drawer** | Code / XML Viewer | `Click "View XML"` | Opens formatted schema-validated ReturnData2290.xml payload and SOAP header for technical audit. |
| **IRS Simulator Controls** | Development / QA Panel | `Toggle Mode` | Switches between AUTO_ACCEPT, FORCE_REJECT (testing rejection codes like R0000-900-01, F2290-001), and DELAY_RESPONSE. |
| **User & Business Management Drawer** | Admin Tool | `Click User / Biz` | View account details, reset passwords, inspect client audit logs. |

- **Next Destination:** Admin operations -> stays on /admin; Exit to Client Dashboard -> /dashboard.

---

## 4. Error Handling, Edge Cases & Validation Matrix

| Scenario | Trigger Condition | System Behavior & User Feedback | Resolution Workflow |
|---|---|---|---|
| **Invalid VIN Format** | User enters VIN < 17 chars or includes letters I, O, Q | Immediate inline red error callout below input; button disabled | User corrects character; field clears error |
| **Duplicate VIN in Fleet** | Same VIN entered twice in single return | Red toast: "VIN already reported in this filing" | User modifies or removes duplicate |
| **Invalid EIN Format** | EIN entered without 9 digits | Form blocks save; displays "EIN must be 9 digits (XX-XXXXXXX)" | Enter valid federal EIN |
| **Card Payment Declined** | Insufficient funds or invalid CVC in Step 6 | Stripe returns decline code; screen displays human-readable alert | User enters alternate card or re-verifies CVC |
| **IRS Rejection (R0000-900-01)** | EIN and Name Control mismatch in IRS Master File | Dashboard flags status "Rejected — Fix Free"; opens rejection modal | User verifies IRS CP-575 notice, updates Name Control in Business Profile, and re-submits for free |
| **Session Expiry** | User idle > 60 minutes | Protected route redirects to `/login?returnTo=...` | User re-enters credentials; restored to previous draft |

---

## 5. Deliverable Acceptance & Verification

Both the Markdown (`.md`) and compiled PDF (`.pdf`) files contain all 16 authentic application screens, complete action matrices, and state machine workflows. They are ready to be handed directly to your outsource software engineering and UI/UX design teams.
