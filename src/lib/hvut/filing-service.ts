import { SimulatedMefAdapter } from "../adapters/mef-simulator";
import { TaxBanditsAdapter } from "../adapters/taxbandits-adapter";
import { MockCheckoutAdapter } from "../adapters/payment-simulator";
import { MockWatermarkedPdfAdapter } from "../adapters/pdf-generator";
import {
  BusinessEntity,
  PackageType,
  ReturnFiling,
  TaxPaymentInstruction,
  UserRole,
} from "../adapters/types";
import {
  addAuditLog,
  addNotification,
  getAcceptedVinsForBusinessTaxYear,
  getBusinessById,
  getFilingById,
  getSimulatorConfig,
  saveFiling,
  upsertBusiness,
  upsertVehicle,
} from "./db";
import { lookupRejection } from "../adapters/rejection-codes";

export const pdfGenerator = new MockWatermarkedPdfAdapter();

export async function checkoutAndTransmitFiling(params: {
  filingId: string;
  actorRole: UserRole;
  actorName: string;
  cardNumber: string;
  cardType?: string;
  promoCode?: string;
  packageType?: PackageType;
  addOnFax?: boolean;
  addOnSms?: boolean;
  addOnEmail?: boolean;
  additionalEmails?: string;
  faxNumber?: string;
  pinSignature: string;
  taxPayment: TaxPaymentInstruction;
  hasUnlimitedAnnualPlan?: boolean;
  skipTransmit?: boolean;
  business?: BusinessEntity;
  filing?: ReturnFiling;
}) {
  if (params.business) {
    upsertBusiness(params.business);
  }
  let filing = getFilingById(params.filingId);
  if (!filing && params.filing) {
    saveFiling(params.filing);
    filing = getFilingById(params.filingId) ?? params.filing;
  }
  if (!filing) throw new Error("Filing not found.");
  let business = getBusinessById(filing.businessId);
  if (!business && params.business) {
    business = upsertBusiness(params.business);
  }
  if (!business) throw new Error("Business entity not found.");

  // 1. Stream A: Simulated Platform Service Fee Checkout (only charge if not already PAID for this return)
  const alreadyPaid =
    filing.status === "PAID" && filing.serviceOrder?.paymentStatus === "PAID";

  if (!alreadyPaid) {
    const paymentGateway = new MockCheckoutAdapter();
    const charge = await paymentGateway.chargeServiceFee({
      filing,
      cardNumber: params.cardNumber,
      cardType: params.cardType,
      promoCode: params.promoCode,
      packageType: params.packageType,
      addOnFax: params.addOnFax,
      addOnSms: params.addOnSms,
      addOnEmail: params.addOnEmail,
      additionalEmails: params.additionalEmails,
      hasUnlimitedAnnualPlan: params.hasUnlimitedAnnualPlan,
    });

    if (!charge.approved) {
      filing.serviceOrder = charge.order;
      saveFiling(filing);
      addAuditLog({
        actorRole: params.actorRole,
        actorName: params.actorName,
        action: "CHECKOUT_DECLINED",
        entityType: "ReturnFiling",
        entityId: filing.id,
        details: charge.errorMessage || "Card declined during simulated checkout.",
      });
      return { ok: false as const, error: charge.errorMessage, filing };
    }

    filing.serviceOrder = charge.order;
  }

  filing.taxPayment = params.taxPayment;
  filing.pinSignature = params.pinSignature || filing.pinSignature || "12345";
  filing.status = "PAID";
  filing.submittedAt = new Date().toISOString();
  saveFiling(filing);

  if (params.skipTransmit) {
    addAuditLog({
      actorRole: params.actorRole,
      actorName: params.actorName,
      action: "SERVICE_FEE_PAID",
      entityType: "ReturnFiling",
      entityId: filing.id,
      details: `Service fee paid ($${filing.serviceOrder?.finalAmount.toFixed(2)}). Awaiting Transaction PIN & IRS submission.`,
    });
    return { ok: true as const, filing };
  }

  // Sync active vehicles to fleet roster on original filings
  if (filing.formType === "2290_ORIG") {
    for (const line of filing.lines) {
      if (line.lineType === "TAXABLE" || line.lineType === "SUSPENDED") {
        upsertVehicle({
          id: `veh-${business.id}-${line.vin}`,
          businessId: business.id,
          vin: line.vin,
          unitNumber: line.unitNumber,
          defaultWeightCategory: line.weightCategory,
          isLogging: line.isLogging,
          isAgricultural: line.isAgricultural,
          status: "ACTIVE",
        });
      }
    }
  }

  // 2. Transmit to IRS Gateway (TaxBandits if configured, else MeF Simulator)
  const config = getSimulatorConfig();
  const taxBandits = new TaxBanditsAdapter();
  const mef = taxBandits.isConfigured() ? taxBandits : new SimulatedMefAdapter(config);
  const existingAcceptedVins = getAcceptedVinsForBusinessTaxYear(
    business.id,
    filing.taxYear,
    filing.id,
  );

  const result = await mef.transmit(filing, business, existingAcceptedVins);

  filing.irsSubmissionId = result.irsSubmissionId;
  filing.mefXml = result.generatedXml;
  filing.status = result.status;
  filing.rejectionCode = result.rejectionCode;
  filing.rejectionMessage = result.rejectionMessage;
  if (result.status === "ACCEPTED") {
    filing.acceptedAt = new Date().toISOString();
  }
  saveFiling(filing);

  // 3. Emit Simulated Notifications & Audit Logs
  dispatchOutcomeNotifications(
    filing,
    business,
    params.addOnSms ?? filing.serviceOrder?.addOnSms,
    params.addOnFax ?? filing.serviceOrder?.addOnFax,
    params.faxNumber,
    params.additionalEmails ?? filing.serviceOrder?.additionalEmails,
  );

  addAuditLog({
    actorRole: params.actorRole,
    actorName: params.actorName,
    action: `MEF_TRANSMIT_${result.status}`,
    entityType: "ReturnFiling",
    entityId: filing.id,
    details: `Mode=${config.mode}, SubmissionId=${result.irsSubmissionId}${result.rejectionCode ? `, Code=${result.rejectionCode}` : ""
      }`,
  });

  return { ok: true as const, filing };
}

