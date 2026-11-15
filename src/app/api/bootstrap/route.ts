import { NextResponse } from "next/server";
import {
  createUser,
  getSimulatorConfig,
  listAuditLogs,
  listBusinesses,
  listFilings,
  listNotifications,
  listUsers,
  listVehicles,
  saveFiling,
  upsertBusiness,
  upsertVehicle,
} from "@/lib/hvut/db";
import { BusinessEntity, ReturnFiling, User, Vehicle } from "@/lib/adapters/types";

export const dynamic = "force-dynamic";

function buildBootstrapPayload() {
  return {
    users: listUsers(),
    businesses: listBusinesses(),
    vehicles: listVehicles(),
    filings: listFilings(),
    notifications: listNotifications(),
    auditLogs: listAuditLogs(),
    simulatorConfig: getSimulatorConfig(),
  };
}

export async function GET() {
  return NextResponse.json(buildBootstrapPayload());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      users?: User[];
      businesses?: BusinessEntity[];
      vehicles?: Vehicle[];
      filings?: ReturnFiling[];
    };

    const existingUserIds = new Set(listUsers().map((u) => u.id));
    for (const u of body.users ?? []) {
      if (u?.id && u.email && !existingUserIds.has(u.id)) {
        createUser(u);
        existingUserIds.add(u.id);
      }
    }

    const existingBizIds = new Set(listBusinesses().map((b) => b.id));
    for (const b of body.businesses ?? []) {
      if (b?.id && b.ein && b.legalName && !existingBizIds.has(b.id)) {
        upsertBusiness(b);
        existingBizIds.add(b.id);
      }
    }

    const existingVehicleIds = new Set(listVehicles().map((v) => v.id));
    for (const v of body.vehicles ?? []) {
      if (v?.id && v.vin && !existingVehicleIds.has(v.id)) {
        upsertVehicle(v);
        existingVehicleIds.add(v.id);
      }
    }

    const existingFilingIds = new Set(listFilings().map((f) => f.id));
    for (const f of body.filings ?? []) {
      if (f?.id && f.businessId && !existingFilingIds.has(f.id)) {
        saveFiling(f);
        existingFilingIds.add(f.id);
      }
    }

    return NextResponse.json(buildBootstrapPayload());
  } catch {
    return NextResponse.json(buildBootstrapPayload());
  }
}
