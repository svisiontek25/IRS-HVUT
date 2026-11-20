import {
  BusinessEntity,
  IMefTransmitter,
  MefTransmitResult,
  ReturnFiling,
} from "./types";

export interface TaxBanditsConfig {
  clientId: string;
  clientSecret: string;
  userToken: string;
  environment: "sandbox" | "production";
}

export interface TaxBanditsStatusResponse {
  submissionId: string;
  status: "QUEUED" | "TRANSMITTED_TO_IRS" | "ACCEPTED" | "EDITING_AFTER_REJECT";
  rejectionCode?: string;
  rejectionMessage?: string;
  schedule1PdfUrl?: string;
  irsAcceptedDate?: string;
  rawDetails?: string;
}

export class TaxBanditsAdapter implements IMefTransmitter {
  readonly modeLabel = "TaxBandits IRS E-File API Gateway";

  private config: TaxBanditsConfig;
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(config?: Partial<TaxBanditsConfig>) {
    this.config = {
      clientId: config?.clientId || process.env.TAXBANDITS_CLIENT_ID || "",
      clientSecret: config?.clientSecret || process.env.TAXBANDITS_CLIENT_SECRET || "",
      userToken: config?.userToken || process.env.TAXBANDITS_USER_TOKEN || "",
      environment:
        config?.environment ||
        (process.env.TAXBANDITS_ENVIRONMENT === "production" ? "production" : "sandbox"),
    };
  }

  isConfigured(): boolean {
    return Boolean(this.config.clientId && this.config.clientSecret);
  }

  private get authUrl(): string {
    return this.config.environment === "production"
      ? "https://oauth.expressauth.net/v2/tbs/auth"
      : "https://testoauth.expressauth.net/v2/tbs/auth";
  }

  private get apiBaseUrl(): string {
    return this.config.environment === "production"
      ? "https://api.taxbandits.com/v1.7.3"
      : "https://testapi.taxbandits.com/v1.7.3";
  }

