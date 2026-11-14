"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Lock,
  LogOut,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { usePoc } from "@/components/PocProvider";

export default function HomePage() {
  const router = useRouter();
  const { users, businesses, isAuthenticated, activeUserId, loginUser, logoutUser } = usePoc();
  const activeUser = isAuthenticated ? users.find((u) => u.id === activeUserId) : undefined;
  const userBusinesses = activeUser
    ? activeUser.role === "ADMIN" || activeUser.role === "CPA"
      ? businesses
      : businesses.filter((b) => b.ownerUserId === activeUser.id)
    : [];
  const hasBusiness = userBusinesses.length > 0;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleQuickLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Invalid email or password.");
        return;
      }
      loginUser(data.user.id);
      if (data.user.role === "ADMIN") {
        router.push("/admin");
        return;
      }
      const ownedBiz = businesses.some((b) => b.ownerUserId === data.user.id);
      router.push(ownedBiz ? "/dashboard" : "/businesses/new?onboarding=1");
    } finally {
      setSubmitting(false);
    }
  }

  function resolveProtectedHref(target: string): string {
    if (!isAuthenticated) return "/login";
    if (activeUser?.role !== "ADMIN" && !hasBusiness) {
      return "/businesses/new?onboarding=1";
    }
    return target;
  }

  return (
    <div className="space-y-6">
      {/* Federal Slate-Navy & Royal Indigo Hero Banner */}
      <section className="rounded-xl bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#1e40af] text-white p-6 sm:p-8 shadow-sm flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-2.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-400/15 border border-indigo-300/30 text-[11px] font-bold uppercase tracking-wider text-sky-300">
            IRS-HVUT · 2290 tax filings (Rev. July 2026)
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            File IRS Form 2290 Online &amp; Get Stamped Schedule 1 in Minutes
          </h1>
          <p className="text-sm text-slate-200 leading-relaxed">
            Prepare free and pay only when you transmit — starting at{" "}
            <strong className="text-amber-300">$7.99</strong> per return. Supports Original Form 2290, Weight &amp;
            Mileage Amendments, Free VIN Corrections, and Form 8849 Schedule 6 Credits.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {!isAuthenticated ? (
            <>
              <Link
                href="/register"
                className="px-5 py-2.5 rounded-md bg-amber-400 hover:bg-amber-300 text-[#0f172a] text-sm font-bold shadow-xs transition"
              >
                Register Free Account
              </Link>
              <Link
                href="/login"
                className="px-5 py-2.5 rounded-md bg-white/10 hover:bg-white/20 border border-white/25 text-white text-sm font-semibold inline-flex items-center gap-1.5 transition"
              >
                Sign In to File <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          ) : (
            <Link
              href={resolveProtectedHref("/file/new")}
              className="px-5 py-2.5 rounded-md bg-amber-400 hover:bg-amber-300 text-[#0f172a] text-sm font-bold inline-flex items-center gap-1.5 shadow-xs transition"
            >
              {hasBusiness ? "File a Return" : "Add Business Info"} <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </section>

      {/* Main Split: Sign In Box + Workflows Overview */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left: Crisp Sign In / Active Account Card */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="text-xl font-bold text-slate-900">
            {isAuthenticated && activeUser ? `Signed In as ${activeUser.name}` : "Sign In to IRS-HVUT"}
          </h2>

          {isAuthenticated && activeUser ? (
            <div className="space-y-3.5 text-xs">
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 p-3 text-slate-800">
                Your Account: <strong>{activeUser.email}</strong>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {hasBusiness ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-semibold py-2.5 px-4 rounded-md text-center shadow-xs transition"
                    >
                      Open Dashboard
                    </Link>
                    <Link
                      href="/file/new"
                      className="bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold py-2.5 px-4 rounded-md text-center shadow-xs transition"
                    >
                      File Return
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/businesses/new?onboarding=1"
                    className="col-span-2 bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-semibold py-2.5 px-4 rounded-md text-center shadow-xs transition"
                  >
                    Step 1: Add Business Info -&gt;
                  </Link>
                )}
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <Link href="/businesses/new" className="text-[#1e40af] hover:underline font-semibold">
                  + Add Business
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logoutUser();
                    router.push("/login");
                  }}
                  className="inline-flex items-center gap-1 text-rose-700 hover:underline font-semibold cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleQuickLogin} className="space-y-3.5 text-sm">
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-3 text-xs text-slate-700">
                New here?{" "}
                <Link href="/register" className="text-[#1e40af] font-bold hover:underline">
                  Register Here
                </Link>{" "}
                or sign in below to start filing.
              </div>
              {errorMsg && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                </div>
              )}
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-700">
                  Email <span className="text-rose-600">*</span>
                </span>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#1e40af] focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-700">
                  Password <span className="text-rose-600">*</span>
                </span>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-10 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#1e40af] focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-semibold py-2.5 rounded-md text-sm shadow-xs cursor-pointer transition"
              >
                {submitting ? "Signing In..." : "Sign In"}
                {!submitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}
        </div>

        {/* Right: 4 Core IRS-HVUT Workflows (Gated until Signed In) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-200 pb-2.5 flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">What Would You Like to File Today?</h2>
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                isAuthenticated
                  ? "text-[#1e40af] bg-indigo-50 border-indigo-200"
                  : "text-amber-800 bg-amber-50 border-amber-200"
              }`}
            >
              {isAuthenticated ? "Ready to File" : "Sign In Required"}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3.5 text-xs">
            <Link
              href={resolveProtectedHref("/file/new?formType=2290_ORIG")}
              className="border border-slate-200 hover:border-[#1e40af] hover:bg-indigo-50/40 p-4 rounded-lg space-y-2 transition group"
            >
              <div className="font-bold text-sm text-slate-900 group-hover:text-[#1e40af] flex items-center gap-2">
                <span className="w-8 h-8 rounded-md bg-indigo-50 text-[#1e40af] flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </span>
                Form 2290 Tax Return
              </div>
              <p className="text-slate-600 leading-relaxed">
                Report Taxable, Suspended, and Credit vehicles &amp; download IRS watermarked Schedule 1.
              </p>
            </Link>

            <Link
              href={resolveProtectedHref("/file/new?formType=2290_AMEND")}
              className="border border-slate-200 hover:border-[#0284c7] hover:bg-sky-50/40 p-4 rounded-lg space-y-2 transition group"
            >
              <div className="font-bold text-sm text-slate-900 group-hover:text-[#0284c7] flex items-center gap-2">
                <span className="w-8 h-8 rounded-md bg-sky-50 text-[#0284c7] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
                Form 2290 Amendment
              </div>
              <p className="text-slate-600 leading-relaxed">
                Increase Taxable Gross Weight or report Suspended vehicles exceeding 5,000 miles.
              </p>
            </Link>

            <Link
              href={resolveProtectedHref("/file/new?formType=2290_VIN_CORR")}
              className="border border-slate-200 hover:border-[#1e40af] hover:bg-indigo-50/40 p-4 rounded-lg space-y-2 transition group"
            >
              <div className="font-bold text-sm text-slate-900 group-hover:text-[#1e40af] flex items-center gap-2">
                <span className="w-8 h-8 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                Free VIN Correction
              </div>
              <p className="text-slate-600 leading-relaxed">
                Correct a typo in an accepted VIN ($0 service fee for native filings).
              </p>
            </Link>

            <Link
              href="/tax-calculator"
              className="border border-slate-200 hover:border-[#0284c7] hover:bg-sky-50/40 p-4 rounded-lg space-y-2 transition group"
            >
              <div className="font-bold text-sm text-slate-900 group-hover:text-[#0284c7] flex items-center gap-2">
                <span className="w-8 h-8 rounded-md bg-slate-100 text-[#0f172a] flex items-center justify-center shrink-0">
                  <Calculator className="w-4 h-4" />
                </span>
                2290 Tax Calculator
              </div>
              <p className="text-slate-600 leading-relaxed">
                Calculate prorated HVUT tax across Categories A–W and check your IRS deadline.
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
