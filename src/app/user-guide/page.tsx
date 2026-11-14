"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Home,
} from "lucide-react";

interface GuideSlide {
  pill: string;
  title: string;
  image: string;
  caption: string;
}

interface GuideCategory {
  id: string;
  label: string;
  targetHref: string;
  slides: GuideSlide[];
}

const GUIDE_CATEGORIES: GuideCategory[] = [
  {
    id: "2290-efile",
    label: "2290 e-file",
    targetHref: "/file/new?formType=2290_ORIG",
    slides: [
      {
        pill: "Register & Login",
        title: "Register Here — Account Creation",
        image: "/guide/ref-register.jpeg",
        caption: "Create your IRS-HVUT account with First Name, Last Name, Email, Phone Number, and Password.",
      },
      {
        pill: "Add Business",
        title: "Add Business Information, Point of Contact & Signing Authority",
        image: "/guide/ref-business-info.jpeg",
        caption: "Enter your Legal Business Name, Name Control, 9-digit EIN, Business Type, and Signing Authority.",
      },
      {
        pill: "Get Started",
        title: "Step 1 — Get Started",
        image: "/guide/td-get-started.png",
        caption: "Select your Business, Tax Return Type (Form 2290 Tax), Tax Year, and Month of First Use.",
      },
      {
        pill: "Tax Options",
        title: "Step 2 — Reporting Vehicles",
        image: "/guide/td-reporting-vehicles.png",
        caption: "Choose the vehicle categories included in this return (Taxable, Suspended, Credits, Prior Year).",
      },
      {
        pill: "Vehicle Info",
        title: "Step 3 — Vehicle Information Sections",
        image: "/guide/td-vehicle-information-1.png",
        caption: "Add vehicles one-by-one, import from your fleet roster, or bulk upload via spreadsheet.",
      },
      {
        pill: "Add Vehicle",
        title: "Step 3b — Add Taxable Vehicle Modal",
        image: "/guide/td-vehicle-information-2.png",
        caption: "Enter Unit Number, 17-character VIN, Logging status, and Taxable Gross Weight category.",
      },
      {
        pill: "Vehicle List",
        title: "Step 3c — Vehicle Table & Tax Calculation",
        image: "/guide/td-vehicle-information-3.png",
        caption: "Review per-vehicle prorated tax calculations, total Tax Due, and Credits before clicking Next.",
      },
      {
        pill: "IRS Options",
        title: "Step 4 — IRS Filing & Payment Options",
        image: "/guide/td-irs-upload.png",
        caption: "Select E-file method and IRS tax payment method (EFW, EFTPS, Card, or Check / 2290-V).",
      },
      {
        pill: "Pricing",
        title: "Step 5 — Pricing & Purchase Summary",
        image: "/guide/td-pricing-purchase-summary.png",
        caption: "Select single-return or unlimited seasonal pricing plus optional Fax ($1) and SMS ($1) alerts.",
      },
      {
        pill: "Checkout",
        title: "Step 6 — Payment Information",
        image: "/guide/td-payment-information.png",
        caption: "Complete service-fee checkout using Visa, MasterCard, Amex, or Discover (test 4242... approves).",
      },
      {
        pill: "Form Summary",
        title: "Step 7 — Form Summary & PDF Preview",
        image: "/guide/td-form-summary.png",
        caption: "Audit your filled Form 2290 PDF before final submission and click Submit Return To IRS.",
      },
      {
        pill: "Finish (PIN)",
        title: "Step 8a — Electronic Transaction PIN",
        image: "/guide/td-finish.png",
        caption: "Enter your 5-digit Transaction PIN to electronically sign and transmit the return to IRS MeF.",
      },
      {
        pill: "Transmitted",
        title: "Step 8b — Accepted & Schedule 1 Ready",
        image: "/guide/td-transmitted.png",
        caption: "Track real-time submission status and download your IRS Watermarked Schedule 1 PDF.",
      },
      {
        pill: "Schedule 1",
        title: "IRS Stamped Schedule 1 Proof of Payment",
        image: "/guide/ref-schedule1-example.png",
        caption: "Stamped Schedule 1 includes the IRS e-file watermark and Received date required by State DMV/IRP.",
      },
      {
        pill: "Dashboard",
        title: "Dashboard & Return Summary Vault",
        image: "/guide/td-dashboard.png",
        caption: "Download Form 2290 PDFs, Watermarked Schedule 1 copies, or start amendments from Dashboard.",
      },
    ],
  },
  {
    id: "exceed-mileage",
    label: "Exceed Mileage",
    targetHref: "/file/new?formType=2290_AMEND&amendReason=MILEAGE_EXCEEDED",
    slides: [
      {
        pill: "Exceed Mileage",
        title: "Form 2290 Amendment — Suspended Vehicle Exceeded Mileage Limit",
        image: "/guide/exceed-amendment.png",
        caption: "Select 'Suspended Vehicle Exceedes Mileage Use Limit' and specify the month the threshold was crossed.",
      },
    ],
  },
  {
    id: "gross-weight",
    label: "Increase Gross Weight",
    targetHref: "/file/new?formType=2290_AMEND&amendReason=WEIGHT_INCREASE",
    slides: [
      {
        pill: "Gross Weight",
        title: "Form 2290 Amendment — Increase in Taxable Gross Weight",
        image: "/guide/grossweight-veh2.png",
        caption: "Report both Prior Weight Category and New Weight Category to pay only the incremental tax difference.",
      },
    ],
  },
  {
    id: "vin-correction",
    label: "VIN Correction",
    targetHref: "/file/new?formType=2290_VIN_CORR",
    slides: [
      {
        pill: "VIN Correction",
        title: "Free Form 2290 VIN Correction",
        image: "/guide/vin-add.png",
        caption: "Enter Previous VIN, Correct VIN, Weight Category, and explanation to regenerate Schedule 1.",
      },
    ],
  },
  {
    id: "sold-credits",
    label: "2290 Sold Credits",
    targetHref: "/file/new?formType=8849_SCH6",
    slides: [
      {
        pill: "Sold / Destroyed Credits",
        title: "Claim HVUT Credit on Sold, Destroyed, or Stolen Vehicles",
        image: "/guide/soldcredits-claim2.png",
        caption: "Enter VIN, weight, disposition date, and prior tax paid to offset current tax or claim Form 8849 refund.",
      },
    ],
  },
  {
    id: "bulk-upload",
    label: "Bulk Upload / Import Vehicles",
    targetHref: "/file/new?formType=2290_ORIG",
    slides: [
      {
        pill: "Bulk CSV Upload",
        title: "Bulk Upload Fleet Vehicles via CSV Spreadsheet",
        image: "/guide/bulkupload-file.png",
        caption: "Download the IRS-HVUT CSV template, upload your fleet file, and review row-by-row VIN validation.",
      },
    ],
  },
];

