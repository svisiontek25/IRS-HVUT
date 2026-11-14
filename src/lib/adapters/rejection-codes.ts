export interface IrsRejectionDefinition {
  code: string;
  severity: "REJECT" | "ALERT";
  title: string;
  irsMessage: string;
  humanFixGuide: string;
}

export const IRS_REJECTION_CODES: Record<string, IrsRejectionDefinition> = {
  "F2290-001": {
    code: "F2290-001",
    severity: "REJECT",
    title: "EIN and Name Control Mismatch",
    irsMessage: "Business Name Control in Return Header does not match IRS e-File database for the provided EIN.",
    humanFixGuide: "Verify your 9-digit EIN and the first 4 characters of your legal business name (excluding LLC/Inc). If the EIN was issued within the last 14 days, wait for IRS MeF propagation and resubmit for free.",
  },
  "F2290-023": {
    code: "F2290-023",
    severity: "REJECT",
    title: "Duplicate VIN Reported in Same Tax Period",
    irsMessage: "One or more VINs in Schedule 1 have already been accepted on a prior Form 2290 for this EIN and Tax Period.",
    humanFixGuide: "Remove the duplicate VIN from this return, or file a Form 2290 Amendment / VIN Correction instead of an Original Return.",
  },
  "F2290-011": {
    code: "F2290-011",
    severity: "REJECT",
    title: "Invalid VIN Format or Prohibited Character",
    irsMessage: "Vehicle Identification Number fails IRS schema pattern (must be 17 alphanumeric characters without I, O, or Q).",
    humanFixGuide: "Correct the flagged 17-character VIN (replace letter O with 0, or I with 1) and click Resubmit.",
  },
  "R0000-905": {
    code: "R0000-905",
    severity: "REJECT",
    title: "EFIN / Transmitter Authorization Not Active in IRS Database",
    irsMessage: "Electronic Filing Identification Number (EFIN) or new EIN is not yet active in IRS MeF registry.",
    humanFixGuide: "Simulated IRS authorization check failed (or newly issued EIN < 14 days old). Update EIN or retry after IRS propagation.",
  },
  "R0000-500": {
    code: "R0000-500",
    severity: "REJECT",
    title: "Tax Calculation Discrepancy on Part I",
    irsMessage: "Total tax computed in Part I does not match sum of Category A–V vehicle lines minus credits.",
    humanFixGuide: "Recalculate vehicle lines and credits in Step 3 and resubmit.",
  },
  "GATEWAY-503": {
    code: "GATEWAY-503",
    severity: "ALERT",
    title: "IRS MeF Gateway Maintenance Window",
    irsMessage: "IRS MeF A2A endpoint returned HTTP 503 Service Unavailable (simulated maintenance window).",
    humanFixGuide: "Filing stays safely in QUEUED status and will auto-retry with exponential backoff once the IRS gateway is back online.",
  },
};

export function lookupRejection(code?: string): IrsRejectionDefinition | null {
  if (!code) return null;
  return IRS_REJECTION_CODES[code] ?? {
    code,
    severity: "REJECT",
    title: "IRS MeF Business Rule Rejection",
    irsMessage: `Simulated IRS rejection code ${code}.`,
    humanFixGuide: "Review return details, correct the flagged fields, and resubmit at no additional service fee.",
  };
}

