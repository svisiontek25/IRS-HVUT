import { NextResponse } from "next/server";
import { getBusinessById, getFilingById } from "@/lib/hvut/db";
import { computeServiceFeeQuote } from "@/lib/adapters/payment-simulator";
import { StripeAdapter } from "@/lib/adapters/stripe-adapter";
import { PackageType } from "@/lib/adapters/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      filingId: string;
      packageType?: PackageType;
      promoCode?: string;
      addOnFax?: boolean;
      addOnSms?: boolean;
      hasUnlimitedAnnualPlan?: boolean;
      returnUrl?: string;
    };

    const filing = getFilingById(body.filingId);
    if (!filing) {
      return NextResponse.json({ error: "Filing not found" }, { status: 404 });
    }

    const business = getBusinessById(filing.businessId);

    const quote = computeServiceFeeQuote({
      formType: filing.formType,
      vehicleCount: filing.lines.length,
      packageType: body.packageType || filing.packageType,
      promoCode: body.promoCode,
      addOnFax: body.addOnFax,
      addOnSms: body.addOnSms,
      hasUnlimitedAnnualPlan: body.hasUnlimitedAnnualPlan,
    });

    const adapter = new StripeAdapter();
    if (!adapter.isConfigured()) {
      return NextResponse.json(
        {
          error:
            "Stripe is not configured yet. Please add STRIPE_SECRET_KEY to your environment variables or Hostinger server settings.",
        },
        { status: 503 },
      );
    }

    const origin =
      body.returnUrl ||
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const session = await adapter.createHostedCheckoutSession({
      filing,
      quote,
      returnUrl: `${origin}/file/new`,
      customerEmail: business?.pocEmail || business?.signingAuthorityEmail,
    });

    return NextResponse.json({ url: session.url, sessionId: session.sessionId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create Stripe session" },
      { status: 500 },
    );
  }
}
