import { NextResponse } from "next/server";
import { getDb, getBusinessById, saveFiling, addAuditLog, addNotification } from "@/lib/hvut/db";
import { ReturnFiling } from "@/lib/adapters/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const submissionId =
      body.SubmissionId || body.submissionId || body.Data?.SubmissionId;
    const status = String(
      body.Status || body.status || body.Data?.Status || "",
    ).toUpperCase();

    if (!submissionId) {
      return NextResponse.json(
        { error: "Missing SubmissionId in webhook payload" },
        { status: 400 },
      );
    }

    const db = getDb();
    const filingRow = db
      .prepare("SELECT * FROM filings WHERE irs_submission_id = ?")
      .get(submissionId) as Record<string, unknown> | undefined;

    if (!filingRow) {
      // Return 200 so TaxBandits does not repeatedly retry unknown filings
      return NextResponse.json({
        received: true,
        warning: `No filing found matching SubmissionId: ${submissionId}`,
      });
    }

    const payload = JSON.parse(String(filingRow.payload_json || "{}"));
    const filing: ReturnFiling = {
      id: String(filingRow.id),
      displayReturnId: payload.displayReturnId,
      businessId: String(filingRow.business_id),
      formType: filingRow.form_type as ReturnFiling["formType"],
      taxYear: String(filingRow.tax_year),
      firstUsedMonth: Number(filingRow.first_used_month),
      addressChange: Boolean(filingRow.address_change),
      finalReturn: Boolean(filingRow.final_return),
      eFileMethod: payload.eFileMethod ?? true,
      thirdPartyAssigned: payload.thirdPartyAssigned ?? false,
      consentToDisclosure: payload.consentToDisclosure ?? true,
      priorYearSuspendedAllUnderLimit: payload.priorYearSuspendedAllUnderLimit ?? false,
      packageType: payload.packageType,
      additionalEmails: payload.additionalEmails,
      amendedReason: filingRow.amended_reason
        ? (String(filingRow.amended_reason) as ReturnFiling["amendedReason"])
        : undefined,
      status: filingRow.status as ReturnFiling["status"],
      irsSubmissionId: submissionId,
      mefXml: filingRow.mef_xml ? String(filingRow.mef_xml) : undefined,
      rejectionCode: filingRow.rejection_code ? String(filingRow.rejection_code) : undefined,
      rejectionMessage: filingRow.rejection_message
        ? String(filingRow.rejection_message)
        : undefined,
      pinSignature: filingRow.pin_signature ? String(filingRow.pin_signature) : undefined,
      stampedPdfUrl: payload.stampedPdfUrl,
      submissionStatusDetails: payload.submissionStatusDetails,
      totalTaxDue: Number(filingRow.total_tax_due),
      totalCredits: Number(filingRow.total_credits),
      netTaxDue: Number(filingRow.net_tax_due),
      createdAt: String(filingRow.created_at),
      submittedAt: filingRow.submitted_at ? String(filingRow.submitted_at) : undefined,
      acceptedAt: filingRow.accepted_at ? String(filingRow.accepted_at) : undefined,
      lines: payload.lines ?? [],
      serviceOrder: payload.serviceOrder,
      taxPayment: payload.taxPayment,
    };

    const schedule1PdfUrl =
      body.Schedule1PdfUrl ||
      body.schedule1PdfUrl ||
      body.Data?.Schedule1PdfUrl ||
      payload.stampedPdfUrl;

    if (status === "ACCEPTED" || status === "IRS_ACCEPTED") {
      filing.status = "ACCEPTED";
      filing.acceptedAt = new Date().toISOString();
      filing.stampedPdfUrl = schedule1PdfUrl;
      filing.rejectionCode = undefined;
      filing.rejectionMessage = undefined;

      saveFiling(filing);

      addAuditLog({
        actorRole: "ADMIN",
        actorName: "TaxBandits Webhook",
        action: "IRS_STATUS_ACCEPTED",
        entityType: "ReturnFiling",
        entityId: filing.id,
        details: `Return accepted by IRS via TaxBandits. Stamped PDF: ${schedule1PdfUrl || "Available"}`,
      });

      const business = getBusinessById(filing.businessId);
      if (business) {
        addNotification({
          filingId: filing.id,
          channel: "EMAIL",
          recipient:
            business.pocEmail || business.signingAuthorityEmail || "filer@example.com",
          subject: `IRS Accepted: Form 2290 Schedule 1 Ready (${filing.taxYear})`,
          body: `Good news! Your Form 2290 filing has been officially accepted by the IRS. Your watermarked Schedule 1 is now available for download.`,
          attachmentUrl: schedule1PdfUrl,
        });
      }
    } else if (status === "REJECTED" || status === "IRS_REJECTED") {
      const errors = body.Errors || body.errors || body.Data?.Errors || [];
      const errCode = errors[0]?.Code || body.ErrorCode || "F2290-REJECTED";
      const errDesc =
        errors.map((e: { Code: string; Message: string }) => `${e.Code}: ${e.Message}`).join("; ") ||
        body.ErrorMessage ||
        "The return was rejected by the IRS.";

      filing.status = "EDITING_AFTER_REJECT";
      filing.rejectionCode = errCode;
      filing.rejectionMessage = errDesc;

      saveFiling(filing);

      addAuditLog({
        actorRole: "ADMIN",
        actorName: "TaxBandits Webhook",
        action: "IRS_STATUS_REJECTED",
        entityType: "ReturnFiling",
        entityId: filing.id,
        details: `Return rejected by IRS: ${errDesc}`,
      });
    }

    return NextResponse.json({ success: true, filingId: filing.id, status: filing.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook handler failed" },
      { status: 500 },
    );
  }
}
