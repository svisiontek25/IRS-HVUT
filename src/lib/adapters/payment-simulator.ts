import {
  CheckoutChargeRequest,
  CheckoutChargeResult,
  FormType,
  IPaymentGateway,
  PackageType,
  ServiceOrder,
} from "./types";

export interface PricingQuote {
  packageType: PackageType;
  pricingTier: string;
  baseAmount: number;
  faxFee: number;
  smsFee: number;
  discountAmount: number;
  addOnAmount: number;
  previouslyPaidAmount: number;
  finalAmount: number;
  isWaived: boolean;
}

const PROMO_CODES: Record<string, { type: "PERCENT" | "FLAT"; value: number }> = {
  TRUCK10: { type: "PERCENT", value: 10 },
  FLEET25: { type: "FLAT", value: 25 },
  POCFREE: { type: "PERCENT", value: 100 },
};

/**
 * REQ-PAY-001: IRS-HVUT v1.1 Pricing Engine
 * Supports Per-Vehicle tiers, Unlimited Single Return ($139.99), Unlimited Annual ($199.99),
 * Fax ($1.00), Text Alert ($1.00), and free rejection resubmission / native VIN correction.
 */
export function computeServiceFeeQuote(params: {
  formType: FormType;
  vehicleCount: number;
  packageType?: PackageType;
  promoCode?: string;
  addOnFax?: boolean;
  addOnSms?: boolean;
  isResubmissionAfterReject?: boolean;
  hasUnlimitedAnnualPlan?: boolean;
  isNativeVinCorrection?: boolean;
  previouslyPaidAmount?: number;
}): PricingQuote {
  const {
    formType,
    vehicleCount,
    packageType: requestedPackage,
    promoCode,
    addOnFax = false,
    addOnSms = false,
    isResubmissionAfterReject = false,
    hasUnlimitedAnnualPlan = false,
    isNativeVinCorrection = true,
    previouslyPaidAmount = 0,
  } = params;

  const effectivePackage: PackageType = hasUnlimitedAnnualPlan
    ? "UNLIMITED_ANNUAL"
    : requestedPackage || "PER_VEHICLE";

  if (isResubmissionAfterReject) {
    return {
      packageType: effectivePackage,
      pricingTier: "Free IRS Rejection Resubmission",
      baseAmount: 0,
      faxFee: 0,
      smsFee: 0,
      discountAmount: 0,
      addOnAmount: 0,
      previouslyPaidAmount: 0,
      finalAmount: 0,
      isWaived: true,
    };
  }

  const faxFee = addOnFax ? 1.0 : 0;
  const smsFee = addOnSms ? 1.0 : 0;
  const addOnAmount = Number((faxFee + smsFee).toFixed(2));

  if (hasUnlimitedAnnualPlan) {
    return {
      packageType: "UNLIMITED_ANNUAL",
      pricingTier: "Unlimited Vehicles & Unlimited Returns (Active Plan)",
      baseAmount: 0,
      faxFee,
      smsFee,
      discountAmount: 0,
      addOnAmount,
      previouslyPaidAmount: 0,
      finalAmount: addOnAmount,
      isWaived: addOnAmount === 0,
    };
  }

  let pricingTier = "Reporting Vehicles - 1";
  let baseAmount = 7.99;

  if (effectivePackage === "UNLIMITED_ANNUAL") {
    pricingTier = "Unlimited Vehicles & Unlimited Returns for a Tax Period";
    baseAmount = 199.99;
  } else if (effectivePackage === "UNLIMITED_SINGLE") {
    pricingTier = "Unlimited Vehicles - Single Return";
    baseAmount = 139.99;
  } else if (formType === "2290_VIN_CORR") {
    if (isNativeVinCorrection) {
      pricingTier = "Free Native VIN Correction";
      baseAmount = 0;
    } else {
      pricingTier = "External VIN Correction";
      baseAmount = 9.99;
    }
  } else if (formType === "2290_AMEND") {
    pricingTier = "Form 2290 Amendment";
    baseAmount = 19.99;
  } else if (formType === "8849_SCH6") {
    pricingTier = "Form 8849 Schedule 6 Claim";
    baseAmount = 19.99;
  } else {
    const count = Math.max(1, vehicleCount);
    if (count === 1) {
      pricingTier = "Reporting Vehicles - 1";
      baseAmount = 7.99;
    } else if (count === 2) {
      pricingTier = "Reporting Vehicles - 2";
      baseAmount = 14.99;
    } else if (count <= 5) {
      pricingTier = `Reporting Vehicles - ${count} (3 to 5)`;
      baseAmount = 19.99;
    } else if (count <= 25) {
      pricingTier = `Reporting Vehicles - ${count} (6 to 25)`;
      baseAmount = 49.99;
    } else if (count <= 100) {
      pricingTier = `Reporting Vehicles - ${count} (26 to 100)`;
      baseAmount = 99.99;
    } else {
      pricingTier = "Unlimited Vehicles - Single Return";
      baseAmount = 139.99;
    }
  }

  let discountAmount = 0;
  const code = promoCode?.trim().toUpperCase();
  if (code && PROMO_CODES[code] && baseAmount > 0) {
    const rule = PROMO_CODES[code];
    discountAmount =
      rule.type === "PERCENT"
        ? Number(((baseAmount * rule.value) / 100).toFixed(2))
        : Math.min(baseAmount, rule.value);
  }

  const finalAmount = Math.max(
    0,
    Number((baseAmount - discountAmount - previouslyPaidAmount + addOnAmount).toFixed(2)),
  );

  return {
    packageType: effectivePackage,
    pricingTier,
    baseAmount,
    faxFee,
    smsFee,
    discountAmount,
    addOnAmount,
    previouslyPaidAmount,
    finalAmount,
    isWaived: finalAmount === 0,
  };
}

