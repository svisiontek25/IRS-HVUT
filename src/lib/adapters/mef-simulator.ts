import {
  BusinessEntity,
  IMefTransmitter,
  MefTransmitResult,
  ReturnFiling,
  SimulatorConfig,
} from "./types";
import { IRS_REJECTION_CODES } from "./rejection-codes";
import { validateEin, validateVin } from "../hvut/vin-validator";
import { deriveNameControl } from "../hvut/tax-engine";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildSimulatedMefXml(
  filing: ReturnFiling,
  business: BusinessEntity,
  config: SimulatorConfig,
  submissionId: string,
): string {
  const einDigits = business.ein.replace(/\D/g, "");
  const startYear = filing.taxYear.split("-")[0] || "2026";
  const yyyymm = `${startYear}${String(filing.firstUsedMonth).padStart(2, "0")}`;

  const vehicleLinesXml = filing.lines
    .map(
      (line, idx) => `    <VehicleLine seq="${idx + 1}">
      <VIN>${escapeXml(line.vin)}</VIN>
      ${line.priorVin ? `<PriorVIN>${escapeXml(line.priorVin)}</PriorVIN>` : ""}
      <WeightCategory>${escapeXml(line.weightCategory)}</WeightCategory>
      <LoggingIndicator>${line.isLogging ? "true" : "false"}</LoggingIndicator>
      <AgriculturalIndicator>${line.isAgricultural ? "true" : "false"}</AgriculturalIndicator>
      <LineType>${escapeXml(line.lineType)}</LineType>
      <ComputedTaxAmt>${line.computedTax.toFixed(2)}</ComputedTaxAmt>
    </VehicleLine>`,
    )
    .join("\n");

  const formNode = filing.formType === "8849_SCH6" ? "IRS8849Schedule6" : "IRS2290";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Return xmlns="http://www.irs.gov/efile" returnVersion="${startYear}v1.0-SIM">
  <ReturnHeader binaryAttachmentCnt="0">
    <ReturnTs>${new Date().toISOString()}</ReturnTs>
    <TaxPeriodBeginDt>${startYear}-07-01</TaxPeriodBeginDt>
    <TaxPeriodEndDt>${Number(startYear) + 1}-06-30</TaxPeriodEndDt>
    <SoftwareId>${escapeXml(config.softwareId)}</SoftwareId>
    <OriginatorGrp>
      <EFIN>${escapeXml(config.efin)}</EFIN>
      <OriginatorTypeCd>ERO</OriginatorTypeCd>
    </OriginatorGrp>
    <TransmitterGrp>
      <ETIN>${escapeXml(config.etin)}</ETIN>
    </TransmitterGrp>
    <SubmissionId>${escapeXml(submissionId)}</SubmissionId>
    <Filer>
      <EIN>${einDigits}</EIN>
      <BusinessName>
        <BusinessNameLine1Txt>${escapeXml(business.legalName)}</BusinessNameLine1Txt>
      </BusinessName>
      <BusinessNameControlTxt>${escapeXml(business.nameControl)}</BusinessNameControlTxt>
      <USAddress>
        <AddressLine1Txt>${escapeXml(business.addressLine1)}</AddressLine1Txt>
        <CityNm>${escapeXml(business.city)}</CityNm>
        <StateAbbreviationCd>${escapeXml(business.state)}</StateAbbreviationCd>
        <ZIPCd>${escapeXml(business.zip)}</ZIPCd>
      </USAddress>
    </Filer>
    <TaxpayerPIN>${escapeXml(filing.pinSignature || "12345")}</TaxpayerPIN>
  </ReturnHeader>
  <ReturnData documentCnt="1">
    <${formNode} documentId="DOC-1">
      <FormType>${escapeXml(filing.formType)}</FormType>
      <FirstUsedMonthCd>${yyyymm}</FirstUsedMonthCd>
      <AddressChangeInd>${filing.addressChange ? "true" : "false"}</AddressChangeInd>
      <FinalReturnInd>${filing.finalReturn ? "true" : "false"}</FinalReturnInd>
      <TotalTaxAmt>${filing.totalTaxDue.toFixed(2)}</TotalTaxAmt>
      <TotalCreditsAmt>${filing.totalCredits.toFixed(2)}</TotalCreditsAmt>
      <NetTaxDueAmt>${filing.netTaxDue.toFixed(2)}</NetTaxDueAmt>
      <PaymentMethod>${escapeXml(filing.taxPayment?.method ?? "CHECK")}</PaymentMethod>
      <Schedule1Vehicles>
${vehicleLinesXml}
      </Schedule1Vehicles>
    </${formNode}>
  </ReturnData>
</Return>`;
}

export class SimulatedMefAdapter implements IMefTransmitter {
  readonly modeLabel = "IRS MeF Local Simulator (No Real Credentials Required)";

  constructor(private readonly config: SimulatorConfig) {}

  async transmit(
    filing: ReturnFiling,
    business: BusinessEntity,
    existingAcceptedVins: string[],
  ): Promise<MefTransmitResult> {
    const submissionId = `${this.config.efin}${new Date().getFullYear()}${Math.floor(10000000 + Math.random() * 89999999)}`;
    const generatedXml = buildSimulatedMefXml(filing, business, this.config, submissionId);

    if (this.config.simulatedDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(this.config.simulatedDelayMs, 2500)));
    }

    // 1. Gateway outage simulation -> stays QUEUED
    if (this.config.mode === "GATEWAY_OUTAGE") {
      return {
        acceptedImmediately: false,
        queued: true,
        irsSubmissionId: submissionId,
        generatedXml,
        status: "QUEUED",
        rejectionCode: "GATEWAY-503",
        rejectionMessage: IRS_REJECTION_CODES["GATEWAY-503"].irsMessage,
      };
    }

    // 2. Mandatory IRS Business Rule Checks (run before auto/manual decision)
    const einCheck = validateEin(business.ein);
    if (!einCheck.valid) {
      return {
        acceptedImmediately: false,
        queued: false,
        irsSubmissionId: submissionId,
        generatedXml,
        status: "EDITING_AFTER_REJECT",
        rejectionCode: "R0000-905",
        rejectionMessage: einCheck.error || IRS_REJECTION_CODES["R0000-905"].irsMessage,
      };
    }

    // Magic QA triggers for deterministic testing
    const einDigits = business.ein.replace(/\D/g, "");
    const expectedControl = deriveNameControl(business.legalName);
    if (
      business.nameControl.toUpperCase() === "BAD1" ||
      einDigits.endsWith("99") ||
      business.nameControl.toUpperCase() !== expectedControl
    ) {
      return {
        acceptedImmediately: false,
        queued: false,
        irsSubmissionId: submissionId,
        generatedXml,
        status: "EDITING_AFTER_REJECT",
        rejectionCode: "F2290-001",
        rejectionMessage: `${IRS_REJECTION_CODES["F2290-001"].irsMessage} (Expected Name Control '${expectedControl}', received '${business.nameControl}')`,
      };
    }

    if (einDigits.endsWith("88")) {
      return {
        acceptedImmediately: false,
        queued: false,
        irsSubmissionId: submissionId,
        generatedXml,
        status: "EDITING_AFTER_REJECT",
        rejectionCode: "R0000-905",
        rejectionMessage: IRS_REJECTION_CODES["R0000-905"].irsMessage,
      };
    }

    // VIN integrity & duplicate VIN check on original 2290 returns
    const seenInReturn = new Set<string>();
    for (const line of filing.lines) {
      const vinCheck = validateVin(line.vin, true);
      if (!vinCheck.valid) {
        return {
          acceptedImmediately: false,
          queued: false,
          irsSubmissionId: submissionId,
          generatedXml,
          status: "EDITING_AFTER_REJECT",
          rejectionCode: "F2290-011",
          rejectionMessage: `VIN ${line.vin}: ${vinCheck.errors.join(" ")}`,
        };
      }
      if (seenInReturn.has(vinCheck.normalized)) {
        return {
          acceptedImmediately: false,
          queued: false,
          irsSubmissionId: submissionId,
          generatedXml,
          status: "EDITING_AFTER_REJECT",
          rejectionCode: "F2290-023",
          rejectionMessage: `Duplicate VIN ${vinCheck.normalized} appears multiple times within the same submission.`,
        };
      }
      seenInReturn.add(vinCheck.normalized);

      if (
        filing.formType === "2290_ORIG" &&
        (line.lineType === "TAXABLE" || line.lineType === "SUSPENDED") &&
        existingAcceptedVins.includes(vinCheck.normalized)
      ) {
        return {
          acceptedImmediately: false,
          queued: false,
          irsSubmissionId: submissionId,
          generatedXml,
          status: "EDITING_AFTER_REJECT",
          rejectionCode: "F2290-023",
          rejectionMessage: `VIN ${vinCheck.normalized} was already accepted for this EIN in tax period ${filing.taxYear}.`,
        };
      }
    }

    // 3. Simulator Mode Outcome
    if (this.config.mode === "AUTO_REJECT") {
      const code = this.config.forcedRejectCode || "F2290-001";
      const def = IRS_REJECTION_CODES[code];
      return {
        acceptedImmediately: false,
        queued: false,
        irsSubmissionId: submissionId,
        generatedXml,
        status: "EDITING_AFTER_REJECT",
        rejectionCode: code,
        rejectionMessage: def?.irsMessage ?? `Simulated rejection (${code})`,
      };
    }

    if (this.config.mode === "MANUAL_REVIEW") {
      return {
        acceptedImmediately: false,
        queued: false,
        irsSubmissionId: submissionId,
        generatedXml,
        status: "TRANSMITTED_TO_IRS",
      };
    }

    return {
      acceptedImmediately: true,
      queued: false,
      irsSubmissionId: submissionId,
      generatedXml,
      status: "ACCEPTED",
    };
  }
}

