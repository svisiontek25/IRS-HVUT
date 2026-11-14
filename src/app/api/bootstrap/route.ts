import { NextResponse } from "next/server";
import {
  getSimulatorConfig,
  listAuditLogs,
  listBusinesses,
  listFilings,
  listNotifications,
  listUsers,
  listVehicles,
} from "@/lib/hvut/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    users: listUsers(),
    businesses: listBusinesses(),
    vehicles: listVehicles(),
    filings: listFilings(),
    notifications: listNotifications(),
    auditLogs: listAuditLogs(),
    simulatorConfig: getSimulatorConfig(),
  });
}

