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
  if (filing.status !== "ACCEPTED") {
    return NextResponse.json(
      { error: "Schedule 1 PDF is only available after IRS acceptance." },
      { status: 400 },
    );
  }
  const business = getBusinessById(filing.businessId);
  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const pdfBytes = await pdfGenerator.generateSchedule1Pdf(filing, business);
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Simulated-Schedule1-${filing.id}.pdf"`,
    },
  });
}

