# Complete Plain-English Guide: Truck Tax (IRS Form 2290), TruckDues.com & How This Application Works

> **Word Document Version:** Also saved as [Understanding_Truck_Tax_Form_2290_and_App_Guide.docx](Understanding_Truck_Tax_Form_2290_and_App_Guide.docx) so you can open it directly in Microsoft Word.

---

## 1. What Is "Truck Tax" (IRS Form 2290 / HVUT)?

**Simple Definition:**
**Heavy Highway Vehicle Use Tax (HVUT)**—commonly called **"Truck Tax"** or **"IRS Form 2290"**—is an annual US federal tax paid to the **IRS (Internal Revenue Service)** by anyone who owns and operates a heavy truck on public highways.

- **Which trucks have to pay it?**
  Any highway motor vehicle with a **gross weight of 55,000 pounds (24,947 kg) or more**—typically 18-wheeler semi-trucks, heavy dump trucks, and commercial rigs.
- **When is the Tax Year?**
  Unlike regular income tax (Jan 1 – Dec 31), the IRS Truck Tax year runs from **July 1 to June 30** of the following year (for example: **July 1, 2026 – June 30, 2027**).
- **When is the filing deadline?**
  You must file by the **last day of the month following the month you first drove the truck on public roads**:
  - For existing trucks driven in **July** (the start of the tax year), the annual renewal deadline is **August 31**.
  - If a trucker buys and first drives a brand-new truck in **October**, their deadline for that truck is **November 30**.

---

## 2. Why Do Truckers File It? (The Real-World Reason)

1. **You CANNOT get or renew your truck's license plates without "Schedule 1":**
   - When you file Form 2290 and the IRS accepts it, the IRS returns an official watermarked certificate called **Schedule 1** listing your truck's 17-character **VIN (Vehicle Identification Number)**.
   - Every US state **DMV (Department of Motor Vehicles)** and **IRP office** requires a valid IRS-stamped **Schedule 1** before they will issue or renew license plates/tags for a heavy truck. Without Schedule 1, the truck cannot legally go on the road.
2. **Highway Maintenance & Federal Law:**
   - Heavy 55,000–80,000 lb trucks cause the most wear and tear on bridges and interstate highways. Form 2290 tax revenue funds US highway upkeep.
   - Any business filing for **25 or more trucks** is legally mandated by the IRS to **e-file electronically**.

---

## 3. How Is the Tax Calculated? (Simple Math)

The IRS puts every heavy truck into a **Weight Category (`A` through `V`, plus `W`)**:

| Category | Truck Gross Weight | Standard Annual Tax | Logging Truck Tax (25% Discount) | Plain-English Meaning |
| :--- | :--- | :--- | :--- | :--- |
| **Category A** | **55,000 lbs** | **\$100.00 / yr** | **\$75.00 / yr** | Smallest taxable heavy truck |
| **Categories B – U** | **55,001 – 75,000 lbs** | **+\$22 per extra 1,000 lbs** | **75% of standard rate** | Increases step-by-step by weight |
| **Category V** | **Over 75,000 lbs** *(e.g. 80,000 lb 18-wheeler)* | **\$550.00 / yr (Max Cap)** | **\$412.50 / yr** | Most semi-trucks fall in Category V (\$550/yr) |
| **Category W (Suspended)** | **55,000+ lbs driven ≤ 5,000 miles/yr** *(or ≤ 7,500 miles for farm/agriculture)* | **\$0.00 (Tax Suspended)** | **\$0.00 (Tax Suspended)** | You **still must file Form 2290** to get Schedule 1 for the DMV, but you owe **\$0 tax** |

- **Mid-Year Proration (Starting After July):**
  If a truck is first put on the road in **July**, it pays for all **12 months** (\$550 for Category V). If it is first put on the road in **January**, only **6 months** remain until June 30, so the tax is cut in half: `6 / 12 × $550 = $275.00`.

---

## 4. Why Does [TruckDues.com](https://www.truckdues.com/) Exist?

