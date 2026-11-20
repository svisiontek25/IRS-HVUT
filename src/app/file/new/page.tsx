"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Papa from "papaparse";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeftCircle,
  ArrowRightCircle,
  Banknote,
  CheckCircle2,
  CreditCard,
  Download,
  Edit,
  ExternalLink,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Flag,
  Gauge,
  HelpCircle,
  Home,
  Play,
  PlusCircle,
  Printer,
  Search,
  ShoppingCart,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  Upload,
} from "lucide-react";
import { IrsHvutLogo } from "@/components/AppShell";
import { buildPdfHref, usePoc } from "@/components/PocProvider";
import {
  FilingVehicleLine,
  FormType,
  IrsPaymentMethod,
  PackageType,
  ReturnFiling,
  VehicleLineType,
  WeightCategory,
} from "@/lib/adapters/types";
import { computeServiceFeeQuote } from "@/lib/adapters/payment-simulator";
import { lookupRejection } from "@/lib/adapters/rejection-codes";
import {
  TAX_PERIOD_MONTHS,
  WEIGHT_CATEGORIES,
  calculateVehicleTax,
  calculateWeightIncreaseTax,
  getFilingDeadline,
  getMonthName,
} from "@/lib/hvut/tax-engine";
import { generateValidTestVin, validateAbaRouting, validateVin } from "@/lib/hvut/vin-validator";

const WIZARD_STEPS = [
  { id: 1, label: "Get Started" },
  { id: 2, label: "Tax Options" },
  { id: 3, label: "Vehicle Info" },
  { id: 4, label: "IRS Options" },
  { id: 5, label: "Pricing" },
  { id: 6, label: "Checkout" },
  { id: 7, label: "Form Summary" },
  { id: 8, label: "Submit Return" },
];

const CREDIT_TYPES = new Set<VehicleLineType>([
  "CREDIT",
  "CREDIT_LOW_MILEAGE",
  "CREDIT_OVERPAID",
]);

function makeDefaultLine(
  filingId: string,
  lineType: VehicleLineType = "TAXABLE",
  firstUsedMonth = 7,
): Partial<FilingVehicleLine> {
  return {
    filingId,
    vin: "",
    unitNumber: "",
    weightCategory: "V",
    priorWeightCategory: "K",
    isLogging: false,
    isAgricultural: false,
    isPrivatelyPurchased: false,
    purchasedMonth: firstUsedMonth,
    lineType,
    priorVin: "",
    dispositionDate: "",
    dispositionReason:
      lineType === "CREDIT_LOW_MILEAGE"
        ? "LOW_MILEAGE"
        : lineType === "CREDIT_OVERPAID"
          ? "OVERPAID"
          : "SOLD",
    buyerName: "",
    priorTaxPaid: 550,
    explanation: "",
    correctionCategory: "TAXABLE",
    computedTax: lineType === "TAXABLE" ? calculateVehicleTax("V", false, firstUsedMonth) : 0,
  };
}

function TruckBadgeCircle({ badgeColor, symbol }: { badgeColor: string; symbol: string }) {
  return (
    <div className="relative w-24 h-24 rounded-full border border-[#cccccc] bg-white shadow-2xs mx-auto flex items-center justify-center">
      <div className="w-20 h-20 rounded-full border border-[#e5e5e5] bg-[#f8f9fa] flex items-center justify-center">
        <Truck className="w-10 h-10 text-[#1d2d44]" />
      </div>
      <span
        className="absolute bottom-2 right-2 w-7 h-7 rounded-full text-white text-xs font-extrabold flex items-center justify-center shadow"
        style={{ backgroundColor: badgeColor }}
      >
        {symbol}
      </span>
    </div>
  );
}

function FileNewWizardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editFilingId = searchParams.get("editFilingId");
  const paramFormType = searchParams.get("formType") as FormType | null;
  const paramAmendReason = searchParams.get("amendReason") as
    | "WEIGHT_INCREASE"
    | "MILEAGE_EXCEEDED"
    | null;

  const {
    users,
    businesses,
    vehicles,
    filings,
    activeUserId,
    activeBusinessId,
    setActiveBusinessId,
    loading,
    refresh,
  } = usePoc();

  const activeUser = users.find((u) => u.id === activeUserId);
  const visibleBusinesses = useMemo(() => {
    if (!activeUser) return [];
    if (activeUser.role === "ADMIN" || activeUser.role === "CPA") return businesses;
    return businesses.filter((b) => b.ownerUserId === activeUser.id);
  }, [activeUser, businesses]);
  const activeBusiness =
    visibleBusinesses.find((b) => b.id === activeBusinessId) || visibleBusinesses[0];

  useEffect(() => {
    if (!loading && activeUser && activeUser.role !== "ADMIN" && visibleBusinesses.length === 0) {
      router.replace("/businesses/new?onboarding=1");
    }
  }, [loading, activeUser, visibleBusinesses.length, router]);

  const [step, setStep] = useState(1);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Return Header State
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [displayReturnId, setDisplayReturnId] = useState<string | undefined>(undefined);
  const [formType, setFormType] = useState<FormType>(paramFormType || "2290_ORIG");
  const [amendedReason, setAmendedReason] = useState<"WEIGHT_INCREASE" | "MILEAGE_EXCEEDED">(
    paramAmendReason || "WEIGHT_INCREASE",
  );
  const [taxYear, setTaxYear] = useState("2026-2027");
  const [firstUsedMonth, setFirstUsedMonth] = useState(7);

  // Step 1/2 Checkboxes
  const [addressChange, setAddressChange] = useState(false);
  const [finalReturn, setFinalReturn] = useState(false);
  const [eFileMethod, setEFileMethod] = useState(true);
  const [thirdPartyAssigned, setThirdPartyAssigned] = useState(false);
  const [consentToDisclosure, setConsentToDisclosure] = useState(true);
  const [priorYearSuspendedAllUnderLimit, setPriorYearSuspendedAllUnderLimit] = useState(false);

  // Step 2 UI Selection Flags
  const [enabledSections, setEnabledSections] = useState({
    TAXABLE: true,
    SUSPENDED: true,
    CREDIT_SOLD: false,
    CREDIT_LOW: false,
    PRIOR_SUSP: false,
  });

  // Step 3: Vehicles
  const [lines, setLines] = useState<FilingVehicleLine[]>([]);
  const [activeVehicleTab, setActiveVehicleTab] = useState<
    "TAXABLE" | "SUSPENDED" | "PRIOR_YEAR_SUSPENDED" | "CREDIT" | "CREDIT_LOW_MILEAGE" | "VIN_CORRECTION"
  >("TAXABLE");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editLineIndex, setEditLineIndex] = useState<number | null>(null);
  const [draftLine, setDraftLine] = useState<Partial<FilingVehicleLine>>(() =>
    makeDefaultLine("NEW", "TAXABLE", 7),
  );
  const [modalError, setModalError] = useState<string | null>(null);

  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedRosterIds, setSelectedRosterIds] = useState<string[]>([]);

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkDefaultType, setBulkDefaultType] = useState<VehicleLineType>("TAXABLE");
  const [bulkPreview, setBulkPreview] = useState<
    Array<{
      vin: string;
      unitNumber: string;
      weightCategory: WeightCategory;
      lineType: VehicleLineType;
      isLogging: boolean;
      isAgricultural: boolean;
      valid: boolean;
      error?: string;
      computedTax: number;
    }>
  >([]);

  // Step 4: IRS Options
  const [taxMethod, setTaxMethod] = useState<IrsPaymentMethod>("EFW");
  const [routingNumber, setRoutingNumber] = useState("122000496");
  const [accountNumber, setAccountNumber] = useState("1234567890");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("1234567890");
  const [accountType, setAccountType] = useState<"CHECKING" | "SAVINGS">("CHECKING");
  const [debitDate, setDebitDate] = useState("2026-08-31");
  const [efwConsent, setEfwConsent] = useState(true);

  // Step 5: Pricing
  const [packageType, setPackageType] = useState<PackageType>("PER_VEHICLE");
  const [hasUnlimitedAnnualPlan, setHasUnlimitedAnnualPlan] = useState(false);
  const [addOnFax, setAddOnFax] = useState(false);
  const [faxNumber, setFaxNumber] = useState("800-555-0144");
  const [addOnSms, setAddOnSms] = useState(false);
  const [addOnEmail, setAddOnEmail] = useState(false);
  const [additionalEmails, setAdditionalEmails] = useState("");
  const [promoCode, setPromoCode] = useState("");

  // Step 6: Checkout
  const [cardType, setCardType] = useState("Visa");
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [expMonth, setExpMonth] = useState("08");
  const [expYear, setExpYear] = useState("2029");
  const [cardCvv, setCardCvv] = useState("842");
  const [editBillingAddress, setEditBillingAddress] = useState(false);

  // Step 7 & 8: Saved/Submitted Filing & Transaction PIN Modal
  const [savedFiling, setSavedFiling] = useState<ReturnFiling | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinSignature, setPinSignature] = useState("12345");
  const [showXmlModal, setShowXmlModal] = useState(false);

  useEffect(() => {
    if (!editFilingId) return;
    const found = filings.find((f) => f.id === editFilingId);
    if (!found) return;
    setEditingId(found.id);
    setDisplayReturnId(found.displayReturnId);
    setActiveBusinessId(found.businessId);
    setFormType(found.formType);
    if (found.amendedReason) setAmendedReason(found.amendedReason);
    setTaxYear(found.taxYear);
    setFirstUsedMonth(found.firstUsedMonth);
    setAddressChange(found.addressChange);
    setFinalReturn(found.finalReturn);
    setEFileMethod(found.eFileMethod ?? true);
    setThirdPartyAssigned(Boolean(found.thirdPartyAssigned));
    setConsentToDisclosure(found.consentToDisclosure ?? true);
    setPriorYearSuspendedAllUnderLimit(Boolean(found.priorYearSuspendedAllUnderLimit));
    setLines(found.lines || []);
    if (found.formType === "2290_VIN_CORR") setActiveVehicleTab("VIN_CORRECTION");
    if (found.packageType) setPackageType(found.packageType);
    if (found.additionalEmails) setAdditionalEmails(found.additionalEmails);
    if (found.taxPayment) {
      setTaxMethod(found.taxPayment.method);
      if (found.taxPayment.bankRoutingNumber) setRoutingNumber(found.taxPayment.bankRoutingNumber);
      else if (found.taxPayment.bankRoutingLast4) setRoutingNumber(found.taxPayment.bankRoutingLast4);
      if (found.taxPayment.bankAccountNumber) {
        setAccountNumber(found.taxPayment.bankAccountNumber);
        setConfirmAccountNumber(found.taxPayment.bankAccountNumber);
      } else if (found.taxPayment.bankAccountLast4) {
        setAccountNumber(found.taxPayment.bankAccountLast4);
        setConfirmAccountNumber(found.taxPayment.bankAccountLast4);
      }
      if (found.taxPayment.accountType) setAccountType(found.taxPayment.accountType);
      if (found.taxPayment.debitDate) setDebitDate(found.taxPayment.debitDate);
      if (found.taxPayment.efwConsentAgreed !== undefined) setEfwConsent(found.taxPayment.efwConsentAgreed);
    }
    if (found.serviceOrder) {
      setAddOnFax(found.serviceOrder.addOnFax);
      setAddOnSms(found.serviceOrder.addOnSms);
      setAddOnEmail(Boolean(found.serviceOrder.addOnEmail));
      if (found.serviceOrder.discountCode) setPromoCode(found.serviceOrder.discountCode);
    }
    setSavedFiling(found);
    if (
      found.status === "ACCEPTED" ||
      found.status === "TRANSMITTED_TO_IRS" ||
      found.status === "QUEUED"
    ) {
      setStep(8);
    } else if (found.status === "EDITING_AFTER_REJECT") {
      setStep(3);
    } else if (found.status === "PAID") {
      setStep(7);
    }
  }, [editFilingId, filings, setActiveBusinessId]);

  useEffect(() => {
    if (editFilingId) return;
    if (paramFormType) {
      setFormType(paramFormType);
      if (paramFormType === "2290_VIN_CORR") setActiveVehicleTab("VIN_CORRECTION");
      if (paramFormType === "8849_SCH6") setActiveVehicleTab("CREDIT");
    }
    if (paramAmendReason) setAmendedReason(paramAmendReason);
  }, [editFilingId, paramFormType, paramAmendReason]);

  const totalTaxDue = useMemo(
    () =>
      Number(
        lines
          .filter((l) => !CREDIT_TYPES.has(l.lineType))
          .reduce((acc, l) => acc + Number(l.computedTax || 0), 0)
          .toFixed(2),
      ),
    [lines],
  );
  const totalCredits = useMemo(
    () =>
      Number(
        lines
          .filter((l) => CREDIT_TYPES.has(l.lineType))
          .reduce((acc, l) => acc + Number(l.computedTax || 0), 0)
          .toFixed(2),
      ),
    [lines],
  );
  const netTaxDue = Math.max(0, Number((totalTaxDue - totalCredits).toFixed(2)));
  const deadline = useMemo(() => getFilingDeadline(taxYear, firstUsedMonth), [taxYear, firstUsedMonth]);

  const quote = useMemo(
    () =>
      computeServiceFeeQuote({
        formType,
        vehicleCount: lines.length,
        packageType,
        promoCode,
        addOnFax,
        addOnSms,
        isResubmissionAfterReject:
          savedFiling?.status === "EDITING_AFTER_REJECT" &&
          savedFiling?.serviceOrder?.paymentStatus === "PAID",
        hasUnlimitedAnnualPlan,
        isNativeVinCorrection: true,
      }),
    [formType, lines.length, packageType, promoCode, addOnFax, addOnSms, savedFiling, hasUnlimitedAnnualPlan],
  );

  const draftComputedTax = useMemo(() => {
    const lt = draftLine.lineType || "TAXABLE";
    const cat = (draftLine.weightCategory || "V") as WeightCategory;
    const isLog = Boolean(draftLine.isLogging);
    if (lt === "SUSPENDED" || lt === "PRIOR_YEAR_SUSPENDED" || lt === "VIN_CORRECTION") {
      return 0;
    }
    if (CREDIT_TYPES.has(lt)) {
      if (lt === "CREDIT_OVERPAID") return Number(draftLine.priorTaxPaid || 0);
      return Number(draftLine.priorTaxPaid || calculateVehicleTax(cat, isLog, firstUsedMonth));
    }
    if (formType === "2290_AMEND" && amendedReason === "WEIGHT_INCREASE") {
      const priorCat = (draftLine.priorWeightCategory || "A") as WeightCategory;
      return calculateWeightIncreaseTax(priorCat, cat, isLog, firstUsedMonth);
    }
    return calculateVehicleTax(cat, isLog, firstUsedMonth);
  }, [draftLine, firstUsedMonth, formType, amendedReason]);

  const businessRoster = useMemo(
    () => (activeBusiness ? vehicles.filter((v) => v.businessId === activeBusiness.id) : []),
    [vehicles, activeBusiness],
  );

  const priorBusinessVehicles = useMemo(() => {
    if (!activeBusiness) return [];
    const seen = new Set<string>();
    const list: {
      vin: string;
      unitNumber?: string;
      weightCategory: WeightCategory;
      isLogging: boolean;
      isAgricultural: boolean;
      sourceLabel: string;
    }[] = [];

    const statusRank = (s: string) =>
      s === "ACCEPTED" ? 0 : s === "PAID" || s === "SUBMITTED" ? 1 : 2;
    const bizFilings = [...filings]
      .filter((f) => f.businessId === activeBusiness.id && f.id !== editingId)
      .sort((a, b) => {
        const r = statusRank(a.status) - statusRank(b.status);
        if (r !== 0) return r;
        return (b.acceptedAt || b.submittedAt || b.createdAt).localeCompare(
          a.acceptedAt || a.submittedAt || a.createdAt,
        );
      });

    for (const f of bizFilings) {
      for (const l of f.lines) {
        const vin = l.vin?.trim().toUpperCase();
        if (!vin || seen.has(vin)) continue;
        seen.add(vin);
        list.push({
          vin,
          unitNumber: l.unitNumber,
          weightCategory: l.weightCategory,
          isLogging: Boolean(l.isLogging),
          isAgricultural: Boolean(l.isAgricultural),
          sourceLabel: `${f.taxYear} ${f.status === "ACCEPTED" ? "Filed" : f.status}`,
        });
      }
    }

    for (const v of businessRoster) {
      const vin = v.vin.trim().toUpperCase();
      if (!vin || seen.has(vin)) continue;
      seen.add(vin);
      list.push({
        vin,
        unitNumber: v.unitNumber,
        weightCategory: v.defaultWeightCategory,
        isLogging: Boolean(v.isLogging),
        isAgricultural: Boolean(v.isAgricultural),
        sourceLabel: "Saved Fleet Vehicle",
      });
    }

    return list;
  }, [activeBusiness, filings, businessRoster, editingId]);

  function findPriorVehicle(unitNumber?: string, vin?: string) {
    const cleanUnit = unitNumber?.trim().toLowerCase();
    const cleanVin = vin?.trim().toUpperCase();
    if (cleanUnit) {
      const byUnit = priorBusinessVehicles.find(
        (v) => v.unitNumber?.trim().toLowerCase() === cleanUnit,
      );
      if (byUnit) return byUnit;
    }
    if (cleanVin) {
      const byVin = priorBusinessVehicles.find((v) => v.vin === cleanVin);
      if (byVin) return byVin;
    }
    return undefined;
  }

  function openAddVehicleModal(preferredType: VehicleLineType) {
    setEditLineIndex(null);
    const base = makeDefaultLine(editingId || "NEW", preferredType, firstUsedMonth);
    if (preferredType === "VIN_CORRECTION" && priorBusinessVehicles.length > 0) {
      const usedPriorVins = new Set(
        lines.map((l) => (l.priorVin || l.vin || "").trim().toUpperCase()),
      );
      const nextPrior =
        priorBusinessVehicles.find((v) => !usedPriorVins.has(v.vin)) || priorBusinessVehicles[0];
      if (nextPrior) {
        base.priorVin = nextPrior.vin;
        base.unitNumber = nextPrior.unitNumber || "";
        base.weightCategory = nextPrior.weightCategory;
        base.isLogging = nextPrior.isLogging;
        base.isAgricultural = nextPrior.isAgricultural;
      }
    }
    setDraftLine(base);
    setModalError(null);
    setShowAddModal(true);
  }

  function openEditVehicleModal(idx: number) {
    setEditLineIndex(idx);
    const current = { ...lines[idx] };
    if (current.lineType === "VIN_CORRECTION" && !current.priorVin?.trim()) {
      const matched =
        findPriorVehicle(current.unitNumber, current.vin) || priorBusinessVehicles[0];
      current.priorVin = matched?.vin || current.vin?.trim().toUpperCase() || "";
    }
    setDraftLine(current);
    setModalError(null);
    setShowAddModal(true);
  }

  function handleSaveVehicleLine(keepOpen = false) {
    setModalError(null);
    const vinCheck = validateVin(draftLine.vin || "", true);
    if (!vinCheck.valid) {
      setModalError(vinCheck.errors[0] || "Invalid 17-character VIN.");
      return;
    }
    if (draftLine.lineType === "VIN_CORRECTION") {
      const priorCheck = validateVin(draftLine.priorVin || "", true);
      if (!priorCheck.valid) {
        setModalError("Please enter a valid 17-character Previous VIN.");
        return;
      }
    }
    const duplicateIdx = lines.findIndex(
      (l, i) =>
        i !== editLineIndex &&
        l.vin.toUpperCase() === vinCheck.normalized &&
        l.lineType === draftLine.lineType,
    );
    if (duplicateIdx >= 0) {
      setModalError(`VIN ${vinCheck.normalized} is already added under ${draftLine.lineType}.`);
      return;
    }

    const cleanLine: FilingVehicleLine = {
      id: draftLine.id || `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      filingId: editingId || "NEW",
      vin: vinCheck.normalized,
      unitNumber: draftLine.unitNumber?.trim() || undefined,
      weightCategory: (draftLine.weightCategory || "V") as WeightCategory,
      priorWeightCategory:
        formType === "2290_AMEND" && amendedReason === "WEIGHT_INCREASE"
          ? (draftLine.priorWeightCategory || "A")
          : undefined,
      isLogging: Boolean(draftLine.isLogging),
      isAgricultural: Boolean(draftLine.isAgricultural),
      isPrivatelyPurchased: Boolean(draftLine.isPrivatelyPurchased),
      purchasedMonth: draftLine.isPrivatelyPurchased
        ? draftLine.purchasedMonth || firstUsedMonth
        : undefined,
      lineType: (draftLine.lineType || "TAXABLE") as VehicleLineType,
      priorVin: draftLine.priorVin?.trim().toUpperCase() || undefined,
      dispositionDate: draftLine.dispositionDate || undefined,
      dispositionReason: CREDIT_TYPES.has((draftLine.lineType || "TAXABLE") as VehicleLineType)
        ? draftLine.dispositionReason
        : undefined,
      buyerName: draftLine.buyerName?.trim() || undefined,
      priorTaxPaid: draftLine.priorTaxPaid,
      explanation: draftLine.explanation?.trim() || undefined,
      correctionCategory: draftLine.correctionCategory,
      computedTax: draftComputedTax,
    };

    if (editLineIndex !== null) {
      setLines((prev) => prev.map((l, i) => (i === editLineIndex ? cleanLine : l)));
      setShowAddModal(false);
    } else {
      setLines((prev) => [...prev, cleanLine]);
      if (keepOpen) {
        setDraftLine(makeDefaultLine(editingId || "NEW", cleanLine.lineType, firstUsedMonth));
      } else {
        setShowAddModal(false);
      }
    }
  }

  function handleImportRosterConfirm() {
    const picked = businessRoster.filter((v) => selectedRosterIds.includes(v.id));
    const existingVins = new Set(lines.map((l) => l.vin.toUpperCase()));
    const targetLt = activeVehicleTab;
    const newLines: FilingVehicleLine[] = [];
    for (const v of picked) {
      if (existingVins.has(v.vin.toUpperCase())) continue;
      newLines.push({
        id: `line-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        filingId: editingId || "NEW",
        vin: v.vin.toUpperCase(),
        priorVin: targetLt === "VIN_CORRECTION" ? v.vin.toUpperCase() : undefined,
        unitNumber: v.unitNumber,
        weightCategory: v.defaultWeightCategory,
        isLogging: v.isLogging,
        isAgricultural: v.isAgricultural,
        lineType: targetLt,
        computedTax:
          targetLt === "TAXABLE"
            ? calculateVehicleTax(v.defaultWeightCategory, v.isLogging, firstUsedMonth)
            : 0,
      });
    }
    setLines((prev) => [...prev, ...newLines]);
    setSelectedRosterIds([]);
    setShowImportModal(false);
  }

  function handleBulkCsvFile(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = (results.data as Array<Record<string, string>>).map((row) => {
          const rawVin = (row.VIN || row.vin || "").trim().toUpperCase();
          const unit = (row.UnitNumber || row.unit || row.Unit || "").trim();
          const rawCat = ((row.WeightCategory || row.Category || row.Weight || "V")
            .trim()
            .toUpperCase() || "V") as WeightCategory;
          const catValid = WEIGHT_CATEGORIES.some((c) => c.category === rawCat);
          const rawLt = ((row.LineType || row.Type || bulkDefaultType)
            .trim()
            .toUpperCase() || bulkDefaultType) as VehicleLineType;
          const isLog = ["TRUE", "YES", "1", "Y"].includes(
            (row.Logging || row.isLogging || "").toUpperCase(),
          );
          const isAg = ["TRUE", "YES", "1", "Y"].includes(
            (row.Agricultural || row.isAgricultural || "").toUpperCase(),
          );
          const vinCheck = validateVin(rawVin, true);
          return {
            vin: vinCheck.normalized || rawVin,
            unitNumber: unit,
            weightCategory: catValid ? rawCat : ("V" as WeightCategory),
            lineType: rawLt,
            isLogging: isLog,
            isAgricultural: isAg,
            valid: vinCheck.valid && catValid,
            error: !vinCheck.valid
              ? vinCheck.errors[0]
              : !catValid
                ? `Invalid weight category ${rawCat}`
                : undefined,
            computedTax:
              rawLt === "SUSPENDED"
                ? 0
                : calculateVehicleTax(catValid ? rawCat : "V", isLog, firstUsedMonth),
          };
        });
        setBulkPreview(rows);
      },
    });
  }

  function handleCommitBulkPreview() {
    const existingVins = new Set(lines.map((l) => l.vin.toUpperCase()));
    const validRows = bulkPreview.filter((r) => r.valid && !existingVins.has(r.vin.toUpperCase()));
    const appended: FilingVehicleLine[] = validRows.map((r, i) => ({
      id: `line-csv-${Date.now()}-${i}`,
      filingId: editingId || "NEW",
      vin: r.vin,
      unitNumber: r.unitNumber || undefined,
      weightCategory: r.weightCategory,
      isLogging: r.isLogging,
      isAgricultural: r.isAgricultural,
      lineType: r.lineType,
      computedTax: r.computedTax,
    }));
    setLines((prev) => [...prev, ...appended]);
    setBulkPreview([]);
    setShowBulkModal(false);
  }

  function downloadSampleCsv() {
    const csv = [
      "VIN,UnitNumber,WeightCategory,LineType,Logging,Agricultural",
      `${generateValidTestVin(10)},TRK-101,V,${bulkDefaultType},No,No`,
      `${generateValidTestVin(20)},TRK-102,V,${bulkDefaultType},Yes,No`,
      `${generateValidTestVin(30)},TRK-103,V,SUSPENDED,No,No`,
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "irs-hvut-bulk-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function saveFilingToServer(targetStatus?: ReturnFiling["status"]): Promise<ReturnFiling | null> {
    if (!activeBusiness) {
      setBannerError("Please select or add a business first.");
      return null;
    }
    const res = await fetch("/api/filings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId,
        displayReturnId,
        businessId: activeBusiness.id,
        business: activeBusiness,
        formType,
        amendedReason: formType === "2290_AMEND" ? amendedReason : undefined,
        taxYear,
        firstUsedMonth,
        addressChange,
        finalReturn,
        eFileMethod,
        thirdPartyAssigned,
        consentToDisclosure,
        priorYearSuspendedAllUnderLimit,
        packageType,
        additionalEmails: additionalEmails.trim() || undefined,
        status: targetStatus || savedFiling?.status || "VALIDATED",
        lines,
        taxPayment: {
          id: savedFiling?.taxPayment?.id || `TP-${Date.now()}`,
          filingId: editingId || "NEW",
          method: taxMethod,
          bankRoutingNumber: taxMethod === "EFW" ? routingNumber : undefined,
          bankAccountNumber: taxMethod === "EFW" ? accountNumber : undefined,
          bankRoutingLast4: taxMethod === "EFW" ? routingNumber.slice(-4) : undefined,
          bankAccountLast4: taxMethod === "EFW" ? accountNumber.slice(-4) : undefined,
          accountType: taxMethod === "EFW" ? accountType : undefined,
          debitDate: taxMethod === "EFW" ? debitDate : undefined,
          efwConsentAgreed: taxMethod === "EFW" ? efwConsent : undefined,
        },
        serviceOrder: savedFiling?.serviceOrder,
        irsSubmissionId: savedFiling?.irsSubmissionId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setBannerError(data.error || "Failed to save filing.");
      return null;
    }
    const f = data.filing as ReturnFiling;
    setEditingId(f.id);
    setDisplayReturnId(f.displayReturnId);
    setSavedFiling(f);
    await refresh();
    return f;
  }

  async function handleCheckoutPayment(e: React.FormEvent) {
    e.preventDefault();
    setBannerError(null);
    if (lines.length === 0 && !priorYearSuspendedAllUnderLimit) {
      setBannerError("Please add at least one vehicle in Step 3 before checking out.");
      return;
    }
    setBusy(true);
    try {
      const f = await saveFilingToServer(
        savedFiling?.status === "EDITING_AFTER_REJECT" ? "EDITING_AFTER_REJECT" : "VALIDATED",
      );
      if (!f) return;

      const res = await fetch(`/api/filings/${f.id}/checkout-submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorRole: activeUser?.role || "OWNER_OP",
          actorName: activeUser?.name || "IRS-HVUT User",
          cardNumber: cardNumber.replace(/\s+/g, ""),
          cardType,
          promoCode: promoCode.trim() || undefined,
          packageType,
          addOnFax,
          addOnSms,
          addOnEmail,
          additionalEmails: additionalEmails.trim() || undefined,
          faxNumber: addOnFax ? faxNumber : undefined,
          pinSignature,
          hasUnlimitedAnnualPlan,
          skipTransmit: true,
          business: activeBusiness,
          filing: f,
          taxPayment: {
            id: f.taxPayment?.id || `TP-${Date.now()}`,
            filingId: f.id,
            method: taxMethod,
            bankRoutingNumber: taxMethod === "EFW" ? routingNumber : undefined,
            bankAccountNumber: taxMethod === "EFW" ? accountNumber : undefined,
            bankRoutingLast4: taxMethod === "EFW" ? routingNumber.slice(-4) : undefined,
            bankAccountLast4: taxMethod === "EFW" ? accountNumber.slice(-4) : undefined,
            accountType: taxMethod === "EFW" ? accountType : undefined,
            debitDate: taxMethod === "EFW" ? debitDate : undefined,
            efwConsentAgreed: taxMethod === "EFW" ? efwConsent : undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBannerError(data.error || "Payment declined. Try Visa 4242... to approve.");
        if (data.filing) setSavedFiling(data.filing);
        return;
      }
      setSavedFiling(data.filing);
      await refresh();
      setStep(7);
    } finally {
      setBusy(false);
    }
  }

  async function handlePinModalSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBannerError(null);
    if (!/^\d{5}$/.test(pinSignature.trim()) || pinSignature.trim() === "00000") {
      setBannerError("Please enter any 5-digit PIN number (cannot be 00000).");
      return;
    }
    if (!savedFiling) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/filings/${savedFiling.id}/checkout-submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorRole: activeUser?.role || "OWNER_OP",
          actorName: activeUser?.name || "IRS-HVUT User",
          cardNumber: cardNumber.replace(/\s+/g, ""),
          cardType,
          promoCode: promoCode.trim() || undefined,
          packageType,
          addOnFax,
          addOnSms,
          addOnEmail,
          additionalEmails: additionalEmails.trim() || undefined,
          faxNumber: addOnFax ? faxNumber : undefined,
          pinSignature: pinSignature.trim(),
          hasUnlimitedAnnualPlan,
          skipTransmit: false,
          business: activeBusiness,
          filing: savedFiling,
          taxPayment: savedFiling.taxPayment || {
            id: `TP-${Date.now()}`,
            filingId: savedFiling.id,
            method: taxMethod,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBannerError(data.error || "IRS transmission failed.");
        return;
      }
      setSavedFiling(data.filing);
      setShowPinModal(false);
      await refresh();
      setStep(8);
    } finally {
      setBusy(false);
    }
  }

  function nextStep() {
    setBannerError(null);
    if (step === 1 && !activeBusiness) {
      setBannerError("Please select or add a business before continuing.");
      return;
    }
    if (step === 2 && formType === "2290_VIN_CORR" && lines.length === 0 && !editFilingId) {
      if (priorBusinessVehicles.length > 0) {
        const seededLines: FilingVehicleLine[] = priorBusinessVehicles.map((v, idx) => ({
          id: `line-vincorr-${Date.now()}-${idx}`,
          filingId: editingId || "NEW",
          vin: v.vin,
          priorVin: v.vin,
          unitNumber: v.unitNumber,
          weightCategory: v.weightCategory,
          isLogging: v.isLogging,
          isAgricultural: v.isAgricultural,
          lineType: "VIN_CORRECTION",
          computedTax: 0,
        }));
        setLines(seededLines);
      }
      setActiveVehicleTab("VIN_CORRECTION");
    }
    if (step === 3 && lines.length === 0 && !priorYearSuspendedAllUnderLimit) {
      setBannerError("Please add or import at least 1 vehicle before clicking Next.");
      return;
    }
    if (step === 4 && taxMethod === "EFW") {
      if (!validateAbaRouting(routingNumber).valid) {
        setBannerError("Please enter a valid 9-digit ABA bank routing number.");
        return;
      }
      if (!accountNumber || accountNumber.length < 4) {
        setBannerError("Please enter a valid bank account number.");
        return;
      }
      if (accountNumber !== confirmAccountNumber) {
        setBannerError("Bank account numbers do not match.");
        return;
      }
      if (!efwConsent) {
        setBannerError(
          "You must agree to the IRS EFW authorization consent to proceed with direct debit.",
        );
        return;
      }
    }
    setStep((s) => Math.min(8, s + 1));
  }

  function renderStepTitleIcon() {
    switch (step) {
      case 1:
        return <Play className="w-5 h-5 fill-[#1e40af]" />;
      case 2:
      case 3:
        return <Truck className="w-6 h-6" />;
      case 4:
        return <Banknote className="w-6 h-6" />;
      case 5:
        return <ShoppingCart className="w-6 h-6" />;
      case 6:
        return <Gauge className="w-6 h-6" />;
      case 7:
        return <FileText className="w-6 h-6" />;
      default:
        return <Flag className="w-6 h-6" />;
    }
  }

  function getStepTitleText() {
    switch (step) {
      case 1:
        return "Get Started";
      case 2:
        return formType === "2290_AMEND" ? "Select Amendment" : "Reporting Vehicles";
      case 3:
        return formType === "2290_VIN_CORR" ? "Add VIN Correction" : "Vehicle Information";
      case 4:
        return "IRS Options";
      case 5:
        return "Pricing & Purchase Summary";
      case 6:
        return "Payment Information";
      case 7:
        return "Form Summary";
      default:
        return "Finish";
    }
  }

  const rejectionGuide = savedFiling?.rejectionCode
    ? lookupRejection(savedFiling.rejectionCode)
    : undefined;
  const isFinalSubmitted =
    savedFiling?.status === "ACCEPTED" ||
    savedFiling?.status === "TRANSMITTED_TO_IRS" ||
    savedFiling?.status === "QUEUED" ||
    savedFiling?.status === "EDITING_AFTER_REJECT";

  const currentTabLines = useMemo(() => {
    return lines
      .map((line, idx) => ({ line, idx }))
      .filter(({ line }) => {
        if (activeVehicleTab === "CREDIT") return line.lineType === "CREDIT" || line.lineType === "CREDIT_OVERPAID";
        return line.lineType === activeVehicleTab;
      })
      .filter(({ line }) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.trim().toUpperCase();
        return line.vin.toUpperCase().includes(q) || (line.unitNumber || "").toUpperCase().includes(q);
      });
  }, [lines, activeVehicleTab, searchTerm]);

  const vehicleTabButtons: Array<{
    id: typeof activeVehicleTab;
    label: string;
    count: number;
  }> =
    formType === "2290_VIN_CORR"
      ? [
        {
          id: "VIN_CORRECTION",
          label: "VIN Correction",
          count: lines.filter((l) => l.lineType === "VIN_CORRECTION").length,
        },
      ]
      : [
        {
          id: "TAXABLE",
          label: "Taxable Vehicles",
          count: lines.filter((l) => l.lineType === "TAXABLE").length,
        },
        {
          id: "SUSPENDED",
          label: "Suspended Vehicles",
          count: lines.filter((l) => l.lineType === "SUSPENDED").length,
        },
        {
          id: "PRIOR_YEAR_SUSPENDED",
          label: "Prior Year Suspended Vehicles",
          count: lines.filter((l) => l.lineType === "PRIOR_YEAR_SUSPENDED").length,
        },
        {
          id: "CREDIT",
          label: "Sold or Destroyed Credits",
          count: lines.filter((l) => l.lineType === "CREDIT" || l.lineType === "CREDIT_OVERPAID").length,
        },
        {
          id: "CREDIT_LOW_MILEAGE",
          label: "Low Mileage Credits",
          count: lines.filter((l) => l.lineType === "CREDIT_LOW_MILEAGE").length,
        },
      ];

  return (
    <div className="space-y-4">
      {/* IRS-HVUT Breadcrumb Bar */}
      <div className="bg-[#eeeeee] border border-[#dcdcdc] rounded-[2px] px-4 py-2 text-xs text-[#555] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Link href="/dashboard" className="text-[#0073b7] hover:underline inline-flex items-center gap-1 font-medium">
            <Home className="w-3.5 h-3.5" /> My Home
          </Link>
          <span>/</span>
          <span>{WIZARD_STEPS[step - 1]?.label}</span>
        </div>
        {displayReturnId && (
          <span className="font-mono font-bold text-[#1e40af]">Return ID: {displayReturnId}</span>
        )}
      </div>

      {/* Step Title & Right Blue Business + EIN Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[#1e40af]">
          {renderStepTitleIcon()}
          <h1 className="text-[24px] font-normal">{getStepTitleText()}</h1>
        </div>
        {activeBusiness && (
          <div className="text-base font-bold text-[#0073b7]">
            {activeBusiness.legalName.toUpperCase()} ({activeBusiness.ein})
          </div>
        )}
      </div>

      {bannerError && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-300 text-rose-800 rounded-[2px] p-3 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{bannerError}</span>
        </div>
      )}

      {/* Main White Box Container */}
      <div className="bg-white border border-[#cccccc] rounded-[2px] p-5 shadow-xs space-y-5">
        {/* Authentic 8-Step Interlocking Chevron Bar */}
        <div className="flex items-center overflow-x-auto pb-1">
          <div className="flex items-center w-full min-w-[760px]">
            {WIZARD_STEPS.map((st, idx) => {
              const isCurrent = step === st.id;
              const isDone = step > st.id || (st.id === 8 && savedFiling?.status === "ACCEPTED");
              const canClick =
                st.id <= step ||
                (savedFiling?.status === "PAID" && st.id <= 7) ||
                isFinalSubmitted;
              const clipPath =
                idx === 0
                  ? "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)"
                  : "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)";
              return (
                <button
                  key={st.id}
                  type="button"
                  disabled={!canClick}
                  onClick={() => canClick && setStep(st.id)}
                  style={{ clipPath }}
                  className={`flex-1 py-2.5 px-4 text-xs text-center transition -ml-2 first:ml-0 ${isCurrent
                      ? "bg-[#0073b7] text-white font-bold z-10 cursor-pointer"
                      : isDone
                        ? "bg-[#0284c7] text-white font-medium hover:bg-[#0369a1] cursor-pointer"
                        : "bg-[#e9ecef] text-[#444444] font-normal cursor-not-allowed"
                    }`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 1: GET STARTED (td-get-started.png) */}
        {step === 1 && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="text-sm text-[#333] border-b border-[#e5e5e5] pb-2">
              Business and Tax Information
            </div>
            <div className="border border-[#dcdcdc] bg-white p-6 space-y-5 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-[#222] inline-flex items-center gap-1">
                    Select Business<span className="text-red-600">*</span>
                    <HelpCircle className="w-3.5 h-3.5 text-[#1e40af]" />
                  </label>
                  <Link href="/businesses/new" className="text-[#0073b7] hover:underline font-semibold">
                    + Add New Business
                  </Link>
                </div>
                <select
                  value={activeBusiness?.id || ""}
                  onChange={(e) => setActiveBusinessId(e.target.value)}
                  className="w-full max-w-md border border-[#cccccc] rounded-[2px] px-3 py-2 text-sm bg-white"
                >
                  {visibleBusinesses.length === 0 && <option value="">Select Business</option>}
                  {visibleBusinesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.legalName} ({b.ein})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#222] mb-2">
                  Select Your Tax Return to report with IRS<span className="text-red-600">*</span>{" "}
                  <HelpCircle className="w-3.5 h-3.5 text-[#1e40af] inline" />
                </label>
                <div className="grid sm:grid-cols-4 gap-3">
                  {[
                    {
                      value: "2290_ORIG" as FormType,
                      title: "Form 2290 Tax",
                      desc: "Prepare your heavy vehicle taxes and report it here",
                      color: "#1e40af",
                    },
                    {
                      value: "2290_AMEND" as FormType,
                      title: "2290 Amendment",
                      desc: "Prepare your 2290 Amendment return and report it here",
                      color: "#0073b7",
                    },
                    {
                      value: "2290_VIN_CORR" as FormType,
                      title: "VIN Correction",
                      desc: "Correct your mistakenly reported VIN# here",
                      color: "#dc2626",
                    },
                    {
                      value: "8849_SCH6" as FormType,
                      title: "2290 Claim",
                      desc: "Prepare refund claim on a credit vehicles here",
                      color: "#d97706",
                    },
                  ].map((opt) => {
                    const selected = formType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setFormType(opt.value);
                          if (opt.value === "2290_VIN_CORR") setActiveVehicleTab("VIN_CORRECTION");
                          else if (opt.value === "8849_SCH6") setActiveVehicleTab("CREDIT");
                          else setActiveVehicleTab("TAXABLE");
                        }}
                        className={`p-4 border text-center rounded-[2px] transition cursor-pointer flex flex-col items-center justify-between space-y-2 ${selected
                            ? "bg-[#dbeafe] border-[#1e40af] ring-1 ring-[#1e40af]"
                            : "bg-white border-[#cccccc] hover:bg-slate-50"
                          }`}
                      >
                        <div className="font-semibold text-sm text-[#222]">{opt.title}</div>
                        <div
                          className="w-11 h-11 rounded border-2 flex items-center justify-center font-bold text-xs bg-white"
                          style={{ borderColor: opt.color, color: opt.color }}
                        >
                          {opt.value === "8849_SCH6" ? "8849" : "2290"}
                        </div>
                        <div className="text-[11px] text-[#444] leading-snug">{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 max-w-xl">
                <label className="block space-y-1">
                  <span className="font-bold text-[#222]">
                    Select Tax Year: <span className="text-red-600">*</span>
                  </span>
                  <select
                    value={taxYear}
                    onChange={(e) => setTaxYear(e.target.value)}
                    className="w-full border border-[#cccccc] rounded-[2px] px-3 py-2 text-sm bg-white"
                  >
                    <option value="2026-2027">2026-2027 (Jul 2026 - Jun 2027)</option>
                    <option value="2025-2026">2025-2026 (Jul 2025 - Jun 2026)</option>
                    <option value="2024-2025">2024-2025 (Jul 2024 - Jun 2025)</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="font-bold text-[#222]">
                    Select Your First Used Month:<span className="text-red-600">*</span>
                  </span>
                  <select
                    value={firstUsedMonth}
                    onChange={(e) => setFirstUsedMonth(Number(e.target.value))}
                    className="w-full border border-[#cccccc] rounded-[2px] px-3 py-2 text-sm bg-white"
                  >
                    {TAX_PERIOD_MONTHS.map((m) => (
                      <option key={m.month} value={m.month}>
                        {m.name} ({m.remainingMonths} mo)
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="space-y-2.5 pt-2 text-xs text-[#222]">
                <div>
                  <div className="font-bold mb-0.5">Final Return:</div>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={finalReturn}
                      onChange={(e) => setFinalReturn(e.target.checked)}
                    />
                    <span>Check if this is the final return for this business</span>
                  </label>
                </div>
                <div>
                  <div className="font-bold mb-0.5">Address Change:</div>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addressChange}
                      onChange={(e) => setAddressChange(e.target.checked)}
                    />
                    <span>Check if your address has changed from last filing</span>
                  </label>
                </div>
                <div>
                  <div className="font-bold mb-0.5">Third Party Designee:</div>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={thirdPartyAssigned}
                      onChange={(e) => setThirdPartyAssigned(e.target.checked)}
                    />
                    <span>Third Party Assigned</span>
                  </label>
                </div>
                <div>
                  <div className="font-bold mb-0.5">Consent to Disclosure</div>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentToDisclosure}
                      onChange={(e) => setConsentToDisclosure(e.target.checked)}
                    />
                    <span>I agree with consent to disclosure</span>
                  </label>
                </div>
              </div>

              <div className="text-[11px] text-[#555] border-t border-[#eeeeee] pt-2.5">
                IRS Filing Deadline for <strong>{getMonthName(firstUsedMonth)}</strong> ({taxYear}):{" "}
                <strong>{deadline}</strong>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: TAX OPTIONS (td-reporting-vehicles.png & exceed-amendment.png) */}
        {step === 2 && (
          <div className="space-y-4">
            {formType === "2290_AMEND" ? (
              <div className="space-y-3">
                <div className="text-sm text-[#333] inline-flex items-center gap-1">
                  Select Amendment <HelpCircle className="w-3.5 h-3.5 text-[#1e40af]" />
                </div>
                <div className="border border-[#dcdcdc] p-8 grid sm:grid-cols-2 gap-8 text-center">
                  <label className="cursor-pointer space-y-3">
                    <TruckBadgeCircle badgeColor="#1e40af" symbol="⚖" />
                    <div>
                      <input
                        type="radio"
                        checked={amendedReason === "WEIGHT_INCREASE"}
                        onChange={() => setAmendedReason("WEIGHT_INCREASE")}
                        className="accent-[#0073b7]"
                      />
                    </div>
                    <div className="text-xs font-semibold text-[#222]">
                      Increase in Taxable Gross Vehicle Weight
                    </div>
                    <div className="text-[11px] text-[#555]">
                      Month Changed: <strong>{getMonthName(firstUsedMonth)}</strong>
                    </div>
                  </label>

                  <label className="cursor-pointer space-y-3">
                    <TruckBadgeCircle badgeColor="#dc2626" symbol="!" />
                    <div>
                      <input
                        type="radio"
                        checked={amendedReason === "MILEAGE_EXCEEDED"}
                        onChange={() => setAmendedReason("MILEAGE_EXCEEDED")}
                        className="accent-[#0073b7]"
                      />
                    </div>
                    <div className="text-xs font-semibold text-[#222]">
                      Suspended Vehicle Exceedes Mileage Use Limit
                    </div>
                    <div className="text-[11px] text-[#555]">
                      Month Exceeded Limit: <strong>{getMonthName(firstUsedMonth)}</strong>
                    </div>
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-[#333] inline-flex items-center gap-1">
                  Select Reporting Vehicles <HelpCircle className="w-3.5 h-3.5 text-[#1e40af]" />
                </div>
                <div className="border border-[#dcdcdc] p-6 grid lg:grid-cols-12 gap-6 text-center text-xs">
                  {/* Taxable & Suspended */}
                  <div className="lg:col-span-5 lg:border-r border-[#e5e5e5] pr-4 space-y-4">
                    <div className="text-sm font-medium text-[#333]">Taxable Vehicle</div>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="cursor-pointer space-y-2.5">
                        <TruckBadgeCircle badgeColor="#1e40af" symbol="$" />
                        <input
                          type="checkbox"
                          checked={enabledSections.TAXABLE}
                          onChange={(e) =>
                            setEnabledSections((s) => ({ ...s, TAXABLE: e.target.checked }))
                          }
                        />
                        <div className="text-[#222] font-medium">Taxable Vehicle</div>
                      </label>
                      <label className="cursor-pointer space-y-2.5">
                        <TruckBadgeCircle badgeColor="#dc2626" symbol="⊘" />
                        <input
                          type="checkbox"
                          checked={enabledSections.SUSPENDED}
                          onChange={(e) =>
                            setEnabledSections((s) => ({ ...s, SUSPENDED: e.target.checked }))
                          }
                        />
                        <div className="text-[#222] font-medium">
                          Suspended Vehicle <br />
                          <strong>(Exempt from Tax)</strong>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Credit Vehicles */}
                  <div className="lg:col-span-4 lg:border-r border-[#e5e5e5] pr-4 space-y-4">
                    <div className="text-sm font-medium text-[#333]">Credit Vehicle</div>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="cursor-pointer space-y-2.5">
                        <TruckBadgeCircle badgeColor="#0073b7" symbol="⇄" />
                        <input
                          type="checkbox"
                          checked={enabledSections.CREDIT_SOLD}
                          onChange={(e) =>
                            setEnabledSections((s) => ({ ...s, CREDIT_SOLD: e.target.checked }))
                          }
                        />
                        <div className="text-[#222] font-medium">
                          Sold, Destroyed, and Stolen Vehicle Credits
                        </div>
                      </label>
                      <label className="cursor-pointer space-y-2.5">
                        <TruckBadgeCircle badgeColor="#eab308" symbol="⏱" />
                        <input
                          type="checkbox"
                          checked={enabledSections.CREDIT_LOW}
                          onChange={(e) =>
                            setEnabledSections((s) => ({ ...s, CREDIT_LOW: e.target.checked }))
                          }
                        />
                        <div className="text-[#222] font-medium">Low Mileage Vehicle Credits</div>
                      </label>
                    </div>
                  </div>

                  {/* Prior Year */}
                  <div className="lg:col-span-3 space-y-4">
                    <div className="text-sm font-medium text-[#333]">Prior Year Vehicle</div>
                    <label className="block cursor-pointer space-y-2.5">
                      <TruckBadgeCircle badgeColor="#dc2626" symbol="↺" />
                      <input
                        type="checkbox"
                        checked={enabledSections.PRIOR_SUSP}
                        onChange={(e) => {
                          setEnabledSections((s) => ({ ...s, PRIOR_SUSP: e.target.checked }));
                          setPriorYearSuspendedAllUnderLimit(e.target.checked);
                        }}
                      />
                      <div className="text-[#222] font-medium">Prior Year Suspended Vehicle</div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: VEHICLE INFORMATION (td-vehicle-information-1/2/3.png & vin-add.png) */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-sm text-[#333]">Enter Your Vehicle Details</div>

            {/* 5 Dark Green Category Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {vehicleTabButtons.map((tb) => (
                <button
                  key={tb.id}
                  type="button"
                  onClick={() => setActiveVehicleTab(tb.id)}
                  className={`py-2.5 px-3 text-xs font-semibold rounded-[2px] transition cursor-pointer ${activeVehicleTab === tb.id
                      ? "bg-[#1e40af] text-white shadow-xs ring-2 ring-[#0073b7]"
                      : "bg-[#1d4ed8] hover:bg-[#1e40af] text-white opacity-85"
                    }`}
                >
                  {tb.label} ({tb.count})
                </button>
              ))}
            </div>

            {/* Active Category Section Box */}
            <div className="border border-[#cccccc] bg-[#fafafa] p-4 rounded-[2px] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-[#222] inline-flex items-center gap-1">
                    {vehicleTabButtons.find((t) => t.id === activeVehicleTab)?.label}
                    <HelpCircle className="w-3.5 h-3.5 text-[#1e40af]" />
                  </div>
                  <p className="text-[11px] text-[#555] mt-0.5">
                    Add your vehicles one by one or choose &quot;Bulk Upload&quot; option to upload from your CSV worksheet
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openAddVehicleModal(activeVehicleTab)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] border border-[#cccccc] bg-white hover:bg-slate-50 text-xs font-semibold text-[#222] cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-[#1e40af]" /> Add Vehicles
                  </button>
                  {currentTabLines.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setLines((prev) => prev.filter((l) => l.lineType !== activeVehicleTab))
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[2px] bg-[#0073b7] hover:bg-[#005f97] text-white text-xs font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete All
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowImportModal(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[2px] bg-[#0073b7] hover:bg-[#005f97] text-white text-xs font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Import Vehicles ({businessRoster.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkDefaultType(activeVehicleTab);
                      setShowBulkModal(true);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[2px] bg-[#0073b7] hover:bg-[#005f97] text-white text-xs font-semibold cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" /> Bulk Upload
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search VIN here..."
                    className="pl-7 pr-3 py-1 border border-[#cccccc] bg-white rounded-[2px] text-xs w-52"
                  />
                </div>
              </div>

              {/* #34495e Table Header matching td-vehicle-information-3.png */}
              <div className="overflow-x-auto border border-[#cccccc] bg-white">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#34495e] text-white font-semibold">
                    <tr>
                      <th className="px-3 py-2.5 border-r border-[#4a627d]">Unit Number</th>
                      <th className="px-3 py-2.5 border-r border-[#4a627d]">VIN</th>
                      <th className="px-3 py-2.5 border-r border-[#4a627d]">Gross Weight</th>
                      <th className="px-3 py-2.5 border-r border-[#4a627d]">Logging</th>
                      <th className="px-3 py-2.5 border-r border-[#4a627d]">Is Purchased Vehicle</th>
                      <th className="px-3 py-2.5 border-r border-[#4a627d]">Tax Amount</th>
                      <th className="px-3 py-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e5e5]">
                    {currentTabLines.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-7 text-center text-[#666]">
                          No vehicles listed under{" "}
                          <strong>{vehicleTabButtons.find((t) => t.id === activeVehicleTab)?.label}</strong>. Click{" "}
                          <strong>+ Add Vehicles</strong> above.
                        </td>
                      </tr>
                    ) : (
                      currentTabLines.map(({ line, idx }) => {
                        const weightLabel =
                          WEIGHT_CATEGORIES.find((w) => w.category === line.weightCategory)?.label ||
                          line.weightCategory;
                        return (
                          <tr key={line.id || idx} className="hover:bg-slate-50">
                            <td className="px-3 py-2 border-r border-[#e5e5e5]">{line.unitNumber || "—"}</td>
                            <td className="px-3 py-2 border-r border-[#e5e5e5] font-mono font-bold">
                              {line.vin}
                              {line.priorVin && (
                                <div className="text-[11px] font-normal text-amber-700">
                                  Prev VIN: {line.priorVin}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 border-r border-[#e5e5e5]">{weightLabel}</td>
                            <td className="px-3 py-2 border-r border-[#e5e5e5]">
                              {line.isLogging ? "Yes" : "No"}
                            </td>
                            <td className="px-3 py-2 border-r border-[#e5e5e5]">
                              {line.isPrivatelyPurchased ? "Yes" : "No"}
                            </td>
                            <td className="px-3 py-2 border-r border-[#e5e5e5] font-bold">
                              ${Number(line.computedTax).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-center space-x-2">
                              <button
                                type="button"
                                onClick={() => openEditVehicleModal(idx)}
                                className="text-amber-600 hover:text-amber-700 cursor-pointer"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4 inline" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                                className="text-rose-600 hover:text-rose-800 cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="text-right text-xs font-medium text-[#222] space-y-0.5 pt-1">
                <div>
                  Tax Due: <strong>${totalTaxDue.toFixed(2)}</strong>
                </div>
                <div>
                  Credits: <strong>${totalCredits.toFixed(2)}</strong>
                </div>
                <div className="text-sm text-[#1e40af]">
                  Balance Due: <strong>${netTaxDue.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: IRS OPTIONS (td-irs-upload.png) */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="text-sm text-[#333]">IRS Filing and Payment Options</div>

            <div className="border border-[#dcdcdc] p-5 space-y-4 text-xs">
              <div>
                <h3 className="text-lg font-normal text-[#1e40af] inline-flex items-center gap-1 mb-2">
                  E-filing Method <HelpCircle className="w-3.5 h-3.5 text-[#1e40af]" />
                </h3>
                <div className="font-bold text-[#222] mb-2">Do you want to E-file your return?</div>
                <div className="flex items-center gap-6">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={eFileMethod}
                      onChange={() => setEFileMethod(true)}
                      className="accent-[#0073b7]"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={!eFileMethod}
                      onChange={() => setEFileMethod(false)}
                      className="accent-[#0073b7]"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              <div className="border-t border-[#e5e5e5] pt-4 space-y-2.5">
                <h3 className="text-lg font-normal text-[#1e40af] inline-flex items-center gap-1">
                  IRS Payment Method <HelpCircle className="w-3.5 h-3.5 text-[#1e40af]" />
                </h3>

                {[
                  {
                    id: "EFW" as IrsPaymentMethod,
                    label: "Electronic Funds Withdrawal - EFW (recommended)",
                  },
                  {
                    id: "EFTPS" as IrsPaymentMethod,
                    label: "Electronic Federal Tax Payment System (EFTPS)",
                  },
                  {
                    id: "CARD" as IrsPaymentMethod,
                    label: "Pay Using Credit / Debit Card (Limited to use only 2 times in a tax period)",
                  },
                  {
                    id: "CHECK" as IrsPaymentMethod,
                    label: "Pay Using Check or Money Order (Need to attach 2290-V Payment Voucher)",
                  },
                ].map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer text-[#222] font-medium">
                    <input
                      type="radio"
                      checked={taxMethod === opt.id}
                      onChange={() => setTaxMethod(opt.id)}
                      className="accent-[#0073b7]"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}

                {taxMethod === "EFW" && (
                  <div className="mt-3 p-4 border border-[#0073b7] bg-[#f0f7fc] rounded-lg space-y-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#0073b7]">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Direct Electronic Funds Withdrawal (ACH Direct Debit)</span>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <label className="block space-y-1">
                        <span className="font-bold text-slate-800">
                          ABA Routing Number (9 Digits) <span className="text-rose-600">*</span>
                        </span>
                        <input
                          maxLength={9}
                          placeholder="e.g. 122000496"
                          value={routingNumber}
                          onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, ""))}
                          className={`w-full border px-2.5 py-2 font-mono rounded bg-white ${routingNumber.length === 9
                              ? validateAbaRouting(routingNumber).valid
                                ? "border-emerald-500 focus:ring-emerald-500"
                                : "border-rose-500 focus:ring-rose-500"
                              : "border-[#cccccc]"
                            }`}
                        />
                        {routingNumber.length === 9 && (
                          <p
                            className={`text-[10px] ${validateAbaRouting(routingNumber).valid
                                ? "text-emerald-700 font-medium"
                                : "text-rose-600 font-medium"
                              }`}
                          >
                            {validateAbaRouting(routingNumber).valid
                              ? "✓ Valid Routing Number"
                              : "✗ Invalid ABA Checksum"}
                          </p>
                        )}
                      </label>

                      <label className="block space-y-1">
                        <span className="font-bold text-slate-800">
                          Account Number <span className="text-rose-600">*</span>
                        </span>
                        <input
                          maxLength={17}
                          placeholder="Bank account number"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                          className="w-full border border-[#cccccc] bg-white px-2.5 py-2 font-mono rounded"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="font-bold text-slate-800">
                          Confirm Account Number <span className="text-rose-600">*</span>
                        </span>
                        <input
                          maxLength={17}
                          placeholder="Re-enter account number"
                          value={confirmAccountNumber}
                          onChange={(e) =>
                            setConfirmAccountNumber(e.target.value.replace(/\D/g, ""))
                          }
                          className={`w-full border px-2.5 py-2 font-mono rounded bg-white ${confirmAccountNumber && confirmAccountNumber !== accountNumber
                              ? "border-rose-500"
                              : "border-[#cccccc]"
                            }`}
                        />
                        {confirmAccountNumber && confirmAccountNumber !== accountNumber && (
                          <p className="text-[10px] text-rose-600 font-medium">
                            Account numbers do not match
                          </p>
                        )}
                      </label>

                      <div className="grid grid-cols-2 gap-2">
                        <label className="block space-y-1">
                          <span className="font-bold text-slate-800">Account Type</span>
                          <select
                            value={accountType}
                            onChange={(e) =>
                              setAccountType(e.target.value as "CHECKING" | "SAVINGS")
                            }
                            className="w-full border border-[#cccccc] bg-white px-2.5 py-2 rounded text-xs"
                          >
                            <option value="CHECKING">Checking</option>
                            <option value="SAVINGS">Savings</option>
                          </select>
                        </label>

                        <label className="block space-y-1">
                          <span className="font-bold text-slate-800">Debit Date</span>
                          <input
                            type="date"
                            value={debitDate}
                            onChange={(e) => setDebitDate(e.target.value)}
                            className="w-full border border-[#cccccc] bg-white px-2 py-2 rounded text-xs"
                          />
                        </label>
                      </div>
                    </div>

                    <label className="flex items-start gap-2 pt-2 border-t border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={efwConsent}
                        onChange={(e) => setEfwConsent(e.target.checked)}
                        className="mt-0.5 accent-[#0073b7]"
                      />
                      <span className="text-[11px] text-slate-600 leading-relaxed">
                        <strong>IRS EFW Consent:</strong> I authorize the U.S. Treasury and its
                        designated Financial Agent to initiate an ACH electronic funds withdrawal
                        (direct debit) entry to the bank account indicated above for payment of my
                        federal taxes owed on Form 2290.
                      </span>
                    </label>
                  </div>
                )}

                {taxMethod === "EFTPS" && (
                  <div className="mt-3 p-4 border border-blue-200 bg-blue-50/70 rounded-lg space-y-2 text-xs">
                    <div className="font-semibold text-blue-900 flex items-center justify-between">
                      <span>Electronic Federal Tax Payment System (EFTPS)</span>
                      <a
                        href="https://www.eftps.gov"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0073b7] hover:underline"
                      >
                        Visit EFTPS.gov <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      You have selected to pay via EFTPS. <strong>Note:</strong> Payment will not be
                      debited automatically by this software. You must log into your existing account
                      at <strong>www.eftps.gov</strong> and schedule your payment at least one
                      business day before the due date (by 8:00 PM Eastern).
                    </p>
                  </div>
                )}

                {taxMethod === "CARD" && (
                  <div className="mt-3 p-4 border border-purple-200 bg-purple-50/70 rounded-lg space-y-2 text-xs">
                    <div className="font-semibold text-purple-900 flex items-center justify-between">
                      <span>Pay by Credit / Debit Card (IRS Authorized Processors)</span>
                      <a
                        href="https://www.irs.gov/payments/pay-your-taxes-by-debit-or-credit-card"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:underline"
                      >
                        IRS.gov Card Payment Portal <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Federal regulations require all tax card payments to go through IRS-authorized
                      third-party card processors (ACI Payments, PayUSATax, or Pay1040). Card
                      processors charge a standard ~1.87% convenience fee. Form 2290 card payments
                      are limited to 2 payments per tax period.
                    </p>
                  </div>
                )}

                {taxMethod === "CHECK" && (
                  <div className="mt-3 p-4 border border-amber-200 bg-amber-50/70 rounded-lg space-y-2 text-xs">
                    <div className="font-semibold text-amber-900">
                      <span>Pay by Check or Money Order with Form 2290-V</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Upon submission, your official <strong>Form 2290-V Payment Voucher</strong>{" "}
                      will be generated automatically. Make your check payable to{" "}
                      <strong>&quot;United States Treasury&quot;</strong>, write your EIN, &quot;2026
                      Form 2290&quot;, and your daytime phone number on the check, and mail it with
                      the voucher. Do not staple the check to the voucher.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: PRICING & PURCHASE SUMMARY (td-pricing-purchase-summary.png) */}
        {step === 5 && (
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            {/* Left: Select Package + 3 #4a607a Subscription Cards */}
            <div className="lg:col-span-6 space-y-4">
              <div className="text-sm text-[#333] inline-flex items-center gap-1">
                Select Package: <HelpCircle className="w-3.5 h-3.5 text-[#1e40af]" />
              </div>

              <div className="border border-[#cccccc] p-4 space-y-4 text-xs">
                <p className="text-[#333] font-medium">
                  To complete your tax return preparation and proceed towards e-file pay a nominal service fee
                </p>

                <div className="space-y-2.5">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    <input
                      type="radio"
                      checked={packageType === "PER_VEHICLE" && !hasUnlimitedAnnualPlan}
                      onChange={() => {
                        setHasUnlimitedAnnualPlan(false);
                        setPackageType("PER_VEHICLE");
                      }}
                    />
                    <span>Reporting Vehicles - {Math.max(1, lines.length)}</span>
                    <span className="text-[#1e40af] font-bold">
                      $
                      {computeServiceFeeQuote({
                        formType,
                        vehicleCount: lines.length,
                        packageType: "PER_VEHICLE",
                      }).baseAmount.toFixed(2)}
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    <input
                      type="radio"
                      checked={packageType === "UNLIMITED_SINGLE" && !hasUnlimitedAnnualPlan}
                      onChange={() => {
                        setHasUnlimitedAnnualPlan(false);
                        setPackageType("UNLIMITED_SINGLE");
                      }}
                    />
                    <span>Unlimited Vehicles - Single Return</span>
                    <span className="text-[#1e40af] font-bold">$139.99</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    <input
                      type="radio"
                      checked={packageType === "UNLIMITED_ANNUAL"}
                      onChange={() => {
                        setHasUnlimitedAnnualPlan(false);
                        setPackageType("UNLIMITED_ANNUAL");
                      }}
                    />
                    <span>Unlimited Vehicles &amp; Unlimited Returns for a Tax Period</span>
                    <span className="text-[#1e40af] font-bold">$199.99</span>
                  </label>
                </div>

                {/* 3 #4a607a Subscription Cards */}
                <div className="space-y-3 pt-1">
                  <div className="border border-[#cccccc]">
                    <div className="bg-[#4a607a] text-white px-3 py-2 font-bold text-sm">
                      Subscribe for FAX Copies of Sch-1
                    </div>
                    <div className="p-3 bg-white space-y-2">
                      <label className="inline-flex items-center gap-2 cursor-pointer font-medium">
                        <input
                          type="checkbox"
                          checked={addOnFax}
                          onChange={(e) => setAddOnFax(e.target.checked)}
                        />
                        <span>I want my schedule 1 copy through fax : $1.00</span>
                      </label>
                      {addOnFax && (
                        <input
                          value={faxNumber}
                          onChange={(e) => setFaxNumber(e.target.value)}
                          placeholder="Fax Number"
                          className="w-full border border-[#cccccc] px-2.5 py-1.5 text-xs"
                        />
                      )}
                    </div>
                  </div>

                  <div className="border border-[#cccccc]">
                    <div className="bg-[#4a607a] text-white px-3 py-2 font-bold text-sm">
                      Subscribe for TEXT alert on your tax return status
                    </div>
                    <div className="p-3 bg-white">
                      <label className="inline-flex items-center gap-2 cursor-pointer font-medium">
                        <input
                          type="checkbox"
                          checked={addOnSms}
                          onChange={(e) => setAddOnSms(e.target.checked)}
                        />
                        <span>I want to receive text alert on my return status : $1.00</span>
                      </label>
                    </div>
                  </div>

                  <div className="border border-[#cccccc]">
                    <div className="bg-[#4a607a] text-white px-3 py-2 font-bold text-sm">
                      Subscribe for additional EMAIL alert to get a Sch-1 Copy
                    </div>
                    <div className="p-3 bg-white space-y-2">
                      <label className="inline-flex items-center gap-2 cursor-pointer font-medium">
                        <input
                          type="checkbox"
                          checked={addOnEmail}
                          onChange={(e) => setAddOnEmail(e.target.checked)}
                        />
                        <span>I want to share my Schedule-1 copy to the following emails</span>
                      </label>
                      {addOnEmail && (
                        <input
                          value={additionalEmails}
                          onChange={(e) => setAdditionalEmails(e.target.value)}
                          placeholder="dispatch@carrier.com, permit@dmv.org"
                          className="w-full border border-[#cccccc] px-2.5 py-1.5 text-xs"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <label className="block font-semibold mb-1">
                    Promo Code (TRUCK10, FLEET25, POCFREE)
                  </label>
                  <input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Optional discount code"
                    className="w-full max-w-xs border border-[#cccccc] px-2.5 py-1.5 uppercase font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Right: Purchase Summary Table */}
            <div className="lg:col-span-6 space-y-4">
              <div className="text-sm text-[#333] inline-flex items-center gap-1">
                Purchase Summary: <HelpCircle className="w-3.5 h-3.5 text-[#1e40af]" />
              </div>

              <div className="border border-[#cccccc]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#4a607a] text-white">
                    <tr>
                      <th className="px-4 py-2.5">Summary</th>
                      <th className="px-4 py-2.5 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e5e5]">
                    <tr>
                      <td className="px-4 py-2.5">{quote.pricingTier}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">${quote.baseAmount.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5">Fax Copy - Service Fee</td>
                      <td className="px-4 py-2.5 text-right">${quote.faxFee.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5">Text Alert - Service Fee</td>
                      <td className="px-4 py-2.5 text-right">${quote.smsFee.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5">Previously Paid / Discount</td>
                      <td className="px-4 py-2.5 text-right text-[#1e40af]">
                        -${(quote.discountAmount + quote.previouslyPaidAmount).toFixed(2)}
                      </td>
                    </tr>
                    <tr className="bg-[#eeeeee] font-bold text-sm">
                      <td className="px-4 py-2.5">Total Amount</td>
                      <td className="px-4 py-2.5 text-right">${quote.finalAmount.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: PAYMENT INFORMATION (td-payment-information.png) */}
        {step === 6 && (
          <div className="space-y-4">
            <div className="text-sm text-[#333]">Checkout Page</div>

            <form
              onSubmit={handleCheckoutPayment}
              className="border border-[#dcdcdc] p-5 grid lg:grid-cols-12 gap-6 items-start"
            >
              <div className="lg:col-span-6 space-y-3 text-xs">
                <div className="text-sm font-medium text-[#222]">Enter your card details:</div>
                <label className="block space-y-1">
                  <span className="font-bold">
                    Card Type<span className="text-red-600">*</span>
                  </span>
                  <select
                    value={cardType}
                    onChange={(e) => setCardType(e.target.value)}
                    className="w-full border border-[#cccccc] bg-white px-3 py-2 text-sm rounded-[2px]"
                  >
                    <option value="Visa">Visa</option>
                    <option value="MasterCard">MasterCard</option>
                    <option value="Amex">Amex</option>
                    <option value="Discover">Discover</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="font-bold">
                    Card Number<span className="text-red-600">*</span>{" "}
                    <span className="text-[11px] font-normal text-[#666]">
                      (4242... approves · 4000... tests decline)
                    </span>
                  </span>
                  <input
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full border border-[#cccccc] bg-white px-3 py-2 text-sm font-mono rounded-[2px]"
                  />
                </label>

                <div className="grid grid-cols-3 gap-3">
                  <label className="block space-y-1">
                    <span className="font-bold">
                      Expiry Month<span className="text-red-600">*</span>
                    </span>
                    <select
                      value={expMonth}
                      onChange={(e) => setExpMonth(e.target.value)}
                      className="w-full border border-[#cccccc] bg-white px-2.5 py-2 text-sm rounded-[2px]"
                    >
                      {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map(
                        (m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="font-bold">Year</span>
                    <select
                      value={expYear}
                      onChange={(e) => setExpYear(e.target.value)}
                      className="w-full border border-[#cccccc] bg-white px-2.5 py-2 text-sm rounded-[2px]"
                    >
                      {["2026", "2027", "2028", "2029", "2030", "2031"].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="font-bold">
                      CVV<span className="text-red-600">*</span>
                    </span>
                    <input
                      required
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="w-full border border-[#cccccc] bg-white px-2.5 py-2 text-sm font-mono rounded-[2px]"
                    />
                  </label>
                </div>

                <label className="inline-flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={editBillingAddress}
                    onChange={(e) => setEditBillingAddress(e.target.checked)}
                  />
                  <span>Edit Address</span>
                </label>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-[2px] bg-[#0073b7] hover:bg-[#005f97] text-white font-semibold text-xs cursor-pointer disabled:opacity-50"
                  >
                    <CreditCard className="w-4 h-4" />
                    {busy ? "Processing..." : "Make Payment"}
                  </button>
                </div>
              </div>

              {/* Right Summary Table */}
              <div className="lg:col-span-6 border border-[#cccccc]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#4a607a] text-white">
                    <tr>
                      <th className="px-4 py-2.5">Purchase Summary</th>
                      <th className="px-4 py-2.5 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e5e5]">
                    <tr>
                      <td className="px-4 py-2.5">{quote.pricingTier}</td>
                      <td className="px-4 py-2.5 text-right">${quote.baseAmount.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5">Fax Copy - Service Fee</td>
                      <td className="px-4 py-2.5 text-right">${quote.faxFee.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5">Text Alert - Service Fee</td>
                      <td className="px-4 py-2.5 text-right">${quote.smsFee.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5">Discount (if any)</td>
                      <td className="px-4 py-2.5 text-right text-[#1e40af]">
                        -${quote.discountAmount.toFixed(2)}
                      </td>
                    </tr>
                    <tr className="bg-[#eeeeee] font-bold">
                      <td className="px-4 py-2.5">Total Amount</td>
                      <td className="px-4 py-2.5 text-right">${quote.finalAmount.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </form>
          </div>
        )}

        {/* STEP 7: FORM SUMMARY (td-form-summary.png) */}
        {step === 7 && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="text-sm font-bold text-[#222]">Thank you for your payment!</div>
              <p className="text-xs text-[#444]">
                Check the Form 2290 Tax Return that you&apos;re about to Submit to the IRS. You would need to
                submit the return with the IRS to have this processed before you receive the IRS Watermarked
                Schedule 1 receipt.
              </p>
              <button
                type="button"
                onClick={() => setShowPinModal(true)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-[2px] bg-[#d93025] hover:bg-[#b52219] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> Submit Return To IRS
              </button>
            </div>

            <div className="border border-[#dcdcdc] p-4 grid lg:grid-cols-12 gap-5">
              {/* Left 2 Tables */}
              <div className="lg:col-span-6 space-y-4">
                <div className="border border-[#cccccc]">
                  <div className="bg-[#4a607a] text-white px-3.5 py-2 text-xs font-bold flex justify-between">
                    <span>Business Information</span>
                    <button type="button" onClick={() => setStep(1)} className="cursor-pointer">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-[#e5e5e5]">
                      <tr>
                        <td className="px-3 py-2 text-[#555] w-40">Business Name:</td>
                        <td className="px-3 py-2 font-bold">{activeBusiness?.legalName}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-[#555]">Address:</td>
                        <td className="px-3 py-2">
                          {activeBusiness?.addressLine1}, {activeBusiness?.city}, {activeBusiness?.state}{" "}
                          {activeBusiness?.zip}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-[#555]">EIN:</td>
                        <td className="px-3 py-2 font-mono">{activeBusiness?.ein}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-[#555]">Phone:</td>
                        <td className="px-3 py-2">{activeBusiness?.phone}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-[#555]">Signing Authority:</td>
                        <td className="px-3 py-2">{activeBusiness?.signingAuthorityName}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-[#555]">Tax Form:</td>
                        <td className="px-3 py-2 font-semibold">{formType}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="border border-[#cccccc]">
                  <div className="bg-[#4a607a] text-white px-3.5 py-2 text-xs font-bold flex justify-between">
                    <span>Filing, IRS Payment and Other Details</span>
                    <button type="button" onClick={() => setStep(4)} className="cursor-pointer">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-[#e5e5e5]">
                      <tr>
                        <td className="px-3 py-2 text-[#555] w-40">Filing Method</td>
                        <td className="px-3 py-2">{eFileMethod ? "E-file" : "Paper Mail"}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-[#555]">IRS Payment Method</td>
                        <td className="px-3 py-2 font-semibold">{taxMethod}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right 2 Tables */}
              <div className="lg:col-span-6 space-y-4">
                <div className="border border-[#cccccc]">
                  <div className="bg-[#4a607a] text-white px-3.5 py-2 text-xs font-bold flex justify-between">
                    <span>Vehicle Details</span>
                    <button type="button" onClick={() => setStep(3)} className="cursor-pointer">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-[#e5e5e5]">
                      <tr>
                        <td className="px-3 py-2">Taxable Vehicles</td>
                        <td className="px-3 py-2 text-right font-bold">
                          {lines.filter((l) => l.lineType === "TAXABLE").length}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">Suspended Vehicles</td>
                        <td className="px-3 py-2 text-right font-bold">
                          {lines.filter((l) => l.lineType === "SUSPENDED").length}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">Sold / Destroyed Credits</td>
                        <td className="px-3 py-2 text-right font-bold">
                          {lines.filter((l) => l.lineType === "CREDIT" || l.lineType === "CREDIT_OVERPAID").length}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">Low Mileage Credits</td>
                        <td className="px-3 py-2 text-right font-bold">
                          {lines.filter((l) => l.lineType === "CREDIT_LOW_MILEAGE").length}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">Prior Year Suspended Vehicles</td>
                        <td className="px-3 py-2 text-right font-bold">
                          {lines.filter((l) => l.lineType === "PRIOR_YEAR_SUSPENDED").length}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="p-2.5 text-center border-t border-[#e5e5e5]">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-3.5 py-1.5 rounded-[2px] bg-[#0073b7] text-white text-xs font-semibold cursor-pointer"
                    >
                      Verify VIN Details
                    </button>
                  </div>
                </div>

                <div className="border border-[#cccccc]">
                  <div className="bg-[#4a607a] text-white px-3.5 py-2 text-xs font-bold">Tax Due</div>
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-[#e5e5e5]">
                      <tr>
                        <td className="px-3 py-2">Tax Due</td>
                        <td className="px-3 py-2 text-right font-semibold">${totalTaxDue.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">Credits</td>
                        <td className="px-3 py-2 text-right text-[#1e40af]">${totalCredits.toFixed(2)}</td>
                      </tr>
                      <tr className="bg-[#f8f9fa] font-bold">
                        <td className="px-3 py-2">Total Tax Due</td>
                        <td className="px-3 py-2 text-right">${netTaxDue.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="p-4 text-center space-y-2.5 border-t border-[#e5e5e5] text-xs">
                    <div>View your tax Form 2290 PDF here</div>
                    {savedFiling && (
                      <div>
                        <a
                          href={buildPdfHref("form2290", savedFiling, activeBusiness)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[2px] bg-[#d93025] hover:bg-[#b52219] text-white font-bold"
                        >
                          <FileText className="w-4 h-4" /> View Tax Form in PDF
                        </a>
                      </div>
                    )}
                    <div>Submit your 2290 with the IRS here</div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowPinModal(true)}
                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-[2px] bg-[#d93025] hover:bg-[#b52219] text-white font-bold cursor-pointer"
                      >
                        <Upload className="w-4 h-4" /> Submit Return To IRS
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 8: FINISH / TRANSMITTED (td-finish.png & td-transmitted.png) */}
        {step === 8 && savedFiling && (
          <div className="space-y-6">
            <div className="border border-[#cccccc] p-6 space-y-5 text-center">
              <p className="text-xs font-bold text-[#222] max-w-2xl mx-auto">
                Please make sure you complete the process by submitting your return to IRS for processing.
                Unless you submit your return IRS will not receive it, make sure you have hit the Submit Return button.
              </p>

              {/* 3 Large Status Boxes */}
              <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="border border-[#dcdcdc] p-5 bg-white space-y-2">
                  <FileCheck2 className="w-10 h-10 mx-auto text-[#1e40af]" />
                  <div className="text-xs font-bold text-[#222]">Tax Return Completed</div>
                </div>
                <div className="border border-[#dcdcdc] p-5 bg-white space-y-2">
                  {savedFiling.status === "ACCEPTED" || savedFiling.status === "TRANSMITTED_TO_IRS" ? (
                    <CheckCircle2 className="w-10 h-10 mx-auto text-[#1e40af]" />
                  ) : (
                    <Upload className="w-10 h-10 mx-auto text-[#0073b7]" />
                  )}
                  <div className="text-xs font-bold text-[#222]">
                    {savedFiling.status === "PAID" ? "Yet to Submit" : "Tax Return Submitted"}
                  </div>
                </div>
                <div className="border border-[#dcdcdc] p-5 bg-white space-y-2">
                  <FileText
                    className={`w-10 h-10 mx-auto ${savedFiling.status === "ACCEPTED" ? "text-[#d93025]" : "text-[#777]"
                      }`}
                  />
                  <div className="text-xs font-bold text-[#222]">
                    {savedFiling.status === "ACCEPTED" ? "Sch-1 Receipt Ready" : "Sch-1 in Progress"}
                  </div>
                </div>
              </div>

              {savedFiling.status === "PAID" && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowPinModal(true)}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-[2px] bg-[#d93025] hover:bg-[#b52219] text-white text-sm font-bold cursor-pointer"
                  >
                    <Upload className="w-4 h-4" /> Submit Return To IRS
                  </button>
                </div>
              )}

              {(savedFiling.status === "ACCEPTED" || savedFiling.status === "TRANSMITTED_TO_IRS") && (
                <div className="bg-[#1e40af] text-white py-2.5 px-4 max-w-xl mx-auto text-xs font-bold rounded-[2px]">
                  Your return has been successfully submitted to IRS (Submission ID:{" "}
                  {savedFiling.irsSubmissionId})
                </div>
              )}

              {savedFiling.status === "EDITING_AFTER_REJECT" && (
                <div className="bg-rose-50 border border-rose-300 p-4 max-w-2xl mx-auto text-left space-y-2 text-xs">
                  <div className="font-bold text-rose-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    IRS Rejection ({savedFiling.rejectionCode}):{" "}
                    {rejectionGuide?.title || savedFiling.rejectionMessage}
                  </div>
                  <p className="text-rose-700">{rejectionGuide?.humanFixGuide || savedFiling.rejectionMessage}</p>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-4 py-1.5 rounded-[2px] bg-[#d93025] text-white font-bold cursor-pointer"
                  >
                    Fix &amp; Resubmit for Free
                  </button>
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-2.5 pt-2">
                {savedFiling.status === "ACCEPTED" && (
                  <a
                    href={buildPdfHref("schedule1", savedFiling, activeBusiness)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[2px] bg-[#1e40af] hover:bg-[#1e3a8a] text-white text-xs font-bold"
                  >
                    <Download className="w-4 h-4" /> Download Stamped Schedule 1 PDF
                  </a>
                )}
                <a
                  href={buildPdfHref("form2290", savedFiling, activeBusiness)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[2px] bg-[#d93025] text-white text-xs font-bold"
                >
                  <FileText className="w-4 h-4" /> Form 2290 PDF
                </a>
                {taxMethod === "CHECK" && (
                  <a
                    href={buildPdfHref("voucher", savedFiling, activeBusiness)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[2px] border border-[#cccccc] bg-white text-xs font-bold text-[#222]"
                  >
                    <Printer className="w-4 h-4" /> Form 2290-V Voucher
                  </a>
                )}
                {savedFiling.mefXml && (
                  <button
                    type="button"
                    onClick={() => setShowXmlModal(true)}
                    className="px-4 py-2 rounded-[2px] border border-[#cccccc] bg-white text-xs font-bold cursor-pointer"
                  >
                    View MeF XML
                  </button>
                )}
                <Link
                  href="/dashboard"
                  className="px-4 py-2 rounded-[2px] bg-[#0073b7] text-white text-xs font-bold"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>

            {/* Payment Receipt Section (td-finish.png bottom) */}
            {savedFiling.serviceOrder && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-[#333]">Payment Receipt</div>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0073b7] hover:underline cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print
                  </button>
                </div>
                <div className="border border-[#cccccc] bg-white p-5 text-xs space-y-4">
                  <div className="flex flex-wrap justify-between gap-4 border-b border-[#e5e5e5] pb-4">
                    <IrsHvutLogo compact />
                    <div className="text-[#444]">
                      <div className="font-semibold text-[#1e3a8a]">IRS-HVUT · 2290 tax filings</div>
                      <div>Form 2290 Electronic Filing Gateway</div>
                      <div>IRS HVUT FORM 2290 E FILE SIMULATOR</div>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <div className="italic font-bold">Bill To:</div>
                      <div className="font-bold">{activeBusiness?.legalName}</div>
                      <div>
                        {activeBusiness?.addressLine1}, {activeBusiness?.city}, {activeBusiness?.state}{" "}
                        {activeBusiness?.zip}
                      </div>
                    </div>
                    <div>
                      <div>
                        Order Date :{" "}
                        <strong>
                          {new Date(savedFiling.serviceOrder.paidAt || Date.now()).toLocaleDateString()}
                        </strong>
                      </div>
                      <div>
                        Invoice Number :{" "}
                        <strong>
                          {savedFiling.serviceOrder.invoiceNumber || savedFiling.serviceOrder.id}
                        </strong>
                      </div>
                      <div>
                        Plan : <strong>{savedFiling.serviceOrder.pricingTier}</strong> · Total Paid:{" "}
                        <strong className="text-[#1e40af]">
                          ${savedFiling.serviceOrder.finalAmount.toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom Gray Navigation Footer matching User Guide Screenshots */}
        {step !== 6 && (
          <div className="bg-[#eeeeee] border-t border-[#dcdcdc] -mx-5 -mb-5 px-5 py-3 flex items-center justify-between">
            <button
              type="button"
              disabled={step === 1}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[2px] bg-[#0073b7] hover:bg-[#005f97] text-white text-xs font-semibold cursor-pointer disabled:opacity-40"
            >
              <ArrowLeftCircle className="w-3.5 h-3.5" /> Previous
            </button>
            {step < 6 ? (
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex items-center gap-1.5 px-5 py-1.5 rounded-[2px] bg-[#0073b7] hover:bg-[#005f97] text-white text-xs font-semibold cursor-pointer"
              >
                Next <ArrowRightCircle className="w-3.5 h-3.5" />
              </button>
            ) : step === 7 ? (
              <button
                type="button"
                onClick={() => setStep(8)}
                className="inline-flex items-center gap-1.5 px-5 py-1.5 rounded-[2px] bg-[#0073b7] hover:bg-[#005f97] text-white text-xs font-semibold cursor-pointer"
              >
                Next <ArrowRightCircle className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-5 py-1.5 rounded-[2px] bg-[#1e40af] hover:bg-[#1e3a8a] text-white text-xs font-semibold"
              >
                Done — Return to Dashboard
              </Link>
            )}
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT VEHICLE (#1e40af Green Header matching td-vehicle-information-2.png & vin-add.png) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2px] shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-[#1e40af] text-white px-5 py-3 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {draftLine.lineType === "VIN_CORRECTION"
                  ? "Vin Correction"
                  : draftLine.lineType === "SUSPENDED"
                    ? "Add Suspended Vehicle"
                    : "Add Taxable Vehicle"}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-white text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              {modalError && (
                <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-800 font-semibold">
                  {modalError}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="font-bold text-[#222]">Vehicle Section</span>
                  <select
                    value={draftLine.lineType}
                    onChange={(e) => {
                      const nextType = e.target.value as VehicleLineType;
                      setDraftLine((d) => {
                        if (nextType !== "VIN_CORRECTION" || d.priorVin?.trim()) {
                          return { ...d, lineType: nextType };
                        }
                        const matched =
                          findPriorVehicle(d.unitNumber, d.vin) || priorBusinessVehicles[0];
                        return {
                          ...d,
                          lineType: nextType,
                          priorVin: matched?.vin || d.vin?.trim().toUpperCase() || "",
                          unitNumber: d.unitNumber || matched?.unitNumber || "",
                          weightCategory: matched?.weightCategory || d.weightCategory,
                          isLogging: matched ? matched.isLogging : d.isLogging,
                          isAgricultural: matched ? matched.isAgricultural : d.isAgricultural,
                        };
                      });
                    }}
                    className="w-full border border-[#cccccc] rounded-[2px] px-2.5 py-2 text-sm bg-white"
                  >
                    <option value="TAXABLE">Taxable Vehicle</option>
                    <option value="SUSPENDED">Suspended Vehicle</option>
                    <option value="PRIOR_YEAR_SUSPENDED">Prior Year Suspended</option>
                    <option value="CREDIT">Sold / Destroyed Credit</option>
                    <option value="CREDIT_LOW_MILEAGE">Low Mileage Credit</option>
                    <option value="CREDIT_OVERPAID">Overpaid Credit</option>
                    <option value="VIN_CORRECTION">VIN Correction</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="font-bold text-[#222]">Unit Number</span>
                  <input
                    value={draftLine.unitNumber || ""}
                    onChange={(e) => {
                      const nextUnit = e.target.value;
                      setDraftLine((d) => {
                        if (d.lineType !== "VIN_CORRECTION") {
                          return { ...d, unitNumber: nextUnit };
                        }
                        const trimmed = nextUnit.trim().toLowerCase();
                        const byUnit = trimmed
                          ? priorBusinessVehicles.find(
                            (v) => v.unitNumber?.trim().toLowerCase() === trimmed,
                          )
                          : undefined;
                        if (byUnit) {
                          return {
                            ...d,
                            unitNumber: nextUnit,
                            priorVin: byUnit.vin,
                            weightCategory: byUnit.weightCategory,
                            isLogging: byUnit.isLogging,
                            isAgricultural: byUnit.isAgricultural,
                          };
                        }
                        return { ...d, unitNumber: nextUnit };
                      });
                    }}
                    placeholder="e.g. 101"
                    className="w-full border border-[#cccccc] rounded-[2px] px-2.5 py-2 text-sm"
                  />
                </label>
              </div>

              {draftLine.lineType === "VIN_CORRECTION" && (
                <div className="space-y-2">
                  {priorBusinessVehicles.length > 0 && (
                    <label className="block space-y-1">
                      <span className="font-bold text-[#222] text-xs flex items-center justify-between">
                        <span>Fetched Previous Vehicle (Filed Return / Fleet Roster)</span>
                        <span className="text-[11px] font-normal text-[#0073b7]">
                          {priorBusinessVehicles.length} vehicle(s) available
                        </span>
                      </span>
                      <select
                        value={
                          priorBusinessVehicles.some(
                            (v) => v.vin === (draftLine.priorVin || "").trim().toUpperCase(),
                          )
                            ? (draftLine.priorVin || "").trim().toUpperCase()
                            : ""
                        }
                        onChange={(e) => {
                          const picked = priorBusinessVehicles.find(
                            (v) => v.vin === e.target.value,
                          );
                          if (!picked) return;
                          setDraftLine((d) => ({
                            ...d,
                            priorVin: picked.vin,
                            unitNumber: picked.unitNumber || d.unitNumber || "",
                            weightCategory: picked.weightCategory,
                            isLogging: picked.isLogging,
                            isAgricultural: picked.isAgricultural,
                          }));
                        }}
                        className="w-full border border-[#cccccc] rounded-[2px] px-2.5 py-2 text-xs bg-[#f8fafc] font-mono"
                      >
                        <option value="">-- Select previously filed vehicle --</option>
                        {priorBusinessVehicles.map((v) => (
                          <option key={v.vin} value={v.vin}>
                            {v.unitNumber ? `Unit ${v.unitNumber} — ` : ""}
                            {v.vin} ({v.weightCategory}) · {v.sourceLabel}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="block space-y-1">
                    <span className="font-bold text-[#222]">
                      Previous VIN<span className="text-red-600">*</span>
                    </span>
                    <input
                      maxLength={17}
                      value={draftLine.priorVin || ""}
                      onChange={(e) =>
                        setDraftLine((d) => ({ ...d, priorVin: e.target.value.toUpperCase() }))
                      }
                      placeholder="Enter previous incorrect 17-char VIN"
                      className="w-full border border-[#cccccc] rounded-[2px] px-2.5 py-2 text-sm font-mono uppercase"
                    />
                  </label>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#222]">
                    {draftLine.lineType === "VIN_CORRECTION" ? "Correct VIN" : "VIN"}
                    <span className="text-red-600">*</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftLine((d) => ({
                        ...d,
                        vin: generateValidTestVin(Math.floor(Math.random() * 500)),
                      }))
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0073b7] hover:underline cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Auto-Gen Valid VIN
                  </button>
                </div>
                <input
                  maxLength={17}
                  value={draftLine.vin || ""}
                  onChange={(e) =>
                    setDraftLine((d) => ({ ...d, vin: e.target.value.toUpperCase() }))
                  }
                  placeholder="1FUJA6CV56LW12345"
                  className="w-full border border-[#cccccc] rounded-[2px] px-2.5 py-2 text-sm font-mono uppercase"
                />
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(draftLine.isLogging)}
                  onChange={(e) => setDraftLine((d) => ({ ...d, isLogging: e.target.checked }))}
                />
                <span>
                  <strong>Logging Vehicle</strong> (Check here only if used for Forest/Logging purpose only)
                </span>
              </label>

              {formType === "2290_AMEND" && amendedReason === "WEIGHT_INCREASE" && (
                <label className="block space-y-1">
                  <span className="font-bold text-[#222]">Prior Taxable Gross Weight</span>
                  <select
                    value={draftLine.priorWeightCategory || "A"}
                    onChange={(e) =>
                      setDraftLine((d) => ({ ...d, priorWeightCategory: e.target.value as WeightCategory }))
                    }
                    className="w-full border border-[#cccccc] rounded-[2px] px-2.5 py-2 text-sm bg-white"
                  >
                    {WEIGHT_CATEGORIES.filter((c) => c.category !== "W").map((c) => (
                      <option key={c.category} value={c.category}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block space-y-1">
                <span className="font-bold text-[#222]">
                  Taxable Gross Weight<span className="text-red-600">*</span>
                </span>
                <select
                  value={draftLine.weightCategory || "V"}
                  onChange={(e) =>
                    setDraftLine((d) => ({ ...d, weightCategory: e.target.value as WeightCategory }))
                  }
                  className="w-full border border-[#cccccc] rounded-[2px] px-2.5 py-2 text-sm bg-white"
                >
                  {WEIGHT_CATEGORIES.map((c) => (
                    <option key={c.category} value={c.category}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(draftLine.isPrivatelyPurchased)}
                  onChange={(e) =>
                    setDraftLine((d) => ({ ...d, isPrivatelyPurchased: e.target.checked }))
                  }
                />
                <span>Was the vehicle purchased from a private seller?</span>
              </label>

              {CREDIT_TYPES.has((draftLine.lineType || "TAXABLE") as VehicleLineType) && (
                <div className="grid sm:grid-cols-2 gap-3 p-3 border border-[#cccccc] bg-[#f8f9fa]">
                  <label className="block space-y-1">
                    <span className="font-bold">Credit Amount ($)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={draftLine.priorTaxPaid ?? 550}
                      onChange={(e) =>
                        setDraftLine((d) => ({ ...d, priorTaxPaid: Number(e.target.value) }))
                      }
                      className="w-full border border-[#cccccc] px-2 py-1.5 bg-white"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-bold">Sale / Disposition Date</span>
                    <input
                      type="date"
                      value={draftLine.dispositionDate || ""}
                      onChange={(e) =>
                        setDraftLine((d) => ({ ...d, dispositionDate: e.target.value }))
                      }
                      className="w-full border border-[#cccccc] px-2 py-1.5 bg-white"
                    />
                  </label>
                </div>
              )}

              <div className="bg-[#f4f7f5] border border-[#dcdcdc] px-3 py-2 flex justify-between font-bold">
                <span>Calculated Tax / Credit</span>
                <span className="text-[#1e40af]">${draftComputedTax.toFixed(2)}</span>
              </div>

              <div className="flex justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleSaveVehicleLine(false)}
                  className="px-5 py-2 rounded-[2px] bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-bold cursor-pointer"
                >
                  Save
                </button>
                {editLineIndex === null && (
                  <button
                    type="button"
                    onClick={() => handleSaveVehicleLine(true)}
                    className="px-5 py-2 rounded-[2px] bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-bold cursor-pointer"
                  >
                    Save &amp; Add Another
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TRANSACTION PIN (td-finish.png) */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2px] shadow-2xl max-w-md w-full">
            <div className="bg-[#1e40af] text-white px-5 py-3 flex items-center justify-between">
              <h3 className="font-bold text-sm">Transaction PIN</h3>
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                className="text-white text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>
            <form onSubmit={handlePinModalSubmit} className="p-5 space-y-4 text-xs">
              <label className="block space-y-1">
                <span className="font-bold text-[#222]">
                  Transaction PIN<span className="text-red-600">*</span>
                </span>
                <input
                  type="password"
                  maxLength={5}
                  required
                  value={pinSignature}
                  onChange={(e) => setPinSignature(e.target.value.replace(/\D/g, ""))}
                  className="w-full border border-[#0073b7] rounded-[2px] px-3 py-2 text-sm font-mono"
                />
              </label>
              <p className="text-[#444]">
                Enter any 5 digit number of your choice to electronically sign your return, before you
                submit it to the IRS for processing.
              </p>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={busy}
                  className="px-5 py-2 rounded-[2px] bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-bold cursor-pointer"
                >
                  {busy ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT ROSTER */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2px] shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto">
            <div className="bg-[#1e40af] text-white px-5 py-3 flex items-center justify-between">
              <h3 className="font-bold text-sm">Import Fleet Vehicles</h3>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-white text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              {businessRoster.length === 0 ? (
                <p>No saved fleet vehicles for this business.</p>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedRosterIds(businessRoster.map((v) => v.id))}
                    className="text-[#0073b7] font-bold hover:underline cursor-pointer"
                  >
                    Select All ({businessRoster.length})
                  </button>
                  <div className="border border-[#cccccc] divide-y divide-[#e5e5e5] max-h-60 overflow-y-auto">
                    {businessRoster.map((v) => (
                      <label key={v.id} className="flex items-center justify-between px-3 py-2 cursor-pointer">
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedRosterIds.includes(v.id)}
                            onChange={(e) =>
                              setSelectedRosterIds((prev) =>
                                e.target.checked ? [...prev, v.id] : prev.filter((id) => id !== v.id),
                              )
                            }
                          />
                          <span className="font-mono font-bold">{v.vin}</span>
                          <span>{v.unitNumber || ""}</span>
                        </span>
                        <span>Cat {v.defaultWeightCategory}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-1.5 border border-[#cccccc] cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleImportRosterConfirm}
                  disabled={selectedRosterIds.length === 0}
                  className="px-4 py-1.5 bg-[#1e40af] text-white font-bold disabled:opacity-40 cursor-pointer"
                >
                  Import ({selectedRosterIds.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BULK UPLOAD */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2px] shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="bg-[#1e40af] text-white px-5 py-3 flex items-center justify-between">
              <h3 className="font-bold text-sm">Bulk Upload Vehicles (CSV)</h3>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="text-white text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between bg-[#f4f4f4] border border-[#dcdcdc] p-3">
                <span>Headers: VIN, UnitNumber, WeightCategory, LineType, Logging, Agricultural</span>
                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  className="inline-flex items-center gap-1 text-[#1e40af] font-bold hover:underline cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Download Sample CSV
                </button>
              </div>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleBulkCsvFile(file);
                }}
                className="block w-full border border-[#cccccc] p-2"
              />
              {bulkPreview.length > 0 && (
                <div className="border border-[#cccccc] max-h-56 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#34495e] text-white">
                      <tr>
                        <th className="px-3 py-1.5">VIN</th>
                        <th className="px-3 py-1.5">Weight</th>
                        <th className="px-3 py-1.5">Status</th>
                        <th className="px-3 py-1.5 text-right">Tax</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e5e5]">
                      {bulkPreview.map((r, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 font-mono">{r.vin}</td>
                          <td className="px-3 py-1.5">{r.weightCategory}</td>
                          <td className="px-3 py-1.5">
                            {r.valid ? (
                              <span className="text-[#1e40af] font-bold">Valid</span>
                            ) : (
                              <span className="text-rose-600">{r.error}</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-right">${r.computedTax.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-1.5 border border-[#cccccc] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCommitBulkPreview}
                  disabled={bulkPreview.filter((r) => r.valid).length === 0}
                  className="px-4 py-1.5 bg-[#1e40af] text-white font-bold disabled:opacity-40 cursor-pointer"
                >
                  Import {bulkPreview.filter((r) => r.valid).length} Valid Rows
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MEF XML */}
      {showXmlModal && savedFiling?.mefXml && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2px] shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col">
            <div className="bg-[#34495e] text-white px-5 py-3 flex items-center justify-between">
              <h3 className="font-bold text-sm">IRS MeF XML ({savedFiling.irsSubmissionId})</h3>
              <button
                type="button"
                onClick={() => setShowXmlModal(false)}
                className="text-white text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>
            <pre className="p-4 text-[11px] font-mono bg-slate-950 text-sky-300 overflow-auto flex-1">
              {savedFiling.mefXml}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FileNewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[#555]">Loading Form 2290 Wizard...</div>}>
      <FileNewWizardInner />
    </Suspense>
  );
}
