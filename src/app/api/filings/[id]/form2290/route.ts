import { NextResponse } from "next/server";
import { getBusinessById, getFilingById, saveFiling, upsertBusiness } from "@/lib/hvut/db";
import { pdfGenerator } from "@/lib/hvut/filing-service";
import { BusinessEntity, ReturnFiling } from "@/lib/adapters/types";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  let filing = getFilingById(id);
  const ctx = new URL(request.url).searchParams.get("ctx");
  if (ctx) {
    try {
      const decoded = JSON.parse(Buffer.from(ctx, "base64url").toString("utf8")) as {
        filing?: ReturnFiling;
        business?: BusinessEntity;
      };
      if (decoded.business) upsertBusiness(decoded.business);
      if (decoded.filing && !filing) {
        saveFiling(decoded.filing);
        filing = decoded.filing;
      }
    } catch {
      // Ignore malformed context parameter
    }
  }
  if (!filing) {
    return NextResponse.json({ error: "Filing not found" }, { status: 404 });
  }
  const business = getBusinessById(filing.businessId);
  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const pdfBytes = await pdfGenerator.generateForm2290Pdf(filing, business);
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="IRS-Form-2290-${filing.displayReturnId || filing.id}.pdf"`,
    },
  });
}
