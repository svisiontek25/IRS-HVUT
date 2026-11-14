import fs from "node:fs";
import path from "node:path";
import { PDFDocument, PDFPage, PDFFont, StandardFonts, degrees, rgb } from "pdf-lib";
import { BusinessEntity, ISchedule1Generator, ReturnFiling, WeightCategory } from "./types";
import { calculateVehicleTax, WEIGHT_CATEGORIES } from "../hvut/tax-engine";

const TEMPLATE_CANDIDATES = [
  path.join(process.cwd(), "public", "forms", "f2290_FORMAT.pdf"),
  path.join(process.cwd(), "REFERANCE DOCUMENTS", "f2290_FORMAT.pdf"),
];
const NAVY_INK = rgb(0.06, 0.14, 0.52);

async function loadTemplateDoc(): Promise<PDFDocument> {
  for (const candidate of TEMPLATE_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return PDFDocument.load(fs.readFileSync(candidate), { ignoreEncryption: true });
    }
  }
  const fallback = await PDFDocument.create();
  for (let i = 0; i < 10; i++) {
    fallback.addPage([612, 792]);
  }
  return fallback;
}

function drawCombChars(
  page: PDFPage,
  text: string,
  startX: number,
  y: number,
  stepX: number,
  font: PDFFont,
  size = 9.5,
) {
  const chars = text.split("");
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (!ch || ch === " ") continue;
    const w = font.widthOfTextAtSize(ch, size);
    const x = startX + i * stepX + (stepX - w) / 2;
    page.drawText(ch, {
      x,
      y,
      size,
      font,
      color: NAVY_INK,
    });
  }
}

function splitDollarsCents(amount: number): [string, string] {
  const fixed = Math.max(0, amount).toFixed(2);
  const [dollars, cents] = fixed.split(".");
  return [Number(dollars).toLocaleString("en-US"), cents || "00"];
}

