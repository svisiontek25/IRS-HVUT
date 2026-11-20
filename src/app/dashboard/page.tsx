"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightCircle,
  CopyCheck,
  Edit,
  FileCode2,
  FileText,
  Gauge,
  HelpCircle,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { buildPdfHref, usePoc } from "@/components/PocProvider";
import { ReturnFiling } from "@/lib/adapters/types";
import { lookupRejection } from "@/lib/adapters/rejection-codes";

function formatFormType(formType: ReturnFiling["formType"], amendedReason?: string): string {
  switch (formType) {
    case "2290_ORIG":
      return "Form 2290";
    case "2290_AMEND":
      return amendedReason === "MILEAGE_EXCEEDED"
        ? "Amendment (Mileage)"
        : "Amendment";
    case "2290_VIN_CORR":
      return "VIN Correction";
    case "8849_SCH6":
      return "Form 8849";
    default:
      return formType;
  }
}

function formatStatusLabel(status: ReturnFiling["status"]): string {
  switch (status) {
    case "ACCEPTED":
      return "Schedule 1 Ready";
    case "EDITING_AFTER_REJECT":
      return "Rejected — Fix Free";
    case "TRANSMITTED_TO_IRS":
      return "Transmitted to IRS";
    case "QUEUED":
      return "Queued";
    case "PAID":
      return "Paid — Ready to Submit";
    default:
      return "Not Submitted";
  }
}