export function applyAdminSimulatedDecision(params: {
  filingId: string;
  decision: "ACCEPT" | "REJECT";
  rejectionCode?: string;
  actorName: string;
}) {
  const filing = getFilingById(params.filingId);
  if (!filing) throw new Error("Filing not found.");
  const business = getBusinessById(filing.businessId);
  if (!business) throw new Error("Business entity not found.");

  if (params.decision === "ACCEPT") {
    filing.status = "ACCEPTED";
    filing.acceptedAt = new Date().toISOString();
    filing.rejectionCode = undefined;
    filing.rejectionMessage = undefined;
  } else {
    const code = params.rejectionCode || "F2290-001";
    const def = lookupRejection(code);
    filing.status = "EDITING_AFTER_REJECT";
    filing.rejectionCode = code;
    filing.rejectionMessage = def?.irsMessage ?? `Rejected by simulator (${code})`;
  }

  saveFiling(filing);
  dispatchOutcomeNotifications(
    filing,
    business,
    filing.serviceOrder?.addOnSms,
    filing.serviceOrder?.addOnFax,
    undefined,
    filing.serviceOrder?.additionalEmails,
  );

  addAuditLog({
    actorRole: "ADMIN",
    actorName: params.actorName,
    action: `ADMIN_SIMULATED_${params.decision}`,
    entityType: "ReturnFiling",
    entityId: filing.id,
    details:
      params.decision === "ACCEPT"
        ? `Manually accepted Submission ${filing.irsSubmissionId}`
        : `Manually rejected with code ${filing.rejectionCode}`,
  });

  return filing;
}

