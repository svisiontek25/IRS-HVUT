export type UserRole = "OWNER_OP" | "FLEET" | "CPA" | "ADMIN";

export type BusinessType =
  | "LLC"
  | "CORPORATION"
  | "PARTNERSHIP"
  | "SOLE_PROPRIETOR"
  | "NON_PROFIT"
  | "OTHER";

export type WeightCategory =
  | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K"
  | "L" | "M" | "N" | "O" | "P" | "Q" | "R" | "S" | "T" | "U" | "V"
  | "W";

export type FormType =
  | "2290_ORIG"
  | "2290_VIN_CORR"
  | "2290_AMEND"
  | "8849_SCH6";

export type FilingStatus =
  | "DRAFT"
  | "VALIDATED"
  | "PAID"
  | "QUEUED"
  | "TRANSMITTED_TO_IRS"
  | "ACCEPTED"
  | "EDITING_AFTER_REJECT";

export type VehicleLineType =
  | "TAXABLE"
  | "SUSPENDED"
  | "CREDIT"
  | "CREDIT_LOW_MILEAGE"
  | "CREDIT_OVERPAID"
  | "PRIOR_YEAR_SUSPENDED"
  | "VIN_CORRECTION";

export type PackageType = "PER_VEHICLE" | "UNLIMITED_SINGLE" | "UNLIMITED_ANNUAL";

export type IrsPaymentMethod = "EFW" | "EFTPS" | "CARD" | "CHECK";

export type SimulatorMode =
  | "AUTO_ACCEPT"
  | "MANUAL_REVIEW"
  | "AUTO_REJECT"
  | "GATEWAY_OUTAGE";

export interface ThirdPartyDesignee {
  name: string;
  phone: string;
  pin: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  password?: string;
  role: UserRole;
  mfaEnabled: boolean;
  createdAt: string;
}

export interface BusinessEntity {
  id: string;
  ownerUserId: string;
  ein: string; // Stored masked/encrypted in prod; plain/masked in PoC
  legalName: string;
  nameControl: string;
  dba?: string;
  businessType?: BusinessType;
  addressLine1: string;
  roomSuite?: string;
  city: string;
  otherCity?: boolean;
  state: string;
  country?: string;
  zip: string;
  cellNumber?: string;
  pocName?: string;
  pocEmail?: string;
  pocPhone?: string;
  signingAuthorityName: string;
  signingAuthorityTitle: string;
  signingAuthorityEmail?: string;
  phone: string;
  thirdPartyDesignee?: ThirdPartyDesignee;
}

export interface Vehicle {
  id: string;
  businessId: string;
  vin: string;
  unitNumber?: string;
  defaultWeightCategory: WeightCategory;
  isLogging: boolean;
  isAgricultural: boolean;
  status: "ACTIVE" | "SOLD" | "DESTROYED" | "STOLEN";
}

export interface FilingVehicleLine {
  id: string;
  filingId: string;
  vin: string;
  unitNumber?: string;
  weightCategory: WeightCategory;
  priorWeightCategory?: WeightCategory;
  isLogging: boolean;
  isAgricultural: boolean;
  isPrivatelyPurchased?: boolean;
  purchasedMonth?: number;
  lineType: VehicleLineType;
  priorVin?: string;
  dispositionDate?: string;
  dispositionReason?: "SOLD" | "DESTROYED" | "STOLEN" | "LOW_MILEAGE" | "OVERPAID";
  buyerName?: string;
  priorTaxPaid?: number;
  explanation?: string;
  correctionCategory?: "TAXABLE" | "SUSPENDED" | "CREDIT";
  computedTax: number;
}

export interface ServiceOrder {
  id: string;
  filingId: string;
  packageType?: PackageType;
  pricingTier: string;
  baseAmount: number;
  discountCode?: string;
  discountAmount: number;
  addOnFax: boolean;
  addOnSms: boolean;
  addOnEmail?: boolean;
  additionalEmails?: string;
  previouslyPaidAmount?: number;
  finalAmount: number;
  paymentStatus: "UNPAID" | "PAID" | "DECLINED" | "WAIVED_RESUBMIT";
  processorTxId?: string;
  invoiceNumber?: string;
  cardType?: string;
  paidAt?: string;
}