export default function DashboardPage() {
  const router = useRouter();
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

  useEffect(() => {
    if (!loading && activeUser && activeUser.role !== "ADMIN" && visibleBusinesses.length === 0) {
      router.replace("/businesses/new?onboarding=1");
    }
  }, [loading, activeUser, visibleBusinesses.length, router]);

  const activeBiz =
    visibleBusinesses.find((b) => b.id === activeBusinessId) || visibleBusinesses[0];

  const bizFilings = useMemo(
    () => (activeBiz ? filings.filter((f) => f.businessId === activeBiz.id) : []),
    [filings, activeBiz],
  );
  const bizVehicles = useMemo(
    () => (activeBiz ? vehicles.filter((v) => v.businessId === activeBiz.id) : []),
    [vehicles, activeBiz],
  );

  const [carryBusy, setCarryBusy] = useState(false);
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);
  const [xmlFiling, setXmlFiling] = useState<ReturnFiling | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  async function handleSyncStatus(filingId: string) {
    setCheckingStatusId(filingId);
    setBanner(null);
    try {
      const res = await fetch(`/api/filings/${filingId}/sync-status`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        await refresh();
        setBanner(`IRS Status updated: ${data.status}`);
      } else {
        setBanner(data.error || "Could not check IRS status");
      }
    } catch {
      setBanner("Failed to connect to status check API");
    } finally {
      setCheckingStatusId(null);
    }
  }

  async function handleCarryForward() {
    if (!activeBiz) return;
    setCarryBusy(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/businesses/${activeBiz.id}/carry-forward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taxYear: "2026-2027",
          business: activeBiz,
          vehicles: bizVehicles,
        }),
      });
      const data = await res.json();
      if (res.ok && data.filing) {
        await refresh();
        router.push(`/file/new?editFilingId=${data.filing.id}`);
      } else {
        setBanner(data.error || "Could not carry forward fleet.");
      }
    } finally {
      setCarryBusy(false);
    }
  }

  if (!loading && activeUser && activeUser.role !== "ADMIN" && visibleBusinesses.length === 0) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white border border-slate-200 rounded-xl p-6 text-center shadow-xs space-y-2">
        <div className="text-sm font-semibold text-slate-900">Redirecting to Add Business Info...</div>
        <p className="text-xs text-slate-500">
          Please add your business entity before accessing your return dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Green Dashboard Header matching td-dashboard.png */}
      <div className="flex items-center gap-2 text-[#1e40af]">
        <Gauge className="w-6 h-6" />
        <h1 className="text-[24px] font-normal">Dashboard</h1>
      </div>

      {/* My Business Selector Bar matching td-dashboard.png */}
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-[#333]">My Business</div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={activeBiz?.id || ""}
              onChange={(e) => setActiveBusinessId(e.target.value)}
              className="border border-[#cccccc] bg-white rounded-[2px] px-3 py-1.5 text-xs font-bold text-[#222] min-w-[270px] shadow-2xs"
            >
              {visibleBusinesses.length === 0 && <option value="">No businesses yet</option>}
              {visibleBusinesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.legalName} ({b.ein})
                </option>
              ))}
            </select>

            {activeBiz && (
              <Link
                href={`/businesses/new?editBusinessId=${activeBiz.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] border border-[#cccccc] bg-white hover:bg-slate-50 text-xs font-medium text-[#333] shadow-2xs"
              >
                <Edit className="w-3.5 h-3.5 text-amber-500" /> Edit Business
              </Link>
            )}

            <Link
              href="/businesses/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] border border-[#cccccc] bg-white hover:bg-slate-50 text-xs font-medium text-[#333] shadow-2xs"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#1e40af]" /> Add Business
            </Link>

            {activeBiz && bizVehicles.length > 0 && (
              <button
                type="button"
                disabled={carryBusy}
                onClick={handleCarryForward}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] border border-[#cccccc] bg-white hover:bg-slate-50 text-xs font-medium text-[#0073b7] shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <CopyCheck className="w-3.5 h-3.5" />
                {carryBusy ? "Copying..." : "Carry-Forward Fleet"}
              </button>
            )}
          </div>

          <Link
            href="/file/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#1e40af] hover:bg-[#1e3a8a] text-white text-xs font-semibold shadow-2xs"
          >
            <span>Start My New Return</span>
            <ArrowRightCircle className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {banner && (
        <div className="p-3 rounded-[2px] bg-rose-50 border border-rose-300 text-xs font-semibold text-rose-800">
          {banner}
        </div>
      )}

      {/* Return Summary Panel matching td-dashboard.png */}
      <div className="bg-white border border-[#cccccc] rounded-[2px] p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-normal text-[#333]">Return Summary</div>
          <div className="text-[11px] text-[#666]">
            Name Control: <strong className="font-mono text-[#222]">{activeBiz?.nameControl || "—"}</strong> ·
            Saved Fleet VINs: <strong className="text-[#222]">{bizVehicles.length}</strong>
          </div>
        </div>

        <div className="overflow-x-auto border border-[#cccccc]">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#4a607a] text-white font-semibold">
              <tr>
                <th className="px-3.5 py-2.5 border-r border-[#5f7692]">Return ID</th>
                <th className="px-3.5 py-2.5 border-r border-[#5f7692]">Form Type</th>
                <th className="px-3.5 py-2.5 border-r border-[#5f7692]">Return Date</th>
                <th className="px-3.5 py-2.5 border-r border-[#5f7692]">Return Status</th>
                <th className="px-3.5 py-2.5 border-r border-[#5f7692] text-center">Filing Method</th>
                <th className="px-3.5 py-2.5 border-r border-[#5f7692] text-center">Action</th>
                <th className="px-3.5 py-2.5 border-r border-[#5f7692] text-center">View PDF</th>
                <th className="px-3.5 py-2.5 border-r border-[#5f7692] text-center">Schedule1 PDF</th>
                <th className="px-3.5 py-2.5 text-center">XML</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dcdcdc] bg-white">
              {bizFilings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-[#555]">
                    No returns found for {activeBiz?.legalName || "this business"}. Click{" "}
                    <Link href="/file/new" className="text-[#1e40af] font-bold hover:underline">
                      Start My New Return
                    </Link>{" "}
                    to begin Form 2290 e-filing.
                  </td>
                </tr>
              ) : (
                bizFilings.map((f, idx) => {
                  const rej = f.rejectionCode ? lookupRejection(f.rejectionCode) : undefined;
                  const dt = new Date(f.submittedAt || f.createdAt);
                  const mmddyyyy = `${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getDate()).padStart(2, "0")}/${dt.getFullYear()}`;
                  return (
                    <tr
                      key={f.id}
                      className={idx % 2 === 1 ? "bg-[#f8f9fb] hover:bg-indigo-50/40" : "hover:bg-indigo-50/40"}
                    >
                      <td className="px-3.5 py-2.5 border-r border-[#e5e5e5] whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/file/new?editFilingId=${f.id}`}
                            className="font-bold text-[#0073b7] underline hover:text-[#005182]"
                          >
                            {f.displayReturnId || f.id}
                          </Link>
                          <span
                            title={`${f.lines.length} vehicle(s) · Net Tax $${f.netTaxDue.toFixed(2)}`}
                            className="text-[#1e40af]"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                          </span>
                          {f.status === "ACCEPTED" && (
                            <span title="IRS Accepted">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#1e40af]" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 border-r border-[#e5e5e5] font-medium text-[#222]">
                        {formatFormType(f.formType, f.amendedReason)}
                      </td>
                      <td className="px-3.5 py-2.5 border-r border-[#e5e5e5] text-[#333] whitespace-nowrap">
                        {mmddyyyy}
                      </td>
                      <td className="px-3.5 py-2.5 border-r border-[#e5e5e5]">
                        <span
                          className={`font-semibold ${
                            f.status === "ACCEPTED"
                              ? "text-[#1e40af]"
                              : f.status === "EDITING_AFTER_REJECT"
                                ? "text-rose-700"
                                : "text-[#333]"
                          }`}
                        >
                          {formatStatusLabel(f.status)}
                        </span>
                        {(f.status === "TRANSMITTED_TO_IRS" || f.status === "QUEUED") && (
                          <div className="mt-1">
                            <button
                              type="button"
                              onClick={() => handleSyncStatus(f.id)}
                              disabled={checkingStatusId === f.id}
                              className="inline-flex items-center gap-1 text-[11px] text-[#0073b7] hover:underline cursor-pointer font-medium"
                              title="Check real-time status with IRS"
                            >
                              <RefreshCw
                                className={`w-3 h-3 ${checkingStatusId === f.id ? "animate-spin" : ""}`}
                              />
                              {checkingStatusId === f.id ? "Checking..." : "Sync Status"}
                            </button>
                          </div>
                        )}
                        {f.status === "EDITING_AFTER_REJECT" && f.rejectionCode && (
                          <div className="text-[11px] text-rose-700 mt-0.5 max-w-[200px]">
                            <strong>{f.rejectionCode}:</strong> {rej?.title || f.rejectionMessage}
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 border-r border-[#e5e5e5] text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-[#0073b7] text-[#0073b7] font-bold text-[10px] italic">
                          {f.eFileMethod === false ? "Paper" : "★ e-file"}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 border-r border-[#e5e5e5] text-center">
                        <Link
                          href={f.status === "ACCEPTED" ? `/file/new?formType=2290_VIN_CORR` : `/file/new?editFilingId=${f.id}`}
                          title={f.status === "ACCEPTED" ? "File Free VIN Correction" : "Open / Resume Return"}
                          className="inline-flex items-center justify-center text-amber-600 hover:text-amber-700"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                      </td>
                      <td className="px-3.5 py-2.5 border-r border-[#e5e5e5] text-center">
                        <a
                          href={buildPdfHref("form2290", f, activeBiz)}
                          target="_blank"
                          rel="noreferrer"
                          title="View Form 2290 PDF"
                          className="inline-flex items-center justify-center text-rose-600 hover:text-rose-800"
                        >
                          <FileText className="w-4 h-4" />
                        </a>
                      </td>
                      <td className="px-3.5 py-2.5 border-r border-[#e5e5e5] text-center">
                        {f.status === "ACCEPTED" ? (
                          <a
                            href={buildPdfHref("schedule1", f, activeBiz)}
                            target="_blank"
                            rel="noreferrer"
                            title="Download IRS Watermarked Schedule 1 PDF"
                            className="inline-flex items-center justify-center text-rose-600 hover:text-rose-800"
                          >
                            <FileText className="w-4 h-4" />
                          </a>
                        ) : f.taxPayment?.method === "CHECK" ? (
                          <a
                            href={buildPdfHref("voucher", f, activeBiz)}
                            target="_blank"
                            rel="noreferrer"
                            title="Form 2290-V Voucher"
                            className="text-[#0073b7] font-bold underline text-[11px]"
                          >
                            2290-V
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        {f.mefXml ? (
                          <button
                            type="button"
                            onClick={() => setXmlFiling(f)}
                            className="inline-flex items-center justify-center text-[#4a607a] hover:text-[#1e40af] cursor-pointer"
                            title="Inspect IRS MeF XML"
                          >
                            <FileCode2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fleet Roster Snapshot */}
      <div className="bg-white border border-[#cccccc] rounded-[2px] p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 text-sm text-[#333]">
            <Truck className="w-4 h-4 text-[#1e40af]" />
            <span>Saved Fleet Roster ({bizVehicles.length} Vehicles)</span>
          </div>
          <Link href="/post-filing" className="text-xs text-[#0073b7] hover:underline font-medium">
            Amendments &amp; Form 8849 Refund Hub -&gt;
          </Link>
        </div>

        <div className="overflow-x-auto border border-[#cccccc]">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#f4f4f4] border-b border-[#cccccc] text-[#333]">
              <tr>
                <th className="px-3 py-2">VIN</th>
                <th className="px-3 py-2">Unit #</th>
                <th className="px-3 py-2">Gross Weight Category</th>
                <th className="px-3 py-2">Special Flags</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e5e5]">
              {bizVehicles.map((v) => (
                <tr key={v.id}>
                  <td className="px-3 py-2 font-mono font-bold text-[#222]">{v.vin}</td>
                  <td className="px-3 py-2 text-[#555]">{v.unitNumber || "—"}</td>
                  <td className="px-3 py-2 font-semibold">Category {v.defaultWeightCategory}</td>
                  <td className="px-3 py-2 text-[#555]">
                    {[v.isLogging ? "Logging" : null, v.isAgricultural ? "Agricultural" : null]
                      .filter(Boolean)
                      .join(", ") || "Standard"}
                  </td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded-[2px] bg-indigo-50 border border-indigo-200 text-[#1e40af] font-semibold">
                      {v.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* XML Modal */}
      {xmlFiling?.mefXml && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2px] shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col">
            <div className="bg-[#1e3a8a] text-white px-5 py-3 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                MeF XML — {xmlFiling.displayReturnId || xmlFiling.id} ({xmlFiling.irsSubmissionId})
              </h3>
              <button
                type="button"
                onClick={() => setXmlFiling(null)}
                className="text-white text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>
            <pre className="p-4 text-[11px] font-mono bg-slate-950 text-sky-300 overflow-auto flex-1">
              {xmlFiling.mefXml}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
