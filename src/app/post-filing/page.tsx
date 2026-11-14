"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileCheck2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { usePoc } from "@/components/PocProvider";
import { ReturnFiling, WeightCategory } from "@/lib/adapters/types";
import {
  TAX_PERIOD_MONTHS,
  WEIGHT_CATEGORIES,
  calculateVehicleTax,
  calculateWeightIncreaseTax,
} from "@/lib/hvut/tax-engine";
import { generateValidTestVin, validateVin } from "@/lib/hvut/vin-validator";

type PostTab = "VIN_CORRECTION" | "AMENDMENT" | "FORM_8849";

export default function PostFilingPage() {
  const { users, businesses, filings, activeUserId, activeBusinessId, refresh } = usePoc();
  const activeUser = users.find((u) => u.id === activeUserId);
  const visibleBusinesses = useMemo(() => {
    if (!activeUser) return [];
    if (activeUser.role === "ADMIN" || activeUser.role === "CPA") return businesses;
    return businesses.filter((b) => b.ownerUserId === activeUser.id);
  }, [activeUser, businesses]);
  const activeBiz =
    visibleBusinesses.find((b) => b.id === activeBusinessId) || visibleBusinesses[0];

  const acceptedFilings = useMemo(
    () =>
      filings.filter(
        (f) => f.businessId === activeBiz?.id && f.status === "ACCEPTED",
      ),
    [filings, activeBiz],
  );

  const [tab, setTab] = useState<PostTab>("VIN_CORRECTION");
  const [selectedFilingId, setSelectedFilingId] = useState<string>("");
  const [priorVin, setPriorVin] = useState<string>("");
  const [correctedVin, setCorrectedVin] = useState<string>(generateValidTestVin());

  // Amendment fields
  const [amendReason, setAmendReason] = useState<"WEIGHT_INCREASE" | "MILEAGE_EXCEEDED">(
    "WEIGHT_INCREASE",
  );
  const [priorCategory, setPriorCategory] = useState<WeightCategory>("A");
  const [newCategory, setNewCategory] = useState<WeightCategory>("V");
  const [amendMonth, setAmendMonth] = useState<number>(10);
  const [amendVin, setAmendVin] = useState<string>(generateValidTestVin());

  // Form 8849 fields
  const [claimVin, setClaimVin] = useState<string>(generateValidTestVin());
  const [claimReason, setClaimReason] = useState<"SOLD" | "DESTROYED" | "STOLEN" | "LOW_MILEAGE">(
    "SOLD",
  );
  const [claimAmount, setClaimAmount] = useState<number>(275);

  const [submitting, setSubmitting] = useState(false);
  const [resultFiling, setResultFiling] = useState<ReturnFiling | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedPriorFiling =
    acceptedFilings.find((f) => f.id === selectedFilingId) || acceptedFilings[0];

  const effectivePriorVin =
    priorVin || selectedPriorFiling?.lines[0]?.vin || generateValidTestVin(999111);

  const amendIncrementalTax =
    amendReason === "WEIGHT_INCREASE"
      ? calculateWeightIncreaseTax(priorCategory, newCategory, false, amendMonth)
      : calculateVehicleTax(newCategory, false, 7);

  async function submitPostFiling() {
    if (!activeBiz) return;
    setErrorMsg(null);
    setResultFiling(null);
    setSubmitting(true);

    try {
      let payload: Partial<ReturnFiling>;
      if (tab === "VIN_CORRECTION") {
        const check = validateVin(correctedVin);
        if (!check.valid) {
          setErrorMsg(check.errors.join(" "));
          return;
        }
        payload = {
          businessId: activeBiz.id,
          formType: "2290_VIN_CORR",
          taxYear: selectedPriorFiling?.taxYear || "2026-2027",
          firstUsedMonth: selectedPriorFiling?.firstUsedMonth || 7,
          lines: [
            {
              id: `line-${Date.now()}`,
              filingId: "draft",
              vin: check.normalized,
              priorVin: effectivePriorVin,
              weightCategory: selectedPriorFiling?.lines[0]?.weightCategory || "V",
              isLogging: false,
              isAgricultural: false,
              lineType: "VIN_CORRECTION",
              computedTax: 0,
            },
          ],
        };
      } else if (tab === "AMENDMENT") {
        const check = validateVin(amendVin);
        if (!check.valid) {
          setErrorMsg(check.errors.join(" "));
          return;
        }
        payload = {
          businessId: activeBiz.id,
          formType: "2290_AMEND",
          taxYear: "2026-2027",
          firstUsedMonth: amendMonth,
          amendedReason: amendReason,
          lines: [
            {
              id: `line-${Date.now()}`,
              filingId: "draft",
              vin: check.normalized,
              weightCategory: newCategory,
              priorWeightCategory: priorCategory,
              isLogging: false,
              isAgricultural: false,
              lineType: "TAXABLE",
              computedTax: amendIncrementalTax,
            },
          ],
        };
      } else {
        const check = validateVin(claimVin);
        if (!check.valid) {
          setErrorMsg(check.errors.join(" "));
          return;
        }
        payload = {
          businessId: activeBiz.id,
          formType: "8849_SCH6",
          taxYear: "2026-2027",
          firstUsedMonth: 7,
          lines: [
            {
              id: `line-${Date.now()}`,
              filingId: "draft",
              vin: check.normalized,
              weightCategory: "V",
              isLogging: false,
              isAgricultural: false,
              lineType: "CREDIT",
              dispositionReason: claimReason,
              dispositionDate: new Date().toISOString().slice(0, 10),
              computedTax: claimAmount,
            },
          ],
        };
      }

      const saveRes = await fetch("/api/filings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        setErrorMsg(saveData.error || "Failed to create post-filing return");
        return;
      }

      const txRes = await fetch(`/api/filings/${saveData.filing.id}/checkout-submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorRole: activeUser?.role || "OWNER_OP",
          actorName: activeUser?.name || "Demo User",
          cardNumber: "4242424242424242",
          pinSignature: "54321",
          addOnSms: true,
          taxPayment: {
            id: `TAX-${Date.now()}`,
            filingId: saveData.filing.id,
            method: "EFW",
            bankRoutingLast4: "0021",
            bankAccountLast4: "6789",
            accountType: "CHECKING",
          },
        }),
      });
      const txData = await txRes.json();
      await refresh();
      if (!txRes.ok) {
        setErrorMsg(txData.error || "Submission failed");
        return;
      }
      setResultFiling(txData.filing);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Post-Filing Corrections, Amendments &amp; Form 8849 Claims
            </h1>
            <p className="text-xs text-slate-500">
              Active Business: <strong>{activeBiz?.legalName}</strong> ({activeBiz?.ein})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {(
            [
              ["VIN_CORRECTION", "Free VIN Correction (2290)"],
              ["AMENDMENT", "2290 Amendment (Weight / Mileage)"],
              ["FORM_8849", "Form 8849 Schedule 6 Refund"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setResultFiling(null);
                setErrorMsg(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                tab === id
                  ? "bg-blue-700 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          {errorMsg}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        {tab === "VIN_CORRECTION" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Form 2290 — VIN Correction</h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                $0.00 Fee (Filed on Platform)
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs font-semibold text-slate-700">
                  Original Accepted Return
                </span>
                <select
                  value={selectedPriorFiling?.id || ""}
                  onChange={(e) => setSelectedFilingId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                >
                  {acceptedFilings.length === 0 ? (
                    <option value="">No prior accepted filings (simulated external ref)</option>
                  ) : (
                    acceptedFilings.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.id} ({f.taxYear}) — {f.lines[0]?.vin}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-700">Incorrect Prior VIN</span>
                <input
                  value={effectivePriorVin}
                  onChange={(e) => setPriorVin(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono uppercase"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-700">Corrected 17-Char VIN</span>
                <div className="flex gap-2">
                  <input
                    value={correctedVin}
                    maxLength={17}
                    onChange={(e) => setCorrectedVin(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => setCorrectedVin(generateValidTestVin())}
                    className="px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-blue-700 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>
              </label>
            </div>
          </div>
        )}

        {tab === "AMENDMENT" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Form 2290 — Amended Return</h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Service Fee: $19.99
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-700">Amendment Reason</span>
                <select
                  value={amendReason}
                  onChange={(e) =>
                    setAmendReason(e.target.value as "WEIGHT_INCREASE" | "MILEAGE_EXCEEDED")
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                >
                  <option value="WEIGHT_INCREASE">Taxable Gross Weight Increase</option>
                  <option value="MILEAGE_EXCEEDED">
                    Category W Exceeded Mileage (5,000 / 7,500 mi)
                  </option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-700">Month Change Occurred</span>
                <select
                  value={amendMonth}
                  onChange={(e) => setAmendMonth(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                >
                  {TAX_PERIOD_MONTHS.map((m) => (
                    <option key={m.month} value={m.month}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-700">Vehicle VIN</span>
                <input
                  value={amendVin}
                  maxLength={17}
                  onChange={(e) => setAmendVin(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono uppercase"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-700">Prior Category</span>
                  <select
                    value={priorCategory}
                    onChange={(e) => setPriorCategory(e.target.value as WeightCategory)}
                    className="w-full rounded-xl border border-slate-300 px-2 py-2 bg-white text-xs"
                  >
                    {WEIGHT_CATEGORIES.map((c) => (
                      <option key={c.category} value={c.category}>
                        Cat {c.category}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-700">New Category</span>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as WeightCategory)}
                    className="w-full rounded-xl border border-slate-300 px-2 py-2 bg-white text-xs"
                  >
                    {WEIGHT_CATEGORIES.filter((c) => c.category !== "W").map((c) => (
                      <option key={c.category} value={c.category}>
                        Cat {c.category}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-sm flex justify-between">
              <span className="text-slate-600">Incremental IRS Tax Due:</span>
              <span className="font-bold text-blue-700">${amendIncrementalTax.toFixed(2)}</span>
            </div>
          </div>
        )}

        {tab === "FORM_8849" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Form 8849 Schedule 6 — Other Claims</h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Service Fee: $19.99
              </span>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-700">Vehicle VIN</span>
                <input
                  value={claimVin}
                  maxLength={17}
                  onChange={(e) => setClaimVin(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono uppercase"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-700">Refund Claim Reason</span>
                <select
                  value={claimReason}
                  onChange={(e) =>
                    setClaimReason(
                      e.target.value as "SOLD" | "DESTROYED" | "STOLEN" | "LOW_MILEAGE",
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                >
                  <option value="SOLD">Vehicle Sold</option>
                  <option value="DESTROYED">Vehicle Destroyed</option>
                  <option value="STOLEN">Vehicle Stolen</option>
                  <option value="LOW_MILEAGE">Prior-Year Low Mileage (≤5k/7.5k)</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-700">Refund Claim Amount ($)</span>
                <input
                  type="number"
                  min={1}
                  max={550}
                  value={claimAmount}
                  onChange={(e) => setClaimAmount(Math.max(1, Number(e.target.value) || 0))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            disabled={submitting}
            onClick={submitPostFiling}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Transmitting to IRS Simulator...
              </>
            ) : (
              "Checkout & Transmit to IRS MeF Simulator"
            )}
          </button>
        </div>
      </div>

      {resultFiling && (
        <div className="rounded-2xl bg-indigo-50 border border-indigo-200 p-5 space-y-3">
          <div className="flex items-center gap-2 font-bold text-indigo-900">
            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
            {resultFiling.formType} Outcome: {resultFiling.status} (Submission{" "}
            {resultFiling.irsSubmissionId})
          </div>
          <div className="flex flex-wrap gap-3">
            {resultFiling.status === "ACCEPTED" && (
              <a
                href={`/api/filings/${resultFiling.id}/schedule1`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-700 text-white text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5" /> Download Watermarked Schedule 1 PDF
              </a>
            )}
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-indigo-300 text-indigo-900 text-xs font-semibold"
            >
              View in Dashboard Vault
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