export interface TaxPaymentInstruction {
  id: string;
  filingId: string;
  method: IrsPaymentMethod;
  bankRoutingNumber?: string;
  bankAccountNumber?: string;
  bankRoutingLast4?: string;
  bankAccountLast4?: string;
  accountType?: "CHECKING" | "SAVINGS";
  debitDate?: string;
  efwConsentAgreed?: boolean;
}

export interface ReturnFiling {
  id: string;
  displayReturnId?: string;
  businessId: string;
  formType: FormType;
  taxYear: string; // e.g., "2026-2027"
  firstUsedMonth: number; // 7=July ... 12=Dec, 1=Jan ... 6=June
  addressChange: boolean;
  finalReturn: boolean;
  eFileMethod?: boolean;
  thirdPartyAssigned?: boolean;
  consentToDisclosure?: boolean;
  priorYearSuspendedAllUnderLimit?: boolean;
  packageType?: PackageType;
  additionalEmails?: string;
  amendedReason?: "WEIGHT_INCREASE" | "MILEAGE_EXCEEDED";
  status: FilingStatus;
  irsSubmissionId?: string;
  mefXml?: string;
  rejectionCode?: string;
  rejectionMessage?: string;
  pinSignature?: string;
  stampedPdfUrl?: string;
  submissionStatusDetails?: string;
  totalTaxDue: number;
  totalCredits: number;
  netTaxDue: number;
  createdAt: string;
  submittedAt?: string;
  acceptedAt?: string;
  lines: FilingVehicleLine[];
  serviceOrder?: ServiceOrder;
  taxPayment?: TaxPaymentInstruction;
}

export interface NotificationLog {
  id: string;
  filingId?: string;
  channel: "EMAIL" | "SMS" | "FAX";
  recipient: string;
  subject: string;
  body: string;
  attachmentUrl?: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorRole: UserRole;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
}

export interface SimulatorConfig {
  mode: SimulatorMode;
  simulatedDelayMs: number;
  forcedRejectCode: string;
  efin: string;
  etin: string;
  softwareId: string;
}

// --- Port Interfaces (Swappable for Real Production Integrations) ---

export interface MefTransmitResult {
  acceptedImmediately: boolean;
  queued: boolean;
  irsSubmissionId: string;
  generatedXml: string;
  status: "TRANSMITTED_TO_IRS" | "ACCEPTED" | "EDITING_AFTER_REJECT" | "QUEUED";
  rejectionCode?: string;
  rejectionMessage?: string;
}

export interface IMefTransmitter {
  readonly modeLabel: string;
  transmit(filing: ReturnFiling, business: BusinessEntity, existingAcceptedVins: string[]): Promise<MefTransmitResult>;
}

export interface ISchedule1Generator {
  generateSchedule1Pdf(filing: ReturnFiling, business: BusinessEntity): Promise<Uint8Array>;
  generateForm2290Pdf(filing: ReturnFiling, business: BusinessEntity): Promise<Uint8Array>;
  generate2290VPdf(filing: ReturnFiling, business: BusinessEntity): Promise<Uint8Array>;
}

export interface CheckoutChargeRequest {
  filing: ReturnFiling;
  cardNumber: string;
  cardType?: string;
  promoCode?: string;
  packageType?: PackageType;
  addOnFax?: boolean;
  addOnSms?: boolean;
  addOnEmail?: boolean;
  additionalEmails?: string;
  hasUnlimitedAnnualPlan?: boolean;
}

export interface CheckoutChargeResult {
  approved: boolean;
  order: ServiceOrder;
  errorMessage?: string;
}

export interface IPaymentGateway {
  chargeServiceFee(req: CheckoutChargeRequest): Promise<CheckoutChargeResult>;
}

export interface INotificationSender {
  send(entry: Omit<NotificationLog, "id" | "read" | "createdAt">): Promise<NotificationLog>;
}
