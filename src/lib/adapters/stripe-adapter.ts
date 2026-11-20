import Stripe from "stripe";
import {
  CheckoutChargeRequest,
  CheckoutChargeResult,
  IPaymentGateway,
  ReturnFiling,
  ServiceOrder,
} from "./types";
import { computeServiceFeeQuote, MockCheckoutAdapter } from "./payment-simulator";

export class StripeAdapter implements IPaymentGateway {
  private stripe: Stripe | null = null;
  private fallbackMock = new MockCheckoutAdapter();

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (secretKey) {
      this.stripe = new Stripe(secretKey, {
        apiVersion: "2025-02-24.acacia" as unknown as undefined,
      });
    }
  }

  isConfigured(): boolean {
    return Boolean(this.stripe);
  }

  async chargeServiceFee(req: CheckoutChargeRequest): Promise<CheckoutChargeResult> {
    const isResubmission =
      req.filing.status === "EDITING_AFTER_REJECT" &&
      req.filing.serviceOrder?.paymentStatus === "PAID";

    const quote = computeServiceFeeQuote({
      formType: req.filing.formType,
      vehicleCount: req.filing.lines.length,
      packageType: req.packageType || req.filing.packageType,
      promoCode: req.promoCode,
      addOnFax: req.addOnFax,
      addOnSms: req.addOnSms,
      isResubmissionAfterReject: isResubmission,
      hasUnlimitedAnnualPlan: req.hasUnlimitedAnnualPlan,
      isNativeVinCorrection: true,
    });

    // If waived or free resubmission, approve immediately without charging card
    if (quote.isWaived || quote.finalAmount === 0) {
      const order: ServiceOrder = {
        id: `ORD-${Date.now()}`,
        filingId: req.filing.id,
        packageType: quote.packageType,
        pricingTier: quote.pricingTier,
        baseAmount: quote.baseAmount,
        discountCode: req.promoCode?.trim().toUpperCase() || undefined,
        discountAmount: quote.discountAmount,
        addOnFax: Boolean(req.addOnFax),
        addOnSms: Boolean(req.addOnSms),
        addOnEmail: Boolean(req.addOnEmail),
        additionalEmails: req.additionalEmails,
        finalAmount: 0,
        paymentStatus: isResubmission ? "WAIVED_RESUBMIT" : "PAID",
        processorTxId: "STRIPE-WAIVED",
        invoiceNumber: String(Math.floor(80000 + Math.random() * 19999)),
        cardType: req.cardType || "Visa",
        paidAt: new Date().toISOString(),
      };
      return { approved: true, order };
    }

    // If Stripe keys are not provided, fall back gracefully to simulator
    if (!this.stripe) {
      return this.fallbackMock.chargeServiceFee(req);
    }

    try {
      const amountInCents = Math.round(quote.finalAmount * 100);

      // Charge via provided PaymentMethod ID
      if (req.paymentMethodId) {
        const paymentIntent = await this.stripe.paymentIntents.create({
          amount: amountInCents,
          currency: "usd",
          payment_method: req.paymentMethodId,
          confirm: true,
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: "never",
          },
          description: `IRS Form 2290 E-File Service Fee - Filing ${req.filing.id}`,
          metadata: {
            filingId: req.filing.id,
            packageType: quote.packageType,
            pricingTier: quote.pricingTier,
          },
        });

        if (paymentIntent.status === "succeeded") {
          const order: ServiceOrder = {
            id: `ORD-${Date.now()}`,
            filingId: req.filing.id,
            packageType: quote.packageType,
            pricingTier: quote.pricingTier,
            baseAmount: quote.baseAmount,
            discountCode: req.promoCode?.trim().toUpperCase() || undefined,
            discountAmount: quote.discountAmount,
            addOnFax: Boolean(req.addOnFax),
            addOnSms: Boolean(req.addOnSms),
            addOnEmail: Boolean(req.addOnEmail),
            additionalEmails: req.additionalEmails,
            finalAmount: quote.finalAmount,
            paymentStatus: "PAID",
            processorTxId: paymentIntent.id,
            invoiceNumber: String(Math.floor(80000 + Math.random() * 19999)),
            cardType: req.cardType || "Stripe Card",
            paidAt: new Date().toISOString(),
          };
          return { approved: true, order };
        } else {
          return {
            approved: false,
            errorMessage: `Stripe payment requires additional action or did not succeed (status: ${paymentIntent.status}).`,
            order: {
              id: `ORD-${Date.now()}`,
              filingId: req.filing.id,
              packageType: quote.packageType,
              pricingTier: quote.pricingTier,
              baseAmount: quote.baseAmount,
              discountAmount: 0,
              finalAmount: quote.finalAmount,
              paymentStatus: "DECLINED",
              addOnFax: Boolean(req.addOnFax),
              addOnSms: Boolean(req.addOnSms),
            },
          };
        }
      }

      // If raw test card is used in Stripe Live/Test mode without client Elements token
      return this.fallbackMock.chargeServiceFee(req);
    } catch (err) {
      return {
        approved: false,
        errorMessage: err instanceof Error ? err.message : "Stripe payment processing failed",
        order: {
          id: `ORD-${Date.now()}`,
          filingId: req.filing.id,
          packageType: quote.packageType,
          pricingTier: quote.pricingTier,
          baseAmount: quote.baseAmount,
          discountAmount: 0,
          finalAmount: quote.finalAmount,
          paymentStatus: "DECLINED",
          addOnFax: Boolean(req.addOnFax),
          addOnSms: Boolean(req.addOnSms),
        },
      };
    }
  }

  /**
   * Create a Hosted Stripe Checkout Session (Apple Pay, Google Pay, Cards, Link)
   */
  async createHostedCheckoutSession(params: {
    filing: ReturnFiling;
    quote: ReturnType<typeof computeServiceFeeQuote>;
    returnUrl: string;
    customerEmail?: string;
  }): Promise<{ url: string; sessionId: string }> {
    if (!this.stripe) {
      throw new Error("Stripe is not configured. Missing STRIPE_SECRET_KEY.");
    }

    const amountInCents = Math.round(params.quote.finalAmount * 100);

    const session = await this.stripe.checkout.sessions.create({
      customer_email: params.customerEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `IRS Form 2290 Filing Fee (${params.quote.pricingTier})`,
              description: `Tax Year ${params.filing.taxYear} e-file service processing fee`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${params.returnUrl}?editFilingId=${params.filing.id}&step=7&stripe_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${params.returnUrl}?editFilingId=${params.filing.id}&step=6`,
      metadata: {
        filingId: params.filing.id,
        packageType: params.quote.packageType,
        pricingTier: params.quote.pricingTier,
      },
    });

    if (!session.url) {
      throw new Error("Stripe failed to return Checkout Session URL.");
    }

    return {
      url: session.url,
      sessionId: session.id,
    };
  }
}