export default function UserGuidePage() {
  const [catId, setCatId] = useState(GUIDE_CATEGORIES[0].id);
  const [slideIdx, setSlideIdx] = useState(0);

  const activeCategory = GUIDE_CATEGORIES.find((c) => c.id === catId) || GUIDE_CATEGORIES[0];
  const slide = activeCategory.slides[Math.min(slideIdx, activeCategory.slides.length - 1)];
  const total = activeCategory.slides.length;

  function chooseCategory(id: string) {
    setCatId(id);
    setSlideIdx(0);
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#eeeeee] border border-[#dcdcdc] rounded-[2px] px-4 py-2 text-xs text-[#555] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Link href="/dashboard" className="text-[#0073b7] hover:underline inline-flex items-center gap-1 font-medium">
            <Home className="w-3.5 h-3.5" /> My Home
          </Link>
          <span>/</span>
          <span>2290 User Guide</span>
        </div>
        <Link href={activeCategory.targetHref} className="text-[#1e40af] font-bold hover:underline">
          Try {activeCategory.label} Now -&gt;
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[#1e40af]">
          <BookOpen className="w-6 h-6" />
          <h1 className="text-[24px] font-normal">IRS-HVUT 2290 Visual User Guide</h1>
        </div>
        <Link
          href={activeCategory.targetHref}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[2px] bg-[#1e40af] hover:bg-[#1e3a8a] text-white text-xs font-bold"
        >
          Launch {activeCategory.label} in E-File Wizard <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* IRS-HVUT 2290 User Guide Category Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-[#cccccc] pb-2">
        {GUIDE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => chooseCategory(c.id)}
            className={`px-3.5 py-2 text-xs font-bold rounded-[2px] cursor-pointer transition ${
              c.id === activeCategory.id
                ? "bg-[#1e40af] text-white"
                : "bg-[#f2f2f2] border border-[#cccccc] text-[#333] hover:bg-slate-200"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Carousel Box */}
      <div className="bg-white border border-[#cccccc] rounded-[2px] p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#1e40af]">{slide.title}</h2>
            <p className="text-xs text-[#444] mt-0.5">{slide.caption}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              disabled={slideIdx === 0}
              onClick={() => setSlideIdx(0)}
              className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#cccccc] bg-[#f8f8f8] hover:bg-white disabled:opacity-40 cursor-pointer"
            >
              <ChevronsLeft className="w-3.5 h-3.5" /> First
            </button>
            <button
              type="button"
              disabled={slideIdx === 0}
              onClick={() => setSlideIdx((i) => Math.max(0, i - 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#cccccc] bg-[#f8f8f8] hover:bg-white disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <button
              type="button"
              disabled={slideIdx >= total - 1}
              onClick={() => setSlideIdx((i) => Math.min(total - 1, i + 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#cccccc] bg-[#f8f8f8] hover:bg-white disabled:opacity-40 cursor-pointer"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={slideIdx >= total - 1}
              onClick={() => setSlideIdx(total - 1)}
              className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#cccccc] bg-[#f8f8f8] hover:bg-white disabled:opacity-40 cursor-pointer"
            >
              Last <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Step Pills */}
        <div className="flex flex-wrap gap-1.5">
          {activeCategory.slides.map((s, idx) => (
            <button
              key={s.pill}
              type="button"
              onClick={() => setSlideIdx(idx)}
              className={`px-2.5 py-1 rounded-[2px] text-[11px] font-semibold border cursor-pointer ${
                idx === slideIdx
                  ? "bg-[#1e40af] border-[#1e40af] text-white"
                  : "bg-[#f8f9fa] border-[#cccccc] text-[#333] hover:bg-slate-100"
              }`}
            >
              {idx + 1}. {s.pill}
            </button>
          ))}
        </div>

        {/* Screenshot Viewport */}
        <div className="border border-[#cccccc] bg-[#f8f9fa] p-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.image}
            alt={slide.title}
            className="mx-auto max-h-[640px] w-auto border border-[#dcdcdc] shadow-xs"
          />
        </div>
      </div>
    </div>
  );
}