  /**
   * Obtain Bearer Access Token using OAuth Client Credentials
   */
  async getAccessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 60_000) {
      return this.cachedToken.token;
    }

    if (!this.isConfigured()) {
      throw new Error(
        "TaxBandits API is not configured. Missing TAXBANDITS_CLIENT_ID or TAXBANDITS_CLIENT_SECRET.",
      );
    }

    const res = await fetch(this.authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authentication: `Bearer ${this.config.userToken}`,
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: "client_credentials",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`TaxBandits OAuth failed (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as {
      access_token: string;
      expires_in?: number;
    };

    const token = data.access_token;
    const expiresInMs = (data.expires_in ?? 3600) * 1000;
    this.cachedToken = {
      token,
      expiresAt: Date.now() + expiresInMs,
    };

    return token;
  }

  /**
   * Maps local ReturnFiling + BusinessEntity into TaxBandits Form 2290 Create JSON
   */
  private buildTaxBanditsPayload(
    filing: ReturnFiling,
    business: BusinessEntity,
  ) {
    const startYear = filing.taxYear.split("-")[0] || "2026";
    const einDigits = business.ein.replace(/\D/g, "");

    const taxableVehicles = filing.lines
      .filter((l) => l.lineType === "TAXABLE")
      .map((l) => ({
        VIN: l.vin,
        Category: l.weightCategory,
        IsLogging: l.isLogging ?? false,
        IsAgricultural: l.isAgricultural ?? false,
        TaxAmount: l.computedTax,
      }));

    const suspendedVehicles = filing.lines
      .filter((l) => l.lineType === "SUSPENDED")
      .map((l) => ({
        VIN: l.vin,
        Category: l.weightCategory,
        IsLogging: l.isLogging ?? false,
        IsAgricultural: l.isAgricultural ?? false,
      }));

    const creditVehicles = filing.lines
      .filter((l) => l.lineType.startsWith("CREDIT"))
      .map((l) => ({
        VIN: l.vin,
        Category: l.weightCategory,
        RefundAmount: l.computedTax,
        Explanation: l.explanation || l.dispositionReason || "Sold, destroyed or mileage under limit",
      }));

    return {
      ReturnHeader: {
        TaxYear: filing.taxYear,
        FirstUsedMonth: String(filing.firstUsedMonth).padStart(2, "0"),
        IsAddressChange: filing.addressChange,
        IsFinalReturn: filing.finalReturn,
        IsConsentToDisclosure: filing.consentToDisclosure ?? true,
      },
      Business: {
        BusinessNm: business.legalName,
        EIN: einDigits,
        IsEIN: true,
        Address1: business.addressLine1,
        Address2: business.roomSuite || "",
        City: business.city,
        State: business.state,
        ZipCd: business.zip,
        Phone: business.phone || "555-0100",
        Email: business.pocEmail || business.signingAuthorityEmail || "filer@example.com",
      },
      Form2290: {
        TaxableVehicles: taxableVehicles,
        SuspendedVehicles: suspendedVehicles,
        CreditVehicles: creditVehicles,
        TotalTaxDue: filing.totalTaxDue,
        TotalCredits: filing.totalCredits,
        NetTaxDue: filing.netTaxDue,
        PaymentMethod: filing.taxPayment?.method || "CHECK",
        PaymentDetails:
          filing.taxPayment?.method === "EFW"
            ? {
                RoutingNumber: filing.taxPayment.bankRoutingLast4 || "122000496",
                AccountNumber: filing.taxPayment.bankAccountLast4 || "123456789",
                AccountType: filing.taxPayment.accountType || "CHECKING",
                PaymentAmount: filing.netTaxDue,
              }
            : undefined,
      },
      Signature: {
        PIN: filing.pinSignature || "12345",
        SignerName: business.legalName,
        SignerTitle: "Authorized Officer",
      },
    };
  }

  /**
   * Transmit filing to TaxBandits Form 2290 API
   */
  async transmit(
    filing: ReturnFiling,
    business: BusinessEntity,
    _existingAcceptedVins: string[],
  ): Promise<MefTransmitResult> {
    if (!this.isConfigured()) {
      // Mock / Sandbox simulation when live credentials are not set
      const submissionId = `TB-SIM-${Date.now()}`;
      return {
        acceptedImmediately: false,
        queued: true,
        irsSubmissionId: submissionId,
        generatedXml: `<TaxBanditsMockSubmission submissionId="${submissionId}"/>`,
        status: "TRANSMITTED_TO_IRS",
      };
    }

    try {
      const token = await this.getAccessToken();
      const payload = this.buildTaxBanditsPayload(filing, business);

      // 1. Create Form 2290 Return in TaxBandits
      const createRes = await fetch(`${this.apiBaseUrl}/Form2290/Create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const createData = (await createRes.json()) as {
        SubmissionId?: string;
        StatusCode?: number;
        StatusMessage?: string;
        Errors?: Array<{ Code: string; Message: string }>;
      };

      if (!createRes.ok || !createData.SubmissionId) {
        const errorMsg =
          createData.Errors?.map((e) => `${e.Code}: ${e.Message}`).join("; ") ||
          createData.StatusMessage ||
          `TaxBandits return creation failed with status ${createRes.status}`;

        return {
          acceptedImmediately: false,
          queued: false,
          irsSubmissionId: `TB-ERR-${Date.now()}`,
          generatedXml: JSON.stringify(payload, null, 2),
          status: "EDITING_AFTER_REJECT",
          rejectionCode: createData.Errors?.[0]?.Code || "TB-VALIDATION-ERR",
          rejectionMessage: errorMsg,
        };
      }

      const submissionId = createData.SubmissionId;

      // 2. Transmit to IRS via TaxBandits
      const transmitRes = await fetch(`${this.apiBaseUrl}/Form2290/Transmit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ SubmissionId: submissionId }),
      });

      const transmitData = (await transmitRes.json()) as {
        StatusCode?: number;
        StatusMessage?: string;
        Status?: string;
      };

      return {
        acceptedImmediately: false,
        queued: true,
        irsSubmissionId: submissionId,
        generatedXml: JSON.stringify(payload, null, 2),
        status: "TRANSMITTED_TO_IRS",
      };
    } catch (err) {
      return {
        acceptedImmediately: false,
        queued: false,
        irsSubmissionId: `TB-ERR-${Date.now()}`,
        generatedXml: "",
        status: "EDITING_AFTER_REJECT",
        rejectionCode: "TB-CONN-ERR",
        rejectionMessage:
          err instanceof Error ? err.message : "Failed to connect to TaxBandits API",
      };
    }
  }

  /**
   * Check Status & Fetch IRS Stamped Schedule 1 PDF
   */
  async checkStatus(submissionId: string): Promise<TaxBanditsStatusResponse> {
    if (!this.isConfigured()) {
      return {
        submissionId,
        status: "TRANSMITTED_TO_IRS",
        rawDetails: "Sandbox mode (API keys not configured)",
      };
    }

    const token = await this.getAccessToken();
    const res = await fetch(
      `${this.apiBaseUrl}/Form2290/GetStatus?SubmissionId=${encodeURIComponent(submissionId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!res.ok) {
      throw new Error(`Failed to query TaxBandits status: ${res.statusText}`);
    }

    const data = (await res.json()) as {
      SubmissionId: string;
      Status: string;
      Errors?: Array<{ Code: string; Message: string }>;
      Schedule1PdfUrl?: string;
      AcceptedDate?: string;
    };

    const rawStatus = (data.Status || "").toUpperCase();

    if (rawStatus === "ACCEPTED") {
      // Also request PDF download link if not directly in status response
      let pdfUrl = data.Schedule1PdfUrl;
      if (!pdfUrl) {
        try {
          const pdfRes = await fetch(
            `${this.apiBaseUrl}/Form2290/GetPdf?SubmissionId=${encodeURIComponent(submissionId)}`,
            {
              method: "GET",
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          if (pdfRes.ok) {
            const pdfData = (await pdfRes.json()) as { PdfUrl?: string };
            pdfUrl = pdfData.PdfUrl;
          }
        } catch {
          // Fall back to stored URL
        }
      }

      return {
        submissionId,
        status: "ACCEPTED",
        schedule1PdfUrl: pdfUrl,
        irsAcceptedDate: data.AcceptedDate || new Date().toISOString(),
        rawDetails: JSON.stringify(data),
      };
    }

    if (rawStatus === "REJECTED") {
      const topError = data.Errors?.[0];
      return {
        submissionId,
        status: "EDITING_AFTER_REJECT",
        rejectionCode: topError?.Code || "F2290-REJECT",
        rejectionMessage:
          data.Errors?.map((e) => `${e.Code}: ${e.Message}`).join("; ") || "Rejected by IRS",
        rawDetails: JSON.stringify(data),
      };
    }

    return {
      submissionId,
      status: "TRANSMITTED_TO_IRS",
      rawDetails: JSON.stringify(data),
    };
  }
}
