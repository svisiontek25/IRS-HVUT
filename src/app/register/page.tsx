"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import { usePoc } from "@/components/PocProvider";

export default function RegisterPage() {
  const router = useRouter();
  const { logoutUser, refresh } = usePoc();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [legalNotice, setLegalNotice] = useState<string | null>(null);

  const hasMinLength = password.length >= 6;
  const passwordsEntered = password.length > 0 || confirmPassword.length > 0;
  const passwordsMatch = password.length >= 6 && password === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Registration failed.");
        return;
      }
      logoutUser();
      await refresh();
      router.push("/login?registered=1");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-6">
      <div className="grid lg:grid-cols-12 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
        {/* Left Column: Registration Form */}
        <div className="lg:col-span-7 p-6 sm:p-8 space-y-5">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-[11px] font-bold uppercase tracking-wider text-[#1e40af]">
              <ShieldCheck className="w-3.5 h-3.5" /> Free Account Registration
            </span>
            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900">
              Create Your IRS-HVUT Account
            </h1>
            <p className="text-sm text-slate-600">
              Get started in under 60 seconds — prepare your 2290 tax filings free and pay only when transmitting.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700 space-y-1.5 leading-relaxed">
            <p>
              By submitting this form, you agree to our{" "}
              <button
                type="button"
                onClick={() =>
                  setLegalNotice(
                    "Terms of Service: IRS-HVUT (2290 tax filings) Simulator is a local E-file IRS Form 2290 workflow emulator."
                  )
                }
                className="text-[#1e40af] font-semibold hover:underline cursor-pointer"
              >
                Terms of Service
              </button>{" "}
              and{" "}
              <button
                type="button"
                onClick={() =>
                  setLegalNotice(
                    "Privacy Policy: All EIN, VIN, and Form 2290 records stay strictly inside your local SQLite database."
                  )
                }
                className="text-[#1e40af] font-semibold hover:underline cursor-pointer"
              >
                Privacy Policy
              </button>
              .
            </p>
            <p>
              Already have an account?{" "}
              <Link href="/login" className="text-[#1e40af] font-bold hover:underline">
                Sign In Here -&gt;
              </Link>
            </p>
          </div>

          {legalNotice && (
            <div className="rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs text-sky-900">
              {legalNotice}
            </div>
          )}

          {errorMsg && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            {/* Row 1: First & Last Name */}
            <div className="grid sm:grid-cols-2 gap-3.5">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">
                  First Name <span className="text-rose-600">*</span>
                </span>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    required
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1e40af] focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                </div>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">
                  Last Name <span className="text-rose-600">*</span>
                </span>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    required
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1e40af] focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                </div>
              </label>
            </div>

            {/* Row 2: Email & Phone */}
            <div className="grid sm:grid-cols-2 gap-3.5">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">
                  Email Address <span className="text-rose-600">*</span>
                </span>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="dispatch@fleet.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1e40af] focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                </div>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">
                  Phone Number <span className="text-rose-600">*</span>
                </span>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    required
                    minLength={7}
                    placeholder="(555) 234-5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1e40af] focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                </div>
              </label>
            </div>

            {/* Row 3: Password & Confirm Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Account Security</span>
                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#1e40af] hover:underline cursor-pointer"
                >
                  {showPasswords ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" /> Hide passwords
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" /> Show passwords
                    </>
                  )}
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3.5">
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-slate-700">
                    Password <span className="text-rose-600">*</span>
                  </span>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPasswords ? "text" : "password"}
                      required
                      minLength={6}
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1e40af] focus:ring-2 focus:ring-indigo-500/20 transition"
                    />
                  </div>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-slate-700">
                    Confirm Password <span className="text-rose-600">*</span>
                  </span>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPasswords ? "text" : "password"}
                      required
                      minLength={6}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1e40af] focus:ring-2 focus:ring-indigo-500/20 transition"
                    />
                  </div>
                </label>
              </div>

              {/* Live Validation Indicators */}
              {passwordsEntered && (
                <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                  <span
                    className={`inline-flex items-center gap-1 font-medium ${
                      hasMinLength ? "text-[#1e40af]" : "text-slate-500"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> 6+ characters
                  </span>
                  {confirmPassword.length > 0 && (
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        passwordsMatch ? "text-[#1e40af]" : "text-rose-600"
                      }`}
                    >
                      {passwordsMatch ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5" /> Passwords do not match
                        </>
                      )}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-semibold py-2.5 px-5 rounded-md text-sm shadow-xs cursor-pointer disabled:opacity-60 transition"
              >
                {submitting ? "Creating Account..." : "Create Account & Continue"}
                {!submitting && <ArrowRight className="w-4 h-4" />}
              </button>
              <Link
                href="/login"
                className="sm:w-36 inline-flex items-center justify-center border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-5 rounded-md text-sm transition"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Right Column: Onboarding Roadmap & Security Panel */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#1e40af] text-white p-6 sm:p-8 flex flex-col justify-between gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-300/30 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
                3-Step Onboarding
              </div>
              <h2 className="text-xl sm:text-2xl font-bold leading-snug">
                Start Filing Form 2290 in 3 Simple Steps
              </h2>
              <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed">
                No credit card required to set up your account or prepare your vehicle return.
              </p>
            </div>

            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-amber-400 text-[#0f172a] font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <div className="font-semibold text-sm text-white">Register &amp; Sign In</div>
                  <div className="text-xs text-slate-300">
                    Create your secure login and sign in to begin first-time setup.
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-white/15 border border-white/25 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <div className="font-semibold text-sm text-white">Add Business &amp; EIN Details</div>
                  <div className="text-xs text-slate-300">
                    Save your trucking entity with Name Control &amp; Signing Authority.
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-white/15 border border-white/25 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <div className="font-semibold text-sm text-white">E-File Form 2290 &amp; Open Dashboard</div>
                  <div className="text-xs text-slate-300">
                    Upload vehicles individually or via CSV and download watermarked Schedule 1.
                  </div>
                </div>
              </li>
            </ol>
          </div>

          <div className="rounded-lg bg-white/10 border border-white/15 p-4 space-y-2 text-xs backdrop-blur-xs">
            <div className="font-semibold text-sky-200 uppercase tracking-wider text-[11px]">
              IRS-HVUT · 2290 tax filings
            </div>
            <p className="text-slate-200/90 leading-relaxed">
              IRS MeF Rev. July 2026 ruleset · No upfront card required · Secure local database storage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
