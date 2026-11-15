import { NextResponse } from "next/server";
import {
  addAuditLog,
  getBusinessById,
  listVehicles,
  saveFiling,
  upsertBusiness,
  upsertVehicle,
} from "@/lib/hvut/db";
import { calculateVehicleTax } from "@/lib/hvut/tax-engine";
import { BusinessEntity, FilingVehicleLine, ReturnFiling, Vehicle } from "@/lib/adapters/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    taxYear?: string;
    business?: BusinessEntity;
    vehicles?: Vehicle[];
  };

  let business = getBusinessById(id);
  if (!business && body.business && body.business.id === id) {
    business = upsertBusiness(body.business);
  }
  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  for (const v of body.vehicles ?? []) {
    if (v?.id && v.businessId === id) {
      upsertVehicle(v);
    }
  }

  const taxYear = body.taxYear || "2026-2027";
  const activeVehicles = listVehicles(id).filter((v) => v.status === "ACTIVE");

  const filingId = `FIL-${taxYear.split("-")[0]}-${Math.floor(1000 + Math.random() * 9000)}`;
  const lines: FilingVehicleLine[] = activeVehicles.map((v, idx) => {
    const lineType = v.defaultWeightCategory === "W" ? "SUSPENDED" : "TAXABLE";
    const computedTax = calculateVehicleTax(v.defaultWeightCategory, v.isLogging, 7);
    return {
      id: `line-${Date.now()}-${idx}`,
      filingId,
      vin: v.vin,
      unitNumber: v.unitNumber,
      weightCategory: v.defaultWeightCategory,
      isLogging: v.isLogging,
      isAgricultural: v.isAgricultural,
      lineType,
      computedTax,
    };
  });

  const totalTaxDue = Number(lines.reduce((acc, l) => acc + l.computedTax, 0).toFixed(2));

  const filing: ReturnFiling = {
    id: filingId,
    businessId: id,
    formType: "2290_ORIG",
    taxYear,
    firstUsedMonth: 7,
    addressChange: false,
    finalReturn: false,
    status: "DRAFT",
    totalTaxDue,
    totalCredits: 0,
    netTaxDue: totalTaxDue,
    createdAt: new Date().toISOString(),
    lines,
  };

  saveFiling(filing);
  addAuditLog({
    actorRole: "OWNER_OP",
    actorName: business.signingAuthorityName,
    action: "CARRY_FORWARD_DRAFT",
    entityType: "ReturnFiling",
    entityId: filing.id,
    details: `Cloned ${lines.length} active vehicles into ${taxYear} draft return.`,
  });

  return NextResponse.json({ filing });
}

