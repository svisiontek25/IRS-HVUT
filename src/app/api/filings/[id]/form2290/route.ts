import { NextResponse } from "next/server";
import { getBusinessById, getFilingById } from "@/lib/hvut/db";
import { pdfGenerator } from "@/lib/hvut/filing-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const filing = getFilingById(id);
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

