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
      const res = await fetch("/api/bootstrap", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const loadedUsers: User[] = data.users || [];
      const loadedBusinesses: BusinessEntity[] = data.businesses || [];
      setUsers(loadedUsers);
      setBusinesses(loadedBusinesses);
      setVehicles(data.vehicles || []);
      setFilings(data.filings || []);
      setNotifications(data.notifications || []);
      setAuditLogs(data.auditLogs || []);
      setSimulatorConfig(data.simulatorConfig || null);

      if (typeof window !== "undefined") {
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
