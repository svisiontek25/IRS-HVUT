import { NextResponse } from "next/server";
import { checkoutAndTransmitFiling } from "@/lib/hvut/filing-service";
import {
  BusinessEntity,
  PackageType,
  ReturnFiling,
  TaxPaymentInstruction,
  UserRole,
} from "@/lib/adapters/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      actorRole?: UserRole;
      actorName?: string;
      cardNumber: string;
      cardType?: string;
      promoCode?: string;
      packageType?: PackageType;
      addOnFax?: boolean;
      addOnSms?: boolean;
      addOnEmail?: boolean;
      additionalEmails?: string;
      faxNumber?: string;
      pinSignature?: string;
      taxPayment: TaxPaymentInstruction;
      hasUnlimitedAnnualPlan?: boolean;
      skipTransmit?: boolean;
      business?: BusinessEntity;
      filing?: ReturnFiling;
    };

    const result = await checkoutAndTransmitFiling({
      filingId: id,
      actorRole: body.actorRole ?? "OWNER_OP",
      actorName: body.actorName ?? "Demo User",
      cardNumber: body.cardNumber || "4242424242424242",
      cardType: body.cardType,
      promoCode: body.promoCode,
      packageType: body.packageType,
      addOnFax: body.addOnFax,
      addOnSms: body.addOnSms,
      addOnEmail: body.addOnEmail,
      additionalEmails: body.additionalEmails,
      faxNumber: body.faxNumber,
      pinSignature: body.pinSignature || "12345",
      taxPayment: body.taxPayment,
      hasUnlimitedAnnualPlan: body.hasUnlimitedAnnualPlan,
      skipTransmit: body.skipTransmit,
      business: body.business,
      filing: body.filing,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || "Payment declined", filing: result.filing },
        { status: 402 },
      );
    }

    return NextResponse.json({ filing: result.filing });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to transmit filing" },
      { status: 500 },
    );
  }
}
