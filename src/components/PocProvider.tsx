"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  AuditLog,
  BusinessEntity,
  NotificationLog,
  ReturnFiling,
  SimulatorConfig,
  User,
  Vehicle,
} from "@/lib/adapters/types";

interface PocState {
  users: User[];
  businesses: BusinessEntity[];
  vehicles: Vehicle[];
  filings: ReturnFiling[];
  notifications: NotificationLog[];
  auditLogs: AuditLog[];
  simulatorConfig: SimulatorConfig | null;
  activeUserId: string;
  activeBusinessId: string;
  isAuthenticated: boolean;
  loading: boolean;
  setActiveUserId: (id: string) => void;
  setActiveBusinessId: (id: string) => void;
  loginUser: (id: string) => void;
  logoutUser: () => void;
  refresh: () => Promise<void>;
}

const STORAGE_KEY = "irs_hvut_active_user";
const SNAPSHOT_KEY = "irs_hvut_state_snapshot_v1";

export function buildPdfHref(
  kind: "form2290" | "schedule1" | "voucher",
  filing: ReturnFiling,
  business?: BusinessEntity,
): string {
  const { mefXml: _omitXml, ...compactFiling } = filing;
  void _omitXml;
  if (typeof window === "undefined") {
    return `/api/filings/${filing.id}/${kind}`;
  }
  try {
    const payload = JSON.stringify({ filing: compactFiling, business });
    const bytes = new TextEncoder().encode(payload);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64url = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return `/api/filings/${filing.id}/${kind}?ctx=${base64url}`;
  } catch {
    return `/api/filings/${filing.id}/${kind}`;
  }
}

const PocContext = createContext<PocState | null>(null);

export function PocProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [businesses, setBusinesses] = useState<BusinessEntity[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filings, setFilings] = useState<ReturnFiling[]>([]);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [simulatorConfig, setSimulatorConfig] = useState<SimulatorConfig | null>(null);
  const [activeUserId, setActiveUserIdState] = useState<string>("");
  const [activeBusinessId, setActiveBusinessId] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const selectDefaultBusiness = useCallback(
    (userId: string, loadedUsers: User[], loadedBusinesses: BusinessEntity[]) => {
      const userObj = loadedUsers.find((u) => u.id === userId);
      const userBiz = loadedBusinesses.find((b) => b.ownerUserId === userId);
      if (userBiz) {
        setActiveBusinessId(userBiz.id);
      } else if ((userObj?.role === "ADMIN" || userObj?.role === "CPA") && loadedBusinesses.length > 0) {
        setActiveBusinessId(loadedBusinesses[0].id);
      } else {
        setActiveBusinessId("");
      }
    },
    [],
  );

  const refresh = useCallback(async () => {
    try {
      let localSnapshot: {
        users?: User[];
        businesses?: BusinessEntity[];
        vehicles?: Vehicle[];
        filings?: ReturnFiling[];
      } | null = null;

      if (typeof window !== "undefined") {
        try {
          const raw = window.localStorage.getItem(SNAPSHOT_KEY);
          if (raw) {
            localSnapshot = JSON.parse(raw);
          }
        } catch {
          localSnapshot = null;
        }
      }

      const res = await fetch("/api/bootstrap", {
        method: localSnapshot ? "POST" : "GET",
        headers: localSnapshot ? { "Content-Type": "application/json" } : undefined,
        body: localSnapshot ? JSON.stringify(localSnapshot) : undefined,
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      const mergeById = <T extends { id: string }>(serverArr: T[], snapArr?: T[]): T[] => {
        const map = new Map<string, T>();
        for (const item of snapArr ?? []) {
          if (item?.id) map.set(item.id, item);
        }
        for (const item of serverArr) {
          if (item?.id) map.set(item.id, item);
        }
        return Array.from(map.values());
      };

      const loadedUsers: User[] = mergeById(data.users || [], localSnapshot?.users);
      const loadedBusinesses: BusinessEntity[] = mergeById(data.businesses || [], localSnapshot?.businesses);
      const loadedVehicles: Vehicle[] = mergeById(data.vehicles || [], localSnapshot?.vehicles);
      const loadedFilings: ReturnFiling[] = mergeById(data.filings || [], localSnapshot?.filings);
      const loadedNotifications: NotificationLog[] = data.notifications || [];

      setUsers(loadedUsers);
      setBusinesses(loadedBusinesses);
      setVehicles(loadedVehicles);
      setFilings(loadedFilings);
      setNotifications(loadedNotifications);
      setAuditLogs(data.auditLogs || []);
      setSimulatorConfig(data.simulatorConfig || null);

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            SNAPSHOT_KEY,
            JSON.stringify({
              users: loadedUsers,
              businesses: loadedBusinesses,
              vehicles: loadedVehicles,
              filings: loadedFilings,
              notifications: loadedNotifications,
            }),
          );
        } catch {
          // Ignore storage quota errors
        }

        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored && stored !== "logged_out" && loadedUsers.some((u) => u.id === stored)) {
          setActiveUserIdState(stored);
          setIsAuthenticated(true);
          selectDefaultBusiness(stored, loadedUsers, loadedBusinesses);
        } else {
          setIsAuthenticated(false);
          setActiveUserIdState("");
          setActiveBusinessId("");
        }
      }
    } finally {
      setLoading(false);
    }
  }, [selectDefaultBusiness]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setActiveUserId = useCallback(
    (id: string) => {
      setActiveUserIdState(id);
      setIsAuthenticated(true);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, id);
      }
      selectDefaultBusiness(id, users, businesses);
    },
    [businesses, users, selectDefaultBusiness],
  );

  const loginUser = useCallback(
    (id: string) => {
      setActiveUserId(id);
    },
    [setActiveUserId],
  );

  const logoutUser = useCallback(() => {
    setIsAuthenticated(false);
    setActiveUserIdState("");
    setActiveBusinessId("");
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "logged_out");
    }
  }, []);

  return (
    <PocContext.Provider
      value={{
        users,
        businesses,
        vehicles,
        filings,
        notifications,
        auditLogs,
        simulatorConfig,
        activeUserId,
        activeBusinessId,
        isAuthenticated,
        loading,
        setActiveUserId,
        setActiveBusinessId,
        loginUser,
        logoutUser,
        refresh,
      }}
    >
      {children}
    </PocContext.Provider>
  );
}

export function usePoc() {
  const ctx = useContext(PocContext);
  if (!ctx) throw new Error("usePoc must be used within PocProvider");
  return ctx;
}