function dispatchOutcomeNotifications(
  filing: ReturnFiling,
  business: BusinessEntity,
  addOnSms?: boolean,
  addOnFax?: boolean,
  faxNumber?: string,
  additionalEmails?: string,
) {
  if (filing.status === "ACCEPTED") {
    const recipients = [business.pocEmail || business.signingAuthorityEmail || business.signingAuthorityName];
    if (additionalEmails) {
      recipients.push(
        ...additionalEmails
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
    }
    addNotification({
      filingId: filing.id,
      channel: "EMAIL",
      recipient: recipients.join(", "),
      subject: `IRS Schedule 1 Accepted — ${business.legalName} (${filing.taxYear})`,
      body: `Simulated IRS MeF accepted filing ${filing.displayReturnId || filing.id} (Submission ID: ${filing.irsSubmissionId}). Net HVUT Tax: $${filing.netTaxDue.toFixed(2)}. Your watermarked Rev. July 2026 Schedule 1 PDF is ready.`,
      attachmentUrl: `/api/filings/${filing.id}/schedule1`,
    });
    if (addOnSms) {
      addNotification({
        filingId: filing.id,
        channel: "SMS",
        recipient: business.phone,
        subject: "IRS Form 2290 ACCEPTED",
        body: `[IRS-HVUT] ${business.legalName}: Form 2290 (${filing.irsSubmissionId}) ACCEPTED! Schedule 1 is available in your dashboard.`,
      });
    }
    if (addOnFax) {
      addNotification({
        filingId: filing.id,
        channel: "FAX",
        recipient: faxNumber || "DMV / Dispatch Fax",
        subject: `Schedule 1 Fax Delivery — ${business.legalName}`,
        body: `Simulated fax transmission of watermarked Schedule 1 PDF (${filing.lines.length} vehicles) queued and delivered.`,
        attachmentUrl: `/api/filings/${filing.id}/schedule1`,
      });
    }
  } else if (filing.status === "EDITING_AFTER_REJECT") {
    const def = lookupRejection(filing.rejectionCode);
    addNotification({
      filingId: filing.id,
      channel: "EMAIL",
      recipient: business.pocEmail || business.signingAuthorityName,
      subject: `Action Required: IRS Rejected Filing ${filing.displayReturnId || filing.id} (${filing.rejectionCode})`,
      body: `IRS Rejection ${filing.rejectionCode}: ${filing.rejectionMessage}\n\nHow to fix: ${def?.humanFixGuide ?? "Edit and resubmit for $0 service fee."}`,
    });
    if (addOnSms) {
      addNotification({
        filingId: filing.id,
        channel: "SMS",
        recipient: business.phone,
        subject: "IRS Form 2290 REJECTED",
        body: `[IRS-HVUT] Filing ${filing.displayReturnId || filing.id} rejected (${filing.rejectionCode}). Fix & resubmit FREE in your dashboard.`,
      });
    }
  } else if (filing.status === "TRANSMITTED_TO_IRS") {
    addNotification({
      filingId: filing.id,
      channel: "EMAIL",
      recipient: business.pocEmail || business.signingAuthorityName,
      subject: `Transmitted to IRS MeF Simulator — ${filing.displayReturnId || filing.id}`,
      body: `Submission ${filing.irsSubmissionId} is awaiting IRS acknowledgment (Manual Review mode is active in Simulator Console).`,
    });
  } else if (filing.status === "QUEUED") {
    addNotification({
      filingId: filing.id,
      channel: "EMAIL",
      recipient: business.pocEmail || business.signingAuthorityName,
      subject: `Queued During IRS Maintenance — ${filing.displayReturnId || filing.id}`,
      body: `IRS MeF Gateway is currently in simulated maintenance mode (503). Your filing is safely queued for retry.`,
    });
  }
}