export class MockCheckoutAdapter implements IPaymentGateway {
  async chargeServiceFee(req: CheckoutChargeRequest): Promise<CheckoutChargeResult> {
    const isResubmission =
      req.filing.status === "EDITING_AFTER_REJECT" && req.filing.serviceOrder?.paymentStatus === "PAID";
    const quote = computeServiceFeeQuote({
      formType: req.filing.formType,
      vehicleCount: req.filing.lines.length,
      packageType: req.packageType || req.filing.packageType,
      promoCode: req.promoCode,
      addOnFax: req.addOnFax,
      addOnSms: req.addOnSms,
      isResubmissionAfterReject: isResubmission,
      hasUnlimitedAnnualPlan: req.hasUnlimitedAnnualPlan,
      isNativeVinCorrection: true,
    });

    const digits = req.cardNumber.replace(/\D/g, "");
    if (!quote.isWaived && digits.startsWith("4000")) {
      const order: ServiceOrder = {
        id: `ORD-${Date.now()}`,
        filingId: req.filing.id,
        packageType: quote.packageType,
        pricingTier: quote.pricingTier,
        baseAmount: quote.baseAmount,
        discountCode: req.promoCode?.trim().toUpperCase() || undefined,
        discountAmount: quote.discountAmount,
        addOnFax: Boolean(req.addOnFax),
        addOnSms: Boolean(req.addOnSms),
        addOnEmail: Boolean(req.addOnEmail),
        additionalEmails: req.additionalEmails,
        finalAmount: quote.finalAmount,
        paymentStatus: "DECLINED",
        cardType: req.cardType || "Visa",
      };
      return {
        approved: false,
        order,
        errorMessage: "Simulated card decline (4000... test card triggers decline). Use 4242... to approve.",
      };
    }

    const order: ServiceOrder = {
      id: `ORD-${Date.now()}`,
      filingId: req.filing.id,
      packageType: quote.packageType,
      pricingTier: quote.pricingTier,
      baseAmount: quote.baseAmount,
      discountCode: req.promoCode?.trim().toUpperCase() || undefined,
      discountAmount: quote.discountAmount,
      addOnFax: Boolean(req.addOnFax),
      addOnSms: Boolean(req.addOnSms),
      addOnEmail: Boolean(req.addOnEmail),
      additionalEmails: req.additionalEmails,
      finalAmount: quote.finalAmount,
      paymentStatus: isResubmission ? "WAIVED_RESUBMIT" : "PAID",
      processorTxId: quote.isWaived ? "SIM-WAIVED" : `SIM-TX-${Math.floor(100000 + Math.random() * 899999)}`,
      invoiceNumber: String(Math.floor(80000 + Math.random() * 19999)),
      cardType: req.cardType || "Visa",
      paidAt: new Date().toISOString(),
    };

    return {
      approved: true,
      order,
    };
  }
}