function formatDateMmDdYyyy(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function populateSchedule1Page(
  page: PDFPage,
  filing: ReturnFiling,
  business: BusinessEntity,
  linesSlice: ReturnFiling["lines"],
  totalReported: number,
  totalSuspended: number,
  fontRegular: PDFFont,
  fontBold: PDFFont,
  includeWatermark: boolean,
) {
  const einDigits = business.ein.replace(/\D/g, "").padEnd(9, "0");
  const startYear = filing.taxYear.split("-")[0] || "2026";
  const yyyymm = `${startYear}${String(filing.firstUsedMonth).padStart(2, "0")}`;

  // Name
  page.drawText(business.legalName.toUpperCase(), {
    x: 40,
    y: 675,
    size: 9.5,
    font: fontBold,
    color: NAVY_INK,
  });

  // 9-box EIN (2 digits + 7 digits)
  drawCombChars(page, einDigits.slice(0, 2), 410, 680, 15.5, fontBold, 10);
  drawCombChars(page, einDigits.slice(2, 9), 446, 680, 15.3, fontBold, 10);

  // Address & Room/Suite
  page.drawText(business.addressLine1, {
    x: 40,
    y: 639,
    size: 9,
    font: fontRegular,
    color: NAVY_INK,
  });
  if (business.roomSuite) {
    page.drawText(business.roomSuite, {
      x: 514,
      y: 639,
      size: 9,
      font: fontRegular,
      color: NAVY_INK,
    });
  }

  // City, State, Country, ZIP, Month of First Use (YYYYMM)
  page.drawText(business.city, {
    x: 40,
    y: 603,
    size: 9,
    font: fontRegular,
    color: NAVY_INK,
  });
  page.drawText(business.state, {
    x: 162,
    y: 603,
    size: 9,
    font: fontRegular,
    color: NAVY_INK,
  });
  page.drawText(business.country || "US", {
    x: 263,
    y: 603,
    size: 9,
    font: fontRegular,
    color: NAVY_INK,
  });
  page.drawText(business.zip, {
    x: 386,
    y: 603,
    size: 9,
    font: fontRegular,
    color: NAVY_INK,
  });
  drawCombChars(page, yyyymm, 468, 603, 18, fontBold, 9.5);

  // Part I Summary: a, b, c
  const totalTaxable = Math.max(0, totalReported - totalSuspended);
  page.drawText(String(totalReported), {
    x: 548,
    y: 566,
    size: 9.5,
    font: fontBold,
    color: NAVY_INK,
  });
  page.drawText(String(totalSuspended), {
    x: 548,
    y: 554,
    size: 9.5,
    font: fontBold,
    color: NAVY_INK,
  });
  page.drawText(String(totalTaxable), {
    x: 548,
    y: 542,
    size: 9.5,
    font: fontBold,
    color: NAVY_INK,
  });

  // Part II Vehicles (24 rows, 17 VIN comb boxes + category)
  linesSlice.forEach((line, idx) => {
    const rowY = 502 - idx * 18;
    const vin = (line.vin || "").toUpperCase().slice(0, 17);
    drawCombChars(page, vin, 57, rowY, 16, fontBold, 9.5);

    const catText = line.weightCategory || "V";
    const catWidth = fontBold.widthOfTextAtSize(catText, 9.5);
    page.drawText(catText, {
      x: 498 + (77 - catWidth) / 2,
      y: rowY,
      size: 9.5,
      font: fontBold,
      color: NAVY_INK,
    });
  });

  // Official IRS e-file Watermark (vertical emblem + diagonal Received date matching SCHEDULE_1_FORMAT.pdf)
  if (includeWatermark) {
    const stampDate = formatDateMmDdYyyy(filing.acceptedAt);
    page.drawEllipse({
      x: 416,
      y: 286,
      xScale: 48,
      yScale: 185,
      color: rgb(0.78, 0.8, 0.84),
      opacity: 0.25,
    });
    page.drawText("IRS e-file", {
      x: 432,
      y: 165,
      size: 42,
      font: fontBold,
      color: rgb(0.55, 0.58, 0.64),
      rotate: degrees(90),
      opacity: 0.28,
    });
    page.drawText(`Received ${stampDate}`, {
      x: 332,
      y: 256,
      size: 21,
      font: fontRegular,
      color: rgb(0.32, 0.36, 0.44),
      rotate: degrees(34),
      opacity: 0.72,
    });
    page.drawText(
      `SIMULATED POC RECEIPT | SUBMISSION ID: ${filing.irsSubmissionId || "PENDING"}`,
      {
        x: 36,
        y: 16,
        size: 6.5,
        font: fontBold,
        color: rgb(0.45, 0.18, 0.18),
      },
    );
  } else {
    page.drawText("DRAFT PREVIEW - NOT YET TRANSMITTED TO IRS", {
      x: 110,
      y: 250,
      size: 20,
      font: fontBold,
      color: rgb(0.75, 0.25, 0.25),
      rotate: degrees(34),
      opacity: 0.35,
    });
  }
}

function populateForm2290Page1(
  page: PDFPage,
  filing: ReturnFiling,
  business: BusinessEntity,
  fontRegular: PDFFont,
  fontBold: PDFFont,
) {
  const einDigits = business.ein.replace(/\D/g, "").padEnd(9, "0");
  const startYear = filing.taxYear.split("-")[0] || "2026";
  const yyyymm = `${startYear}${String(filing.firstUsedMonth).padStart(2, "0")}`;

  // Business Header
  page.drawText(business.legalName.toUpperCase(), { x: 40, y: 675, size: 9.5, font: fontBold });
  drawCombChars(page, einDigits.slice(0, 2), 410, 680, 15.5, fontBold, 10);
  drawCombChars(page, einDigits.slice(2, 9), 446, 680, 15.3, fontBold, 10);

  page.drawText(business.addressLine1, { x: 40, y: 639, size: 9, font: fontRegular });
  if (business.roomSuite) {
    page.drawText(business.roomSuite, { x: 514, y: 639, size: 9, font: fontRegular });
  }
  page.drawText(business.city, { x: 40, y: 603, size: 9, font: fontRegular });
  page.drawText(business.state, { x: 192, y: 603, size: 9, font: fontRegular });
  page.drawText(business.country || "US", { x: 342, y: 603, size: 9, font: fontRegular });
  page.drawText(business.zip, { x: 493, y: 603, size: 9, font: fontRegular });

  // Return checkboxes
  if (filing.addressChange) {
    page.drawText("X", { x: 37.5, y: 577.5, size: 8.5, font: fontBold });
  }
  if (filing.formType === "2290_VIN_CORR") {
    page.drawText("X", { x: 325.5, y: 577.5, size: 8.5, font: fontBold });
  }
  if (filing.formType === "2290_AMEND") {
    page.drawText("X", { x: 37.5, y: 546.5, size: 8.5, font: fontBold });
  }
  if (filing.finalReturn) {
    page.drawText("X", { x: 325.5, y: 510.5, size: 8.5, font: fontBold });
  }

  // Part I: Figuring the Tax
  drawCombChars(page, yyyymm, 468, 434, 18, fontBold, 9.5);

  const line2Amt = filing.formType === "2290_AMEND" ? 0 : filing.totalTaxDue;
  const line3Amt = filing.formType === "2290_AMEND" ? filing.totalTaxDue : 0;
  const line4Amt = line2Amt + line3Amt;
  const line5Amt = filing.totalCredits;
  const line6Amt = filing.netTaxDue;

  const drawMoney = (val: number, y: number) => {
    const [d, c] = splitDollarsCents(val);
    const dw = fontBold.widthOfTextAtSize(d, 9);
    page.drawText(d, { x: 550 - dw, y, size: 9, font: fontBold });
    page.drawText(c, { x: 560, y, size: 9, font: fontBold });
  };

  drawMoney(line2Amt, 422);
  if (line3Amt > 0) drawMoney(line3Amt, 410);
  drawMoney(line4Amt, 398);
  if (line5Amt > 0) drawMoney(line5Amt, 386);
  drawMoney(line6Amt, 362);

  if (filing.taxPayment?.method === "EFTPS") {
    page.drawText("X", { x: 213.5, y: 362.5, size: 8.5, font: fontBold });
  } else if (filing.taxPayment?.method === "CARD") {
    page.drawText("X", { x: 321.5, y: 362.5, size: 8.5, font: fontBold });
  }

  // Part II: Statement in Support of Suspension
  const hasCommercialSuspended = filing.lines.some(
    (l) => l.weightCategory === "W" && !l.isAgricultural,
  );
  const hasAgSuspended = filing.lines.some(
    (l) => l.weightCategory === "W" && l.isAgricultural,
  );
  if (hasCommercialSuspended) {
    page.drawText("X", { x: 195.5, y: 325.5, size: 8.5, font: fontBold });
  }
  if (hasAgSuspended) {
    page.drawText("X", { x: 311.5, y: 325.5, size: 8.5, font: fontBold });
  }
  if (filing.priorYearSuspendedAllUnderLimit) {
    page.drawText("X", { x: 505.5, y: 278.5, size: 8.5, font: fontBold });
  }

  // Third Party Designee
  if (filing.thirdPartyAssigned && business.thirdPartyDesignee?.name) {
    page.drawText("X", { x: 419.5, y: 194.5, size: 8.5, font: fontBold });
    page.drawText(business.thirdPartyDesignee.name, { x: 128, y: 174, size: 9, font: fontRegular });
    page.drawText(business.thirdPartyDesignee.phone, { x: 320, y: 174, size: 9, font: fontRegular });
    page.drawText(business.thirdPartyDesignee.pin, { x: 508, y: 174, size: 9, font: fontBold });
  } else {
    page.drawText("X", { x: 548.5, y: 194.5, size: 8.5, font: fontBold });
  }

  // Sign Here
  const sigText = filing.pinSignature
    ? `/s/ ${business.signingAuthorityName} (PIN: ${filing.pinSignature})`
    : business.signingAuthorityName;
  page.drawText(sigText, { x: 215, y: 105, size: 8.5, font: fontBold });
  page.drawText(formatDateMmDdYyyy(filing.submittedAt), {
    x: 478,
    y: 105,
    size: 8.5,
    font: fontRegular,
  });
  page.drawText(`${business.signingAuthorityName}, ${business.signingAuthorityTitle}`, {
    x: 90,
    y: 80,
    size: 8.5,
    font: fontRegular,
  });
  page.drawText(business.phone, { x: 500, y: 80, size: 8.5, font: fontRegular });
}

function populateForm2290Page2(
  page: PDFPage,
  filing: ReturnFiling,
  fontRegular: PDFFont,
  fontBold: PDFFont,
) {
  const taxableLines = filing.lines.filter(
    (l) => l.lineType === "TAXABLE" && l.weightCategory !== "W",
  );
  const suspendedCount = filing.lines.filter(
    (l) => l.weightCategory === "W" || l.lineType === "SUSPENDED",
  ).length;

  let totalTaxableVehicles = 0;
  let totalTaxAmount = 0;

  const categoriesAtoV = WEIGHT_CATEGORIES.filter((w) => w.category !== "W");
  categoriesAtoV.forEach((catInfo, rowIndex) => {
    const cat = catInfo.category as WeightCategory;
    const catLines = taxableLines.filter((l) => l.weightCategory === cat);
    if (catLines.length === 0) return;

    const y = 615 - rowIndex * 12;
    const stdLines = catLines.filter((l) => !l.isLogging);
    const logLines = catLines.filter((l) => l.isLogging);

    if (filing.firstUsedMonth !== 7) {
      if (stdLines.length > 0) {
        const partial = calculateVehicleTax(cat, false, filing.firstUsedMonth);
        page.drawText(`$${partial.toFixed(2)}`, { x: 256, y, size: 7.5, font: fontRegular });
      }
      if (logLines.length > 0) {
        const partialLog = calculateVehicleTax(cat, true, filing.firstUsedMonth);
        page.drawText(`$${partialLog.toFixed(2)}`, { x: 320, y, size: 7.5, font: fontRegular });
      }
    }

    if (stdLines.length > 0) {
      page.drawText(String(stdLines.length), { x: 406, y, size: 8, font: fontBold });
    }
    if (logLines.length > 0) {
      page.drawText(String(logLines.length), { x: 464, y, size: 8, font: fontBold });
    }

    const rowTax = catLines.reduce((sum, l) => sum + l.computedTax, 0);
    totalTaxableVehicles += catLines.length;
    totalTaxAmount += rowTax;
    page.drawText(`$${rowTax.toFixed(2)}`, { x: 512, y, size: 8, font: fontBold });
  });

  // Totals row
  page.drawText(String(totalTaxableVehicles), { x: 432, y: 326, size: 8.5, font: fontBold });
  page.drawText(`$${totalTaxAmount.toFixed(2)}`, { x: 512, y: 326, size: 8.5, font: fontBold });

  // Category W Suspended vehicles row
  if (suspendedCount > 0) {
    page.drawText(String(suspendedCount), { x: 432, y: 296, size: 8.5, font: fontBold });
  }
}

function populateConsentPage(
  page: PDFPage,
  filing: ReturnFiling,
  business: BusinessEntity,
  fontRegular: PDFFont,
  fontBold: PDFFont,
) {
  if (!filing.consentToDisclosure) return;
  const einDigits = business.ein.replace(/\D/g, "").padEnd(9, "0");
  page.drawText(`/s/ ${business.signingAuthorityName}`, { x: 100, y: 429, size: 9.5, font: fontBold });
  page.drawText(formatDateMmDdYyyy(filing.submittedAt), {
    x: 420,
    y: 446,
    size: 9,
    font: fontRegular,
  });
  drawCombChars(page, einDigits.slice(0, 2), 389, 429, 14.5, fontBold, 9.5);
  drawCombChars(page, einDigits.slice(2, 9), 425, 429, 15.2, fontBold, 9.5);
}

function populate2290VPage(
  page: PDFPage,
  filing: ReturnFiling,
  business: BusinessEntity,
  fontRegular: PDFFont,
  fontBold: PDFFont,
) {
  const einDigits = business.ein.replace(/\D/g, "").padEnd(9, "0");
  const startYear = filing.taxYear.split("-")[0] || "2026";
  const yyyymm = `${startYear}${String(filing.firstUsedMonth).padStart(2, "0")}`;
  const [dollars, cents] = splitDollarsCents(filing.netTaxDue);

  // Box 1: EIN
  drawCombChars(page, einDigits.slice(0, 2), 50, 146, 14.5, fontBold, 9.5);
  drawCombChars(page, einDigits.slice(2, 9), 86, 146, 15.2, fontBold, 9.5);

  // Box 2: Payment amount
  const dw = fontBold.widthOfTextAtSize(dollars, 9.5);
  page.drawText(dollars, { x: 534 - dw, y: 147, size: 9.5, font: fontBold });
  page.drawText(cents, { x: 548, y: 147, size: 9.5, font: fontBold });

  // Box 3: YYYYMM
  drawCombChars(page, yyyymm, 36, 110, 28, fontBold, 9.5);

  // Box 4: Name & Address
  page.drawText(business.legalName.toUpperCase(), { x: 225, y: 122, size: 9, font: fontBold });
  page.drawText(business.addressLine1, { x: 225, y: 98, size: 8.5, font: fontRegular });
  if (business.roomSuite) {
    page.drawText(business.roomSuite, { x: 521, y: 98, size: 8.5, font: fontRegular });
  }
  page.drawText(business.city, { x: 225, y: 74, size: 8.5, font: fontRegular });
  page.drawText(business.state, { x: 327, y: 74, size: 8.5, font: fontRegular });
  page.drawText(business.country || "US", { x: 399, y: 74, size: 8.5, font: fontRegular });
  page.drawText(business.zip, { x: 493, y: 74, size: 8.5, font: fontRegular });
}

export class MockWatermarkedPdfAdapter implements ISchedule1Generator {
  async generateSchedule1Pdf(filing: ReturnFiling, business: BusinessEntity): Promise<Uint8Array> {
    const templateDoc = await loadTemplateDoc();
    const outDoc = await PDFDocument.create();
    const fontRegular = await outDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await outDoc.embedFont(StandardFonts.HelveticaBold);

    const scheduleLines = filing.lines.filter(
      (l) => l.lineType !== "CREDIT" && l.lineType !== "CREDIT_LOW_MILEAGE" && l.lineType !== "CREDIT_OVERPAID",
    );
    const effectiveLines = scheduleLines.length > 0 ? scheduleLines : filing.lines;
    const perPage = 24;
    const totalPages = Math.max(1, Math.ceil(effectiveLines.length / perPage));
    const totalSuspended = effectiveLines.filter(
      (l) => l.weightCategory === "W" || l.lineType === "SUSPENDED",
    ).length;

    for (let i = 0; i < totalPages; i++) {
      // Index 4 in f2290_FORMAT.pdf is Schedule 1 (Rev. July 2026)
      const [copiedPage] = await outDoc.copyPages(templateDoc, [4]);
      outDoc.addPage(copiedPage);
      const slice = effectiveLines.slice(i * perPage, (i + 1) * perPage);
      populateSchedule1Page(
        copiedPage,
        filing,
        business,
        slice,
        effectiveLines.length,
        totalSuspended,
        fontRegular,
        fontBold,
        filing.status === "ACCEPTED",
      );
    }

    return outDoc.save();
  }

  async generateForm2290Pdf(filing: ReturnFiling, business: BusinessEntity): Promise<Uint8Array> {
    const templateDoc = await loadTemplateDoc();
    const outDoc = await PDFDocument.create();
    const fontRegular = await outDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await outDoc.embedFont(StandardFonts.HelveticaBold);

    // Copy Form 2290 Page 1 (idx 2) and Page 2 (idx 3)
    const [p1, p2] = await outDoc.copyPages(templateDoc, [2, 3]);
    outDoc.addPage(p1);
    outDoc.addPage(p2);
    populateForm2290Page1(p1, filing, business, fontRegular, fontBold);
    populateForm2290Page2(p2, filing, fontRegular, fontBold);

    // Copy Schedule 1 (idx 4) for all vehicles
    const scheduleLines = filing.lines.filter(
      (l) => l.lineType !== "CREDIT" && l.lineType !== "CREDIT_LOW_MILEAGE" && l.lineType !== "CREDIT_OVERPAID",
    );
    const effectiveLines = scheduleLines.length > 0 ? scheduleLines : filing.lines;
    const perPage = 24;
    const totalPages = Math.max(1, Math.ceil(effectiveLines.length / perPage));
    const totalSuspended = effectiveLines.filter(
      (l) => l.weightCategory === "W" || l.lineType === "SUSPENDED",
    ).length;

    for (let i = 0; i < totalPages; i++) {
      const [schPage] = await outDoc.copyPages(templateDoc, [4]);
      outDoc.addPage(schPage);
      populateSchedule1Page(
        schPage,
        filing,
        business,
        effectiveLines.slice(i * perPage, (i + 1) * perPage),
        effectiveLines.length,
        totalSuspended,
        fontRegular,
        fontBold,
        filing.status === "ACCEPTED",
      );
    }

    // Copy Consent to Disclosure (idx 8)
    const [consentPage] = await outDoc.copyPages(templateDoc, [8]);
    outDoc.addPage(consentPage);
    populateConsentPage(consentPage, filing, business, fontRegular, fontBold);

    // Copy Form 2290-V (idx 9) if CHECK or net tax > 0
    const [voucherPage] = await outDoc.copyPages(templateDoc, [9]);
    outDoc.addPage(voucherPage);
    populate2290VPage(voucherPage, filing, business, fontRegular, fontBold);

    return outDoc.save();
  }

  async generate2290VPdf(filing: ReturnFiling, business: BusinessEntity): Promise<Uint8Array> {
    const templateDoc = await loadTemplateDoc();
    const outDoc = await PDFDocument.create();
    const fontRegular = await outDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await outDoc.embedFont(StandardFonts.HelveticaBold);

    const [voucherPage] = await outDoc.copyPages(templateDoc, [9]);
    outDoc.addPage(voucherPage);
    populate2290VPage(voucherPage, filing, business, fontRegular, fontBold);

    return outDoc.save();
  }
}
