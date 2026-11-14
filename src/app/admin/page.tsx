"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  RotateCcw,
  ShieldAlert,
  Sliders,
  XCircle,
} from "lucide-react";
import { usePoc } from "@/components/PocProvider";
import { IRS_REJECTION_CODES } from "@/lib/adapters/rejection-codes";
import { SimulatorMode } from "@/lib/adapters/types";

export default function AdminSimulatorPage() {
  const { filings, businesses, auditLogs, simulatorConfig, refresh } = usePoc();
  const [saving, setSaving] = useState(false);
  const [selectedRejectCode, setSelectedRejectCode] = useState("F2290-001");
  const [banner, setBanner] = useState<string | null>(null);

  const pendingFilings = filings.filter(
    (f) => f.status === "TRANSMITTED_TO_IRS" || f.status === "QUEUED",
  );

  async function updateConfig(patch: Record<string, unknown>) {
    setSaving(true);
    setBanner(null);
    try {
      await fetch("/api/simulator", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      await refresh();
      setBanner("Simulator configuration updated.");
    } finally {
      setSaving(false);
    }
  }

  async function resetDemoDb() {
    setSaving(true);
    try {
      await fetch("/api/simulator", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESET" }),
      });
      await refresh();
      setBanner("Database reset to fresh seeded demo state.");
    } finally {
      setSaving(false);
    }
  }

  async function decideFiling(filingId: string, decision: "ACCEPT" | "REJECT") {
    setSaving(true);
    try {
      await fetch(`/api/filings/${filingId}/simulate-decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          rejectionCode: decision === "REJECT" ? selectedRejectCode : undefined,
        }),
      });
      await refresh();
      setBanner(`Filing ${filingId} manually marked as ${decision}.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Admin &amp; IRS MeF Simulator Control Console
            </h1>
            <p className="text-xs text-slate-500">
              Control simulated IRS gateway behavior, review pending transmissions, and inspect audit logs
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={resetDemoDb}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset &amp; Reseed Demo Data
        </button>
      </div>

      {banner && (
        <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 text-sm text-indigo-800">
          {banner}
        </div>
      )}

      {/* Simulator Mode Controls */}
      {simulatorConfig && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Sliders className="w-4 h-4 text-blue-700" />
            IRS MeF Gateway Behavior Mode
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(
              [
                ["AUTO_ACCEPT", "Auto-Accept", "Valid filings receive Schedule 1 immediately."],
                ["MANUAL_REVIEW", "Manual Review", "Filings pause in TRANSMITTED_TO_IRS for admin decision."],
                ["AUTO_REJECT", "Force Reject", "Every submission fails with the chosen IRS code."],
                ["GATEWAY_OUTAGE", "Gateway Outage (503)", "Simulates IRS maintenance; filings stay QUEUED."],
              ] as [SimulatorMode, string, string][]
            ).map(([mode, title, desc]) => (
              <button
                key={mode}
                type="button"
                disabled={saving}
                onClick={() => updateConfig({ mode })}
                className={`text-left rounded-xl border p-4 transition cursor-pointer ${
                  simulatorConfig.mode === mode
                    ? "border-blue-700 bg-blue-50 ring-1 ring-blue-700"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="font-bold text-sm text-slate-900">{title}</div>
                <div className="text-xs text-slate-500 mt-1">{desc}</div>
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-4 gap-4 pt-2 text-xs">
            <label className="space-y-1">
              <span className="font-semibold text-slate-700">Simulated MeF Delay (ms)</span>
              <input
                type="number"
                value={simulatorConfig.simulatedDelayMs}
                onChange={(e) =>
                  updateConfig({ simulatedDelayMs: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5"
              />
            </label>
            <label className="space-y-1">
              <span className="font-semibold text-slate-700">Forced Reject Code</span>
              <select
                value={simulatorConfig.forcedRejectCode}
                onChange={(e) => updateConfig({ forcedRejectCode: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 bg-white"
              >
                {Object.keys(IRS_REJECTION_CODES).map((code) => (
                  <option key={code} value={code}>
                    {code} — {IRS_REJECTION_CODES[code].title}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="font-semibold text-slate-700">Simulated EFIN</span>
              <input
                value={simulatorConfig.efin}
                onChange={(e) => updateConfig({ efin: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono"
              />
            </label>
            <label className="space-y-1">
              <span className="font-semibold text-slate-700">Simulated Software ID</span>
              <input
                value={simulatorConfig.softwareId}
                onChange={(e) => updateConfig({ softwareId: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono"
              />
            </label>
          </div>
        </div>
      )}

      {/* Pending Queue / Manual Acknowledgment Desk */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-900">
              Pending MeF Transmission Queue ({pendingFilings.length})
            </h2>
            <p className="text-xs text-slate-500">
              Manually simulate IRS Acknowledgments (Accept or Reject) for queued/transmitted returns
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">Reject with Code:</span>
            <select
              value={selectedRejectCode}
              onChange={(e) => setSelectedRejectCode(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-1 bg-white"
            >
              {Object.keys(IRS_REJECTION_CODES).map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {pendingFilings.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              No filings waiting in TRANSMITTED_TO_IRS or QUEUED status. Switch MeF Mode above to{" "}
              <strong>Manual Review</strong> or <strong>Gateway Outage</strong> and submit a return to test manual acks.
            </div>
          ) : (
            pendingFilings.map((f) => {
              const biz = businesses.find((b) => b.id === f.businessId);
              return (
                <div key={f.id} className="p-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 text-sm">
                      {f.id} — {biz?.legalName} ({biz?.ein})
                    </div>
                    <div className="text-xs text-slate-500">
                      Status: <strong>{f.status}</strong> | Submission ID:{" "}
                      <span className="font-mono">{f.irsSubmissionId}</span> | Net Tax: $
                      {f.netTaxDue.toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => decideFiling(f.id, "ACCEPT")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Accept &amp; Issue Schedule 1
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => decideFiling(f.id, "REJECT")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject ({selectedRejectCode})
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Rejection Dictionary & Audit Log */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h2 className="font-bold text-slate-900">IRS Rejection Resolution Dictionary</h2>
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {Object.values(IRS_REJECTION_CODES).map((item) => (
              <div key={item.code} className="rounded-xl border border-slate-200 p-3 text-xs space-y-1">
                <div className="font-bold text-slate-900">
                  <span className="font-mono text-rose-700">{item.code}</span> — {item.title}
                </div>
                <div className="text-slate-600">{item.irsMessage}</div>
                <div className="text-blue-800">
                  <strong>Resolution:</strong> {item.humanFixGuide}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h2 className="font-bold text-slate-900">Immutable Audit Log ({auditLogs.length})</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div key={log.id} className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs">
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>{log.action}</span>
                  <span className="text-slate-400">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-slate-600 mt-0.5">{log.details}</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Actor: {log.actorName} ({log.actorRole}) • {log.entityType} {log.entityId}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

