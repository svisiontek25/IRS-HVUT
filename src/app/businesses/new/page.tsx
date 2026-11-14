"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, HelpCircle, Home, UserPlus } from "lucide-react";
import { usePoc } from "@/components/PocProvider";
import { BusinessType } from "@/lib/adapters/types";
import { deriveNameControl } from "@/lib/hvut/tax-engine";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY",
  "LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND",
  "OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

function AddBusinessInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editBusinessId = searchParams.get("editBusinessId");
  const isOnboarding = searchParams.get("onboarding") === "1";

  const { users, businesses, activeUserId, setActiveBusinessId, refresh } = usePoc();
  const activeUser = users.find((u) => u.id === activeUserId);

  const [legalName, setLegalName] = useState("");
  const [nameControl, setNameControl] = useState("");
  const [ein, setEin] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("LLC");
  const [addressLine1, setAddressLine1] = useState("");
  const [roomSuite, setRoomSuite] = useState("");
  const [country, setCountry] = useState("US");
  const [state, setState] = useState("TX");
  const [city, setCity] = useState("");
  const [otherCity, setOtherCity] = useState(false);
  const [zip, setZip] = useState("");
  const [cellNumber, setCellNumber] = useState("");

  // Point of Contact
  const [pocName, setPocName] = useState("");
  const [pocEmail, setPocEmail] = useState("");
  const [pocPhone, setPocPhone] = useState("");

  // Signing Authority
  const [signingAuthorityName, setSigningAuthorityName] = useState("");
  const [signingAuthorityTitle, setSigningAuthorityTitle] = useState("Owner/President");
  const [signingAuthorityEmail, setSigningAuthorityEmail] = useState("");
  const [signingAuthorityPhone, setSigningAuthorityPhone] = useState("");

  // Third Party Designee
  const [showDesignee, setShowDesignee] = useState(false);
  const [designeeName, setDesigneeName] = useState("");
  const [designeePhone, setDesigneePhone] = useState("");
  const [designeePin, setDesigneePin] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (editBusinessId) {
      const found = businesses.find((b) => b.id === editBusinessId);
      if (found) {
        setLegalName(found.legalName);
        setNameControl(found.nameControl);
        setEin(found.ein);
        setBusinessType(found.businessType || "LLC");
        setAddressLine1(found.addressLine1);
        setRoomSuite(found.roomSuite || "");
        setCountry(found.country || "US");
        setState(found.state);
        setCity(found.city);
        setOtherCity(Boolean(found.otherCity));
        setZip(found.zip);
        setCellNumber(found.cellNumber || "");
        setPocName(found.pocName || found.signingAuthorityName);
        setPocEmail(found.pocEmail || "");
        setPocPhone(found.pocPhone || found.phone);
        setSigningAuthorityName(found.signingAuthorityName);
        setSigningAuthorityTitle(found.signingAuthorityTitle);
        setSigningAuthorityEmail(found.signingAuthorityEmail || "");
        setSigningAuthorityPhone(found.phone);
        if (found.thirdPartyDesignee?.name) {
          setShowDesignee(true);
          setDesigneeName(found.thirdPartyDesignee.name);
          setDesigneePhone(found.thirdPartyDesignee.phone);
          setDesigneePin(found.thirdPartyDesignee.pin);
        }
        return;
      }
    }
    if (activeUser && !pocName) {
      setPocName(activeUser.firstName ? `${activeUser.firstName} ${activeUser.lastName}` : activeUser.name);
      setPocEmail(activeUser.email);
      setPocPhone(activeUser.phone || "");
    }
  }, [editBusinessId, businesses, activeUser, pocName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editBusinessId || undefined,
          ownerUserId: activeUserId,
          ein,
          legalName,
          nameControl: nameControl || deriveNameControl(legalName),
          businessType,
          addressLine1,
          roomSuite: roomSuite || undefined,
          country,
          state,
          city,
          otherCity,
          zip,
          cellNumber: cellNumber || undefined,
          pocName,
          pocEmail,
          pocPhone,
          signingAuthorityName,
          signingAuthorityTitle,
          signingAuthorityEmail,
          phone: signingAuthorityPhone || pocPhone,
          thirdPartyDesignee: showDesignee && designeeName.trim()
            ? { name: designeeName, phone: designeePhone, pin: designeePin }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to save business.");
        return;
      }
      await refresh();
      setActiveBusinessId(data.business.id);
      router.push(editBusinessId ? "/dashboard" : "/file/new");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-3.5">
      {/* Breadcrumb */}
      <div className="bg-[#dcdcdc] border border-[#cccccc] rounded-[2px] px-4 py-2 text-xs flex items-center gap-1.5 text-[#555]">
        <Link href="/dashboard" className="text-[#0073b7] hover:underline inline-flex items-center gap-1 font-medium">
          <Home className="w-3.5 h-3.5" /> My Home
        </Link>
        <span>/</span>
        <span>{editBusinessId ? "Edit Business" : "Add Business"}</span>
      </div>

      <h1 className="text-[26px] font-normal text-[#1e40af]">
        {editBusinessId ? "Edit Business" : "Add Business Info"}
      </h1>

      {!editBusinessId && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 px-4 py-2.5 text-xs text-slate-800 flex flex-wrap items-center gap-2">
          <span className="font-bold text-[#1e40af]">
            {isOnboarding ? "First-Time Setup Flow:" : "Filing Flow:"}
          </span>
          <span className="px-2 py-0.5 rounded bg-[#1e40af] text-white font-semibold">
            1. Add Business Info
          </span>
          <span className="text-slate-400">-&gt;</span>
          <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-medium">
            2. Get Started (File Tax Return)
          </span>
          <span className="text-slate-400">-&gt;</span>
          <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-medium">
            3. Dashboard
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-[2px] bg-rose-50 border border-rose-300 px-4 py-3 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          {errorMsg}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-[#eeeeee] border border-[#bbbbbb] rounded-[2px] shadow-2xs p-5 space-y-5"
      >
        <div className="grid lg:grid-cols-12 gap-5">
          {/* Left Column: Business Info */}
          <div className="lg:col-span-6 space-y-2">
            <h2 className="text-sm font-normal text-[#222]">Business Info</h2>
            <div className="border border-[#cccccc] p-4 rounded-[2px] space-y-3 bg-[#eeeeee] shadow-2xs text-xs">
              <div className="grid grid-cols-12 gap-3">
                <label className="col-span-8 space-y-1">
                  <span className="font-semibold text-slate-700 inline-flex items-center gap-1">
                    Business Name <span className="text-rose-600">*</span>
                    <span title="Must match the legal name on IRS CP-575 / EIN letter">
                      <HelpCircle className="w-3.5 h-3.5 text-[#1e40af]" />
                    </span>
                  </span>
                  <input
                    required
                    placeholder="Business Name"
                    value={legalName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLegalName(val);
                      setNameControl(deriveNameControl(val));
                    }}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm"
                  />
                </label>

                <label className="col-span-4 space-y-1">
                  <span className="font-semibold text-slate-700 inline-flex items-center gap-1">
                    Name Control
                    <span title="First 4 alphanumeric characters of legal name (enter BAD1 to test IRS reject)">
                      <HelpCircle className="w-3.5 h-3.5 text-[#1e40af]" />
                    </span>
                  </span>
                  <input
                    maxLength={4}
                    placeholder="Name Control"
                    value={nameControl}
                    onChange={(e) => setNameControl(e.target.value.toUpperCase())}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm uppercase font-mono"
                  />
                </label>
              </div>

              <div className="grid grid-cols-12 gap-3">
                <label className="col-span-6 space-y-1">
                  <span className="font-semibold text-slate-700">
                    EIN <span className="text-rose-600">*</span>{" "}
                    <span className="text-[10px] text-rose-700 font-normal">
                      (Don&apos;t use SSN, IRS might reject)
                    </span>
                  </span>
                  <input
                    required
                    placeholder="XX-XXXXXXX"
                    value={ein}
                    onChange={(e) => setEin(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm font-mono"
                  />
                </label>

                <label className="col-span-6 space-y-1">
                  <span className="font-semibold text-slate-700">
                    Business Type <span className="text-rose-600">*</span>
                  </span>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm"
                  >
                    <option value="LLC">Limited Liability Company (LLC)</option>
                    <option value="CORPORATION">Corporation</option>
                    <option value="PARTNERSHIP">Partnership</option>
                    <option value="SOLE_PROPRIETOR">Sole Proprietorship</option>
                    <option value="NON_PROFIT">Non-Profit / Exempt</option>
                    <option value="OTHER">Other</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-12 gap-3">
                <label className="col-span-8 space-y-1">
                  <span className="font-semibold text-slate-700">
                    Address Line1 <span className="text-rose-600">*</span>
                  </span>
                  <input
                    required
                    placeholder="Address"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm"
                  />
                </label>
                <label className="col-span-4 space-y-1">
                  <span className="font-semibold text-slate-700">Room / Suite No.</span>
                  <input
                    placeholder="Optional"
                    value={roomSuite}
                    onChange={(e) => setRoomSuite(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="grid grid-cols-12 gap-3">
                <label className="col-span-6 space-y-1">
                  <span className="font-semibold text-slate-700">
                    Country <span className="text-rose-600">*</span>
                  </span>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm"
                  >
                    <option value="US">US</option>
                    <option value="CA">Canada</option>
                    <option value="MX">Mexico</option>
                  </select>
                </label>

                <label className="col-span-6 space-y-1">
                  <span className="font-semibold text-slate-700">
                    State <span className="text-rose-600">*</span>
                  </span>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm"
                  >
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-8 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">
                      City <span className="text-rose-600">*</span>
                    </span>
                    <label className="inline-flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={otherCity}
                        onChange={(e) => setOtherCity(e.target.checked)}
                      />
                      Other City
                    </label>
                  </div>
                  <input
                    required
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm"
                  />
                </div>

                <label className="col-span-4 space-y-1">
                  <span className="font-semibold text-slate-700">
                    Zip <span className="text-rose-600">*</span>
                  </span>
                  <input
                    required
                    placeholder="Zip"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm"
                  />
                </label>
              </div>

              <label className="block w-1/2 space-y-1">
                <span className="font-semibold text-slate-700">Cell Number</span>
                <input
                  placeholder="Cell Number"
                  value={cellNumber}
                  onChange={(e) => setCellNumber(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm"
                />
              </label>
            </div>
          </div>

          {/* Right Column: Point of Contact & Signing Authority */}
          <div className="lg:col-span-6 space-y-5">
            {/* Point of Contact */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-800 inline-flex items-center gap-1">
                Point of Contact
                <HelpCircle className="w-3.5 h-3.5 text-[#1e40af]" />
              </h2>
              <div className="border border-slate-300 p-4 rounded-sm space-y-3 bg-slate-50/40 text-xs">
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-700">Name</span>
                  <input
                    placeholder="Point of Contact Name"
                    value={pocName}
                    onChange={(e) => setPocName(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm"
                  />
                </label>
                <div className="grid grid-cols-12 gap-3">
                  <label className="col-span-7 space-y-1">
                    <span className="font-semibold text-slate-700">E-Mail ID</span>
                    <input
                      type="email"
                      placeholder="Email"
                      value={pocEmail}
                      onChange={(e) => setPocEmail(e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm"
                    />
                  </label>
                  <label className="col-span-5 space-y-1">
                    <span className="font-semibold text-slate-700">
                      Phone <span className="text-rose-600">*</span>
                    </span>
                    <input
                      required
                      placeholder="Phone Number"
                      value={pocPhone}
                      onChange={(e) => setPocPhone(e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Signing Authority */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-800 inline-flex items-center gap-1">
                Signing Authority
                <HelpCircle className="w-3.5 h-3.5 text-[#1e40af]" />
              </h2>
              <div className="border border-slate-300 p-4 rounded-sm space-y-3 bg-slate-50/40 text-xs">
                <div className="grid grid-cols-12 gap-3">
                  <label className="col-span-7 space-y-1">
                    <span className="font-semibold text-slate-700">
                      Name <span className="text-rose-600">*</span>
                    </span>
                    <input
                      required
                      placeholder="Signing Authority Name"
                      value={signingAuthorityName}
                      onChange={(e) => setSigningAuthorityName(e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm"
                    />
                  </label>
                  <label className="col-span-5 space-y-1">
                    <span className="font-semibold text-slate-700">
                      Title <span className="text-rose-600">*</span>
                    </span>
                    <input
                      required
                      placeholder="Owner/President"
                      value={signingAuthorityTitle}
                      onChange={(e) => setSigningAuthorityTitle(e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  <label className="col-span-7 space-y-1">
                    <span className="font-semibold text-slate-700">
                      E-Mail ID <span className="text-rose-600">*</span>
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="E Mail"
                      value={signingAuthorityEmail}
                      onChange={(e) => setSigningAuthorityEmail(e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm"
                    />
                  </label>
                  <label className="col-span-5 space-y-1">
                    <span className="font-semibold text-slate-700">
                      Phone <span className="text-rose-600">*</span>
                    </span>
                    <input
                      required
                      placeholder="Phone Number"
                      value={signingAuthorityPhone}
                      onChange={(e) => setSigningAuthorityPhone(e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Third Party Designee + Save & Continue */}
        <div className="pt-2 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-normal text-[#222]">
              <span>Third Party Designee</span>
              <HelpCircle className="w-3.5 h-3.5 text-[#1e40af]" />
              <button
                type="button"
                onClick={() => setShowDesignee((v) => !v)}
                className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] border border-[#cccccc] bg-[#f8f8f8] hover:bg-white text-xs font-medium text-[#333] cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#1e40af]" />
                {showDesignee ? "Hide Designee" : "Add New"}
              </button>
            </div>
          </div>

          {showDesignee && (
            <div className="grid sm:grid-cols-3 gap-3 border border-[#cccccc] rounded-[2px] p-3 bg-white text-xs">
              <label className="space-y-1">
                <span className="font-semibold text-slate-700">Designee&apos;s Name</span>
                <input
                  placeholder="Designee Name"
                  value={designeeName}
                  onChange={(e) => setDesigneeName(e.target.value)}
                  className="w-full rounded-[2px] border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="font-semibold text-slate-700">Phone No.</span>
                <input
                  placeholder="Phone Number"
                  value={designeePhone}
                  onChange={(e) => setDesigneePhone(e.target.value)}
                  className="w-full rounded-[2px] border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="font-semibold text-slate-700">5-Digit PIN</span>
                <input
                  maxLength={5}
                  placeholder="12345"
                  value={designeePin}
                  onChange={(e) => setDesigneePin(e.target.value)}
                  className="w-full rounded-[2px] border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-mono"
                />
              </label>
            </div>
          )}

          <div className="bg-[#dcdcdc] border-t border-[#bbbbbb] px-5 py-3 -mx-5 -mb-5 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-[2px] bg-[#004d80] hover:bg-[#003b63] text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save & Continue"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function AddBusinessPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading Business Form...</div>}>
      <AddBusinessInner />
    </Suspense>
  );
}

