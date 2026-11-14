import { NextResponse } from "next/server";
import { getBusinessById, listFilings, makeDisplayReturnId, saveFiling } from "@/lib/hvut/db";
import { ReturnFiling, VehicleLineType } from "@/lib/adapters/types";

const CREDIT_TYPES = new Set<VehicleLineType>([
  "CREDIT",
  "CREDIT_LOW_MILEAGE",
  "CREDIT_OVERPAID",
]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId") || undefined;
  return NextResponse.json({ filings: listFilings(businessId) });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ReturnFiling>;
    if (!body.businessId || !body.formType || !body.taxYear) {
      return NextResponse.json(
        { error: "businessId, formType, and taxYear are required" },
        { status: 400 },
      );
    }

    const biz = getBusinessById(body.businessId);
    if (!biz) {
      return NextResponse.json({ error: "Business entity not found" }, { status: 404 });
    }

    const lines = body.lines ?? [];
    const totalTaxDue = Number(
      lines
        .filter((l) => !CREDIT_TYPES.has(l.lineType))
        .reduce((acc, l) => acc + Number(l.computedTax || 0), 0)
        .toFixed(2),
    );
    const totalCredits = Number(
      lines
        .filter((l) => CREDIT_TYPES.has(l.lineType))
        .reduce((acc, l) => acc + Number(l.computedTax || 0), 0)
        .toFixed(2),
    );
    const netTaxDue = Math.max(0, Number((totalTaxDue - totalCredits).toFixed(2)));

    const filingId =
      body.id || `FIL-${body.taxYear.split("-")[0]}-${Math.floor(1000 + Math.random() * 9000)}`;
    const displayReturnId =
      body.displayReturnId || makeDisplayReturnId(body.formType, body.taxYear);

    const filing: ReturnFiling = {
      id: filingId,
      displayReturnId,
      businessId: body.businessId,
      formType: body.formType,
      taxYear: body.taxYear,
      firstUsedMonth: body.firstUsedMonth ?? 7,
      addressChange: Boolean(body.addressChange),
      finalReturn: Boolean(body.finalReturn),
      eFileMethod: body.eFileMethod ?? true,
      thirdPartyAssigned: Boolean(body.thirdPartyAssigned),
      consentToDisclosure: body.consentToDisclosure ?? true,
      priorYearSuspendedAllUnderLimit: Boolean(body.priorYearSuspendedAllUnderLimit),
      packageType: body.packageType,
      additionalEmails: body.additionalEmails,
      amendedReason: body.amendedReason,
      status: body.status ?? "VALIDATED",
      irsSubmissionId: body.irsSubmissionId,
      mefXml: body.mefXml,
      rejectionCode: body.rejectionCode,
      rejectionMessage: body.rejectionMessage,
      pinSignature: body.pinSignature,
      totalTaxDue,
      totalCredits,
      netTaxDue,
      createdAt: body.createdAt || new Date().toISOString(),
      submittedAt: body.submittedAt,
      acceptedAt: body.acceptedAt,
      lines: lines.map((l, idx) => ({
        ...l,
        id: l.id || `line-${Date.now()}-${idx}`,
        filingId,
      })),
      serviceOrder: body.serviceOrder,
      taxPayment: body.taxPayment,
    };

    saveFiling(filing);
    return NextResponse.json({ filing });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save filing" },
      { status: 500 },
    );
  }
}
