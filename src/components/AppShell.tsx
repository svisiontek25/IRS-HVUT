"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  Calculator,
  ChevronDown,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquare,
  Printer,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import { usePoc } from "./PocProvider";

export function IrsHvutLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      {/* Modern Indigo-Blue & Amber Highway Semi-Truck Badge SVG */}
      <div
        className={`rounded-xl bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#2563eb] flex items-center justify-center shadow-xs border border-indigo-400/20 ${compact ? "w-10 h-10" : "w-12 h-12"
          }`}
      >
        <svg
          viewBox="0 0 64 48"
          className={compact ? "w-7 h-5" : "w-8 h-6"}
          aria-hidden="true"
        >
          {/* Highway Horizon Line */}
          <line x1="4" y1="39" x2="60" y2="39" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
          {/* Trailer Cargo Box */}
          <rect x="6" y="12" width="30" height="20" rx="2.5" fill="#ffffff" />
          <line x1="11" y1="18" x2="31" y2="18" stroke="#1e40af" strokeWidth="2" strokeLinecap="round" />
          <line x1="11" y1="24" x2="26" y2="24" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
          {/* Tractor Cab */}
          <path
            d="M38 17 H49 L56 24 V32 H38 V17 Z"
            fill="#f59e0b"
          />
          {/* Cab Windshield */}
          <path d="M41 19 H48 L53 24 H41 V19 Z" fill="#dbeafe" />
          {/* Chassis */}
          <rect x="8" y="32" width="48" height="3" rx="1" fill="#cbd5e1" />
          {/* Wheels */}
          <circle cx="15" cy="36" r="4" fill="#0f172a" stroke="#e2e8f0" strokeWidth="1.6" />
          <circle cx="27" cy="36" r="4" fill="#0f172a" stroke="#e2e8f0" strokeWidth="1.6" />
          <circle cx="48" cy="36" r="4" fill="#0f172a" stroke="#e2e8f0" strokeWidth="1.6" />
        </svg>
      </div>

      {/* Wordmark + Subtitle */}
      <div className="leading-tight">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-extrabold tracking-tight text-[#0f172a] ${compact ? "text-lg" : "text-[22px]"
              }`}
          >
            IRS<span className="text-[#1e40af]">-HVUT</span>
          </span>
        </div>
        <div className="text-[11px] font-semibold tracking-wide text-[#475569] uppercase -mt-0.5">
          2290 tax filings
        </div>
      </div>
    </div>
  );
}

const AUTH_NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/file/new", label: "File a Return", icon: FileText },
  { href: "/tax-calculator", label: "Tax Calculator", icon: Calculator },
];

const PUBLIC_NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/tax-calculator", label: "Tax Calculator", icon: Calculator },
];

const PUBLIC_ROUTES = ["/", "/login", "/register", "/tax-calculator", "/user-guide"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    users,
    activeUserId,
    isAuthenticated,
    loading,
    logoutUser,
    notifications,
    refresh,
  } = usePoc();

  const [inboxOpen, setInboxOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const cleanPath = !pathname || pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  const isPublicRoute = PUBLIC_ROUTES.includes(cleanPath);
  const isAuthScreen = cleanPath === "/login" || cleanPath === "/register";
  const navItems = isAuthenticated ? AUTH_NAV : PUBLIC_NAV;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const activeUser = isAuthenticated ? users.find((u) => u.id === activeUserId) : undefined;
  const profileBadgeName = isAuthenticated
    ? (activeUser?.firstName || activeUser?.name?.split(" ")[0] || "ACCOUNT").toUpperCase()
    : "SIGN IN";

  useEffect(() => {
    if (!loading && !isAuthenticated && !isPublicRoute) {
      router.replace("/login");
    }
  }, [loading, isAuthenticated, isPublicRoute, router]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  async function handleOpenInbox() {
    setMenuOpen(false);
    setInboxOpen(true);
    if (unreadCount > 0) {
      await fetch("/api/notifications/read", { method: "POST" });
      await refresh();
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f1f5f9] text-slate-900">
      {/* Top Federal Slate-Indigo Banner */}
      <div className="bg-[#0f172a] border-b border-slate-800 text-slate-200 text-[12px]">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between min-h-[36px] py-1 gap-2">
          <div className="inline-flex items-center gap-2 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              IRS-HVUT Portal <span className="text-slate-400">·</span>{" "}
              <span className="text-sky-300 font-semibold">2290 tax filings</span>
            </span>
          </div>

          <div className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-300">
            <span className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-400/30 text-indigo-200">
              IRS MeF Rev. July 2026
            </span>
            <span className="hidden sm:inline text-slate-400">Electronic Schedule 1 Gateway</span>
          </div>
        </div>
      </div>

      {/* Main IRS-HVUT Header */}
      <header className="bg-white border-b-2 border-[#1e40af] sticky top-0 z-30 shadow-xs">
        {isAuthScreen ? (
          <div className="max-w-7xl mx-auto px-4 h-[74px] flex items-center justify-between gap-4">
            <Link href="/" className="shrink-0">
              <IrsHvutLogo />
            </Link>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-md text-slate-600 hover:text-[#1e40af] hover:bg-slate-100 transition hidden sm:inline-flex"
              >
                Home
              </Link>
              <Link
                href="/tax-calculator"
                className="px-3 py-1.5 rounded-md text-slate-600 hover:text-[#1e40af] hover:bg-slate-100 transition hidden sm:inline-flex"
              >
                Tax Calculator
              </Link>
              <Link
                href="/login"
                className={
                  pathname === "/login"
                    ? "px-3.5 py-1.5 rounded-md bg-indigo-50 text-[#1e40af] border border-indigo-200 font-bold"
                    : "px-3.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
                }
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className={
                  pathname === "/register"
                    ? "px-3.5 py-1.5 rounded-md bg-[#1e40af] text-white font-bold shadow-xs"
                    : "px-3.5 py-1.5 rounded-md bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-semibold shadow-xs transition"
                }
              >
                Register Free
              </Link>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 h-[74px] flex items-center justify-between gap-4">
            {/* Left Logo */}
            <Link href={isAuthenticated ? "/dashboard" : "/"} className="shrink-0">
              <IrsHvutLogo />
            </Link>

            {/* Center Icon-Above-Text Navigation */}
            <nav className="hidden md:flex items-center gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active =
                  cleanPath === item.href ||
                  (item.href !== "/" && item.href !== "/dashboard" && cleanPath.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-md transition ${active
                        ? "bg-indigo-50 text-[#1e40af] font-bold"
                        : "text-slate-600 hover:text-[#1e40af] hover:bg-slate-50"
                      }`}
                  >
                    <Icon className="w-5 h-5 mb-0.5" />
                    <span className="text-[12px] whitespace-nowrap">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right Account Dropdown Button */}
            <div className="relative" ref={menuRef}>
              {!isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="px-3.5 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="px-3.5 py-1.5 rounded-md bg-[#1e40af] hover:bg-[#1e3a8a] text-xs font-semibold text-white shadow-xs transition"
                  >
                    Register Free
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-slate-300 hover:border-indigo-400 text-xs font-semibold text-slate-800 shadow-2xs cursor-pointer transition"
                >
                  <span className="w-6 h-6 rounded-full bg-[#1e40af] text-white flex items-center justify-center">
                    <UserCheck className="w-3.5 h-3.5" />
                  </span>
                  <span className="max-w-28 truncate">{profileBadgeName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>
              )}

              {menuOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 z-50 text-xs">
                  <div className="px-3.5 py-2 border-b border-slate-200 bg-slate-50">
                    <div className="font-bold text-slate-900">{activeUser?.name}</div>
                    <div className="text-[11px] text-slate-500">{activeUser?.email}</div>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 hover:bg-indigo-50 text-slate-800 font-medium"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-[#1e40af]" /> My Dashboard &amp; Returns
                  </Link>
                  <Link
                    href="/businesses/new"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 hover:bg-indigo-50 text-slate-800 font-medium"
                  >
                    <Building2 className="w-3.5 h-3.5 text-[#1e40af]" /> Add Business Entity
                  </Link>
                  <button
                    type="button"
                    onClick={handleOpenInbox}
                    className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-indigo-50 text-slate-800 font-medium cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5 text-[#1e40af]" /> Sandbox Delivery Inbox
                    </span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  <div className="border-t border-slate-200 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        logoutUser();
                        setMenuOpen(false);
                        router.push("/login");
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-rose-700 hover:bg-rose-50 font-semibold cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Nav */}
        {!isAuthScreen && (
          <div className="md:hidden border-t border-slate-200 px-3 py-1.5 flex gap-1 overflow-x-auto bg-white">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = cleanPath === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${active ? "bg-[#1e40af] text-white" : "text-slate-700 bg-slate-100"
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {!isPublicRoute && loading ? (
          <div className="max-w-md mx-auto mt-12 bg-white border border-slate-200 rounded-xl p-6 text-center shadow-xs space-y-2">
            <div className="text-sm font-semibold text-slate-900">Checking session...</div>
            <p className="text-xs text-slate-500">Verifying your IRS-HVUT sign-in status.</p>
          </div>
        ) : !isPublicRoute && !isAuthenticated ? (
          <div className="max-w-md mx-auto mt-12 bg-white border border-slate-200 rounded-xl p-6 text-center shadow-xs space-y-4">
            <div className="w-11 h-11 rounded-full bg-indigo-50 border border-indigo-200 text-[#1e40af] mx-auto flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h1 className="text-lg font-bold text-slate-900">Sign In Required</h1>
              <p className="text-xs text-slate-600">
                Please sign in or create a free account to access your dashboard, businesses, and Form 2290 filings.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Link
                href="/login"
                className="flex-1 bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-semibold py-2 px-4 rounded-md text-xs shadow-xs transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="flex-1 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2 px-4 rounded-md text-xs transition"
              >
                Create Free Account
              </Link>
            </div>
          </div>
        ) : (
          children
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#0f172a] text-[12px] text-slate-300 py-4 mt-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3">
          <span className="font-medium tracking-wide">IRS HVUT FORM 2290 E FILE SIMULATOR</span>
          <div className="flex items-center gap-4">
            {isAuthenticated && (
              <Link href="/tax-calculator" className="hover:underline text-sky-300 font-medium">
                Tax Calculator
              </Link>
            )}
          </div>
        </div>
      </footer>

      {/* Sandbox Inbox Drawer */}
      {inboxOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[1px]">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
            <div className="px-5 py-4 bg-gradient-to-r from-[#0f172a] to-[#1e40af] text-white flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm">Sandbox Delivery Inbox</h2>
                <p className="text-[11px] text-indigo-100">
                  Simulated Email, SMS &amp; Fax Schedule 1 dispatches
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInboxOpen(false)}
                className="p-1 rounded hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {notifications.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No simulated messages yet. Submit a filing to see notifications here.
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="bg-white rounded-lg border border-slate-200 p-3.5 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {n.channel === "EMAIL" && <Mail className="w-3 h-3 text-blue-600" />}
                        {n.channel === "SMS" && <MessageSquare className="w-3 h-3 text-indigo-600" />}
                        {n.channel === "FAX" && <Printer className="w-3 h-3 text-amber-600" />}
                        {n.channel}
                      </span>
                      <span className="text-slate-400">
                        {new Date(n.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">To: {n.recipient}</div>
                    <div className="font-semibold text-sm text-slate-900">{n.subject}</div>
                    <p className="text-xs text-slate-600 whitespace-pre-line">{n.body}</p>
                    {n.attachmentUrl && (
                      <a
                        href={n.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e40af] hover:underline pt-1"
                      >
                        Download Watermarked Schedule 1 PDF -&gt;
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
