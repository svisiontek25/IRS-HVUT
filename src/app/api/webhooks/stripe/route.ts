import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getFilingById, saveFiling, addAuditLog } from "@/lib/hvut/db";

export async function POST(request: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secretKey) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: "2025-02-24.acacia" as unknown as undefined,
    });

    const bodyText = await request.text();
    const sig = request.headers.get("stripe-signature");

    let event: Stripe.Event;

    if (webhookSecret && sig) {
      try {
        event = stripe.webhooks.constructEvent(bodyText, sig, webhookSecret);
      } catch (err) {
        return NextResponse.json(
          { error: `Webhook signature verification failed: ${err instanceof Error ? err.message : ""}` },
          { status: 400 },
        );
      }
    } else {
      // In development / testing without webhook secret
      event = JSON.parse(bodyText) as Stripe.Event;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const filingId = session.metadata?.filingId;

      if (filingId) {
        const filing = getFilingById(filingId);
        if (filing) {
          const paidAmount = session.amount_total ? session.amount_total / 100 : 0;
          filing.status = "PAID";
          filing.serviceOrder = {
            id: `ORD-${Date.now()}`,
            filingId: filing.id,
            packageType: filing.packageType || "PER_VEHICLE",
            pricingTier: session.metadata?.pricingTier || "Stripe Checkout",
            baseAmount: paidAmount,
            finalAmount: paidAmount,
            discountAmount: 0,
            paymentStatus: "PAID",
            processorTxId:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : `ST-${session.id}`,
            cardType: "Stripe Checkout",
            paidAt: new Date().toISOString(),
            addOnFax: false,
            addOnSms: false,
          };

          saveFiling(filing);

          addAuditLog({
            actorRole: "ADMIN",
            actorName: "Stripe Webhook",
            action: "STRIPE_PAYMENT_SUCCESS",
            entityType: "ReturnFiling",
            entityId: filing.id,
            details: `Filing service fee of $${paidAmount.toFixed(2)} paid via Stripe Checkout (${session.id})`,
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stripe webhook error" },
      { status: 500 },
    );
  }
}