The IRS does **not** have a free consumer website where a truck driver can easily fill out Form 2290 online.
- If a trucker mails a **paper Form 2290** to the IRS, it takes **4 to 6 weeks** to receive their stamped Schedule 1 back by mail—leaving their truck stuck in the parking lot unable to get DMV tags.
- **How [TruckDues.com](https://www.truckdues.com/) works:**
  1. TruckDues.com is an **IRS-Authorized Modernized e-File (MeF) Provider**.
  2. A trucker logs in, enters their **Business EIN** and **Truck VIN(s)** using simple web forms, and pays a small **website service fee** to TruckDues.com.
  3. TruckDues.com converts their form into specialized **IRS MeF XML code**, transmits it electronically to the IRS servers, and receives the **IRS-watermarked Schedule 1 PDF within minutes** so the trucker can go straight to the DMV.

### Crucial Concept: Two Separate Payments!
On TruckDues.com—and in this application—there are always **two completely separate payments**:
1. **Stream A — Website Service Fee (Paid to TruckDues / the Platform):** A small software fee (e.g., \$7.99+ for 1 truck) paid by credit/debit card to use the e-filing website.
2. **Stream B — IRS Tax Payment (Paid to the US Government):** The actual HVUT tax (e.g., \$550) paid directly to the IRS via:
   - **EFW (Electronic Funds Withdrawal):** Direct bank debit using routing + account number
   - **EFTPS:** The government's Electronic Federal Tax Payment System
   - **IRS Credit/Debit Card Processor**
   - **Check or Money Order** mailed with a **Form 2290-V Payment Voucher**

---

## 5. What Is the Purpose of THIS Application?

This application is a **full-stack working clone & simulator of a TruckDues.com-style Form 2290 e-filing platform**.

- **Why is it a simulator?**
  Connecting to the live IRS computer network requires an official IRS **EFIN/ETIN** license, fingerprinting, and FBI background checks.
- **What does this app do?**
  It executes **100% real Form 2290 business rules** (real Category A–W tax math, real monthly proration, real 17-character ISO 3779 VIN check-digit validation, real IRS MeF XML generation, and real Schedule 1 / Form 2290-V PDF generation) while replacing the live IRS server and credit card processor with a **built-in Simulator** that you control.

---

## 6. How This Website Works (Screen-by-Screen Walkthrough)

### A. Top Bar — Persona Switcher
In the top header, you can switch between **4 pre-loaded user accounts** to see how different people use the platform:
- **Owner-Operator:** A single truck owner filing for 1–2 trucks.
- **Fleet Manager:** A trucking company managing dozens of trucks (with CSV bulk upload).
- **CPA / Tax Preparer:** An accountant managing multiple trucking companies (multiple EINs).
- **Admin:** Controls the IRS Simulator Console (`/admin`).

### B. Dashboard (`/dashboard`)
- View your registered **Trucking Businesses (EINs)** (Note: The IRS requires a 9-digit **EIN**, never a Social Security Number).
- Click **"Carry Forward Fleet"** to copy last year's trucks into the new tax year with one click.
- View all your filings (`DRAFT`, `ACCEPTED`, `EDITING_AFTER_REJECT`, `QUEUED`, `TRANSMITTED_TO_IRS`).
- Download the **Watermarked Schedule 1 PDF**, **Form 2290-V Payment Voucher PDF**, or inspect the generated **IRS MeF XML**.

### C. File Form 2290 Wizard (`/file/new`)
Just like TruckDues.com, filing takes **4 simple steps**:
1. **Step 1 — Business & Tax Period:** Pick your Business (EIN), Tax Year (`2026-2027`), and First-Used Month (`July` = 12 months, etc.).
2. **Step 2 — Vehicles (VINs & Weights):**
   - Type a 17-character VIN, click **"Generate Valid Test VIN"**, or **Import a CSV file**.
   - The app validates that the VIN is 17 characters, contains no illegal letters (`I`, `O`, `Q`), and passes the **ISO 3779 check-digit formula** at position 9.
   - Choose Weight Category (`A`–`V` or `W` Suspended) and whether it's a Logging or Agricultural truck.
3. **Step 3 — Tax Calculation Review:** Review the automatic calculation of Taxable Vehicles, Suspended Vehicles (\$0), Credits, and Net IRS Tax Due.
4. **Step 4 — Checkout, E-Sign & Transmit:**
   - Enter a test card (`4242...` approves; `4000...` declines) and optional promo code (`TRUCK10`, `FLEET25`, `POCFREE`) or SMS/Fax add-ons.
   - Choose your IRS Tax Payment method (`EFW`, `EFTPS`, `CARD`, or `CHECK`).
   - Sign with a **5-digit Self-Select PIN** and click **Submit**.
   - *(Bonus Rule from TruckDues.com: If a filing was rejected by the IRS and you edit & resubmit it, the website fee is automatically waived to **\$0**!)*

### D. Post-Filing Corrections & Refunds (`/post-filing`)
Handles the 3 real-world things that happen *after* a trucker files Form 2290:
1. **VIN Correction (`2290_VIN_CORR`):** Fix a typo in a VIN from an already-accepted Schedule 1 (\$0 extra tax).
2. **Weight Increase Amendment (`2290_AMEND`):** If a truck moves into a heavier weight category mid-year, calculates only the incremental tax difference.
3. **Form 8849 Schedule 6 Credit/Refund (`8849_SCH6`):** Claim a prorated tax refund if a truck was **Sold**, **Destroyed**, **Stolen**, or drove under the **5,000-mile limit**.

### E. Admin / IRS Simulator Console (`/admin`)
Lets you test how the website behaves under every real-world IRS scenario:
- **`AUTO_ACCEPT`:** Immediately accepts valid returns and issues the Schedule 1 PDF.
- **`MANUAL_REVIEW`:** Holds returns in `TRANSMITTED_TO_IRS` so you can manually click **Accept** or **Reject** in `/admin`.
- **`AUTO_REJECT`:** Forces an IRS rejection so you can test the error message and free `$0` resubmission flow.
- **`GATEWAY_OUTAGE`:** Simulates IRS maintenance downtime, holding returns in `QUEUED` status.
