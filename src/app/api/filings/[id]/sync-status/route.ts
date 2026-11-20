import { NextResponse } from "next/server";
import { getBusinessById, getFilingById, saveFiling, addAuditLog, addNotification } from "@/lib/hvut/db";
import { TaxBanditsAdapter } from "@/lib/adapters/taxbandits-adapter";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const filing = getFilingById(id);

    if (!filing) {
      return NextResponse.json({ error: "Filing not found" }, { status: 404 });
    }

    if (!filing.irsSubmissionId) {
      return NextResponse.json(
        { error: "Filing has not been transmitted to IRS yet." },
        { status: 400 },
      );
    }

    const adapter = new TaxBanditsAdapter();
    const statusResult = await adapter.checkStatus(filing.irsSubmissionId);

    let changed = false;
    if (statusResult.status === "ACCEPTED" && filing.status !== "ACCEPTED") {
      filing.status = "ACCEPTED";
      filing.acceptedAt = statusResult.irsAcceptedDate || new Date().toISOString();
      filing.stampedPdfUrl = statusResult.schedule1PdfUrl || filing.stampedPdfUrl;
      filing.rejectionCode = undefined;
      filing.rejectionMessage = undefined;
      changed = true;

      const business = getBusinessById(filing.businessId);
      if (business) {
        addNotification({
          filingId: filing.id,
          channel: "EMAIL",
          recipient:
            business.pocEmail || business.signingAuthorityEmail || "filer@example.com",
          subject: `IRS Accepted: Form 2290 Schedule 1 Ready (${filing.taxYear})`,
          body: `Your Form 2290 filing has been accepted by the IRS. Schedule 1 is now available.`,
          attachmentUrl: filing.stampedPdfUrl,
        });
      }
    } else if (
      statusResult.status === "EDITING_AFTER_REJECT" &&
      filing.status !== "EDITING_AFTER_REJECT"
    ) {
      filing.status = "EDITING_AFTER_REJECT";
      filing.rejectionCode = statusResult.rejectionCode;
      filing.rejectionMessage = statusResult.rejectionMessage;
      changed = true;
    }

    if (changed || statusResult.rawDetails) {
      filing.submissionStatusDetails = statusResult.rawDetails;
      saveFiling(filing);

      addAuditLog({
        actorRole: "ADMIN",
        actorName: "Status Poller",
        action: `IRS_STATUS_CHECK_${filing.status}`,
        entityType: "ReturnFiling",
        entityId: filing.id,
        details: `Synced status from TaxBandits: ${filing.status}`,
      });
    }

    return NextResponse.json({
      filing,
      status: filing.status,
      stampedPdfUrl: filing.stampedPdfUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync status" },
      { status: 500 },
    );
  }
}
