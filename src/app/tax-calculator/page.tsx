"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Calculator, Home, ArrowRight } from "lucide-react";
import { usePoc } from "@/components/PocProvider";
import {
  TAX_PERIOD_MONTHS,
  WEIGHT_CATEGORIES,
  calculateVehicleTax,
  getFilingDeadline,
} from "@/lib/hvut/tax-engine";
import { WeightCategory } from "@/lib/adapters/types";

export default function TaxCalculatorPage() {
  const { isAuthenticated } = usePoc();
  const [taxYear, setTaxYear] = useState("2026-2027");
  const [firstUsedMonth, setFirstUsedMonth] = useState(7);
  const [category, setCategory] = useState<WeightCategory>("V");
  const [isLogging, setIsLogging] = useState(false);
  const [vehicleCount, setVehicleCount] = useState(1);

  const unitTax = useMemo(
    () => calculateVehicleTax(category, isLogging, firstUsedMonth),
    [category, isLogging, firstUsedMonth],
  );
  const totalTax = useMemo(
    () => Number((unitTax * Math.max(1, vehicleCount)).toFixed(2)),
    [unitTax, vehicleCount],
  );
  const deadline = useMemo(
    () => getFilingDeadline(taxYear, firstUsedMonth),
    [taxYear, firstUsedMonth],
  );

  return (
    <div className="space-y-4">
      <div className="bg-[#eeeeee] border border-[#dcdcdc] rounded-[2px] px-4 py-2 text-xs text-[#555] flex items-center gap-1.5">
        <Link
          href={isAuthenticated ? "/dashboard" : "/"}
          className="text-[#0073b7] hover:underline inline-flex items-center gap-1"
        >
          <Home className="w-3.5 h-3.5" /> {isAuthenticated ? "My Home" : "Home"}
        </Link>
        <span>/</span>
        <span>Tax Calculator</span>
      </div>

      <div className="flex items-center gap-2 text-[#1e40af]">
        <Calculator className="w-6 h-6" />
        <h1 className="text-2xl font-normal">IRS Form 2290 HVUT Tax Calculator</h1>
      </div>

      <div className="bg-white border border-[#cccccc] p-5 shadow-2xs grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4 text-xs">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="font-bold text-[#333]">Tax Year</span>
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
              <span className="font-bold text-[#333]">Month of First Use</span>
              <select
                value={firstUsedMonth}
                onChange={(e) => setFirstUsedMonth(Number(e.target.value))}
                className="w-full border border-[#cccccc] rounded-[2px] px-3 py-2 text-sm bg-white"
              >
                {TAX_PERIOD_MONTHS.map((m) => (
                  <option key={m.month} value={m.month}>
                    {m.name} ({m.remainingMonths} months)
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="font-bold text-[#333]">Taxable Gross Weight Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as WeightCategory)}
                className="w-full border border-[#cccccc] rounded-[2px] px-3 py-2 text-sm bg-white"
              >
                {WEIGHT_CATEGORIES.map((c) => (
                  <option key={c.category} value={c.category}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="font-bold text-[#333]">Number of Vehicles</span>
              <input
                type="number"
                min={1}
                value={vehicleCount}
                onChange={(e) => setVehicleCount(Math.max(1, Number(e.target.value) || 1))}
                className="w-full border border-[#cccccc] rounded-[2px] px-3 py-2 text-sm bg-white"
              />
            </label>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#333] cursor-pointer">
            <input
              type="checkbox"
              checked={isLogging}
              onChange={(e) => setIsLogging(e.target.checked)}
              className="accent-[#1e40af]"
            />
            <span>Logging Vehicle (exclusively used to haul harvested forest products — 25% reduced IRS tax)</span>
          </label>
        </div>

        <div className="lg:col-span-5 border border-[#cccccc] bg-[#f8f9fa]">
          <div className="bg-[#34495e] text-white px-4 py-2.5 text-xs font-bold">
            Estimated Form 2290 Tax Summary
          </div>
          <div className="p-4 space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-[#555]">Tax Per Vehicle</span>
              <span className="font-bold text-[#222]">${unitTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-[#555]">Vehicles Count</span>
              <span className="font-bold text-[#222]">{vehicleCount}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-[#555]">IRS Due Date</span>
              <span className="font-bold text-[#222]">{deadline}</span>
            </div>
            <div className="flex justify-between pt-1 text-base font-bold text-[#1e40af]">
              <span>Estimated IRS Tax Due</span>
              <span>${totalTax.toFixed(2)}</span>
            </div>

            <div className="pt-3">
              <Link
                href={isAuthenticated ? "/file/new" : "/login"}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-semibold py-2.5 px-4 rounded-md text-xs"
              >
                Start Form 2290 E-Filing Now <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

