"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { usePoc } from "@/components/PocProvider";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";

  const { businesses, loginUser } = usePoc();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [showForgotHint, setShowForgotHint] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
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

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-6 space-y-6">
      <div className="grid lg:grid-cols-12 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
        {/* Left Column: Sign-In Form */}
        <div className="lg:col-span-7 p-6 sm:p-8 space-y-5">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-[11px] font-bold uppercase tracking-wider text-[#1e40af]">
              <ShieldCheck className="w-3.5 h-3.5" /> 2290 tax filings · E-File Portal
            </span>
            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900">
              Sign In to IRS-HVUT
            </h1>
            <p className="text-sm text-slate-600">
              Access your Form 2290 filings, stamped Schedule 1 certificates, and fleet roster.
            </p>
          </div>

          {justRegistered && (
            <div className="rounded-lg border border-indigo-300 bg-indigo-50 px-3.5 py-2.5 text-xs text-slate-900 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-[#1e40af] shrink-0" />
              <span>
                Registration successful! Please sign in below to add your business information and start filing.
              </span>
            </div>
          )}

          <div className="rounded-lg border border-sky-200 bg-sky-50/70 px-3.5 py-2.5 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
            <span>Don&apos;t have an account yet?</span>
            <Link
              href="/register"
              className="inline-flex items-center gap-1 font-bold text-[#1e40af] hover:text-[#0f172a] hover:underline"
            >
              Create Free Account <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {errorMsg && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {showForgotHint && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                Please contact the IRS-HVUT Support Desk or register a new account to reset portal access.
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-sm">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">
                Email Address <span className="text-rose-600">*</span>
              </span>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1e40af] focus:ring-2 focus:ring-indigo-500/20 transition"
                />
              </div>
            </label>

            <label className="block space-y-1.5">
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
                  className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1e40af] focus:ring-2 focus:ring-indigo-500/20 transition"
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

            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="inline-flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="rounded border-slate-300 text-[#1e40af] focus:ring-indigo-500"
                />
                Remember this device
              </label>
              <button
                type="button"
                onClick={() => setShowForgotHint((prev) => !prev)}
                className="font-semibold text-[#1e40af] hover:text-[#0f172a] hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-semibold py-2.5 px-5 rounded-md text-sm shadow-xs cursor-pointer disabled:opacity-60 transition"
              >
                {submitting ? "Signing In..." : "Sign In"}
                {!submitting && <ArrowRight className="w-4 h-4" />}
              </button>
              <Link
                href="/register"
                className="flex-1 inline-flex items-center justify-center border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-5 rounded-md text-sm transition"
              >
                Create Account
              </Link>
            </div>
          </form>
        </div>

        {/* Right Column: Brand & Trust Panel */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#1e40af] text-white p-6 sm:p-8 flex flex-col justify-between gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-300/30 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
                Rev. July 2026 Ready
              </div>
              <h2 className="text-xl sm:text-2xl font-bold leading-snug">
                Fast, IRS-Compliant HVUT Form 2290 E-Filing
              </h2>
              <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed">
                Built for owner-operators, fleet managers, and tax preparers to stay road-legal without delays.
              </p>
            </div>

            <ul className="space-y-3.5 text-xs sm:text-sm">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Stamped IRS Schedule 1 in Minutes</div>
                  <div className="text-xs text-slate-300">
                    Instant PDF generation with IRS MeF watermark for DMV &amp; IRP registration.
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Prepare Free — Pay Only When You File ($7.99+)</div>
                  <div className="text-xs text-slate-300">
                    Validate VINs and prorated Categories A–W taxes before checkout.
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Free VIN Corrections &amp; Instant Amendments</div>
                  <div className="text-xs text-slate-300">
                    Fix typos for $0 service fee or report weight/mileage changes easily.
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Form 2290 &amp; Form 8849 Schedule 6 Support</div>
                  <div className="text-xs text-slate-300">
                    Claim credits or refunds on sold, destroyed, or stolen vehicles in one place.
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <div className="rounded-lg bg-white/10 border border-white/15 p-4 space-y-1.5 text-xs backdrop-blur-xs">
            <div className="font-semibold text-sky-200 uppercase tracking-wider text-[11px]">
              IRS-HVUT Support Desk
            </div>
            <p className="text-slate-200/90 leading-relaxed">
              2290 tax filings · Electronic MeF Verification · Instant Schedule 1 PDF Vault
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading Sign In...</div>}>
      <LoginInner />
    </Suspense>
  );
}
