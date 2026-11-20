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
      if (
        decoded.filing &&
        (!filing || (decoded.filing.status === "ACCEPTED" && filing.status !== "ACCEPTED"))
      ) {
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

  // If a real IRS-stamped Schedule 1 PDF URL is recorded (from TaxBandits/IRS), stream it
  if (filing.stampedPdfUrl) {
    try {
      const remoteRes = await fetch(filing.stampedPdfUrl);
      if (remoteRes.ok) {
        const buffer = await remoteRes.arrayBuffer();
        return new NextResponse(Buffer.from(buffer), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="IRS-Stamped-Schedule1-${filing.id}.pdf"`,
          },
        });
      }
    } catch {
      // Fallback to local high-fidelity watermarked generator if remote fetch fails
    }
  }

  const pdfBytes = await pdfGenerator.generateSchedule1Pdf(filing, business);
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Schedule1-${filing.id}.pdf"`,
    },
  });
}
