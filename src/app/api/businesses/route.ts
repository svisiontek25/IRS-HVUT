import { NextResponse } from "next/server";
import { z } from "zod";
import { addAuditLog, upsertBusiness } from "@/lib/hvut/db";
import { validateEin } from "@/lib/hvut/vin-validator";
import { deriveNameControl } from "@/lib/hvut/tax-engine";

const BusinessSchema = z.object({
  id: z.string().optional(),
  ownerUserId: z.string().min(1),
  ein: z.string().min(9),
  legalName: z.string().min(2),
  nameControl: z.string().max(4).optional(),
  dba: z.string().optional(),
  businessType: z
    .enum(["LLC", "CORPORATION", "PARTNERSHIP", "SOLE_PROPRIETOR", "NON_PROFIT", "OTHER"])
    .optional(),
  addressLine1: z.string().min(2),
  roomSuite: z.string().optional(),
  city: z.string().min(2),
  otherCity: z.boolean().optional(),
  state: z.string().length(2),
  country: z.string().optional(),
  zip: z.string().min(5),
  cellNumber: z.string().optional(),
  pocName: z.string().optional(),
  pocEmail: z.string().optional(),
  pocPhone: z.string().optional(),
  signingAuthorityName: z.string().min(2),
  signingAuthorityTitle: z.string().min(2),
  signingAuthorityEmail: z.string().optional(),
  phone: z.string().min(7),
  thirdPartyDesignee: z
    .object({
      name: z.string(),
      phone: z.string(),
      pin: z.string(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = BusinessSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid business profile" },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const einCheck = validateEin(data.ein);
    if (!einCheck.valid) {
      return NextResponse.json({ error: einCheck.error }, { status: 400 });
    }

    const legalName = data.legalName.trim().toUpperCase();
    const nameControl = (data.nameControl?.trim() || deriveNameControl(legalName)).toUpperCase();

    const saved = upsertBusiness({
      id: data.id || `biz-${Date.now()}`,
      ownerUserId: data.ownerUserId,
      ein: einCheck.formatted,
      legalName,
      nameControl,
      dba: data.dba?.trim() || undefined,
      businessType: data.businessType ?? "LLC",
      addressLine1: data.addressLine1.trim(),
      roomSuite: data.roomSuite?.trim() || undefined,
      city: data.city.trim(),
      otherCity: Boolean(data.otherCity),
      state: data.state.trim().toUpperCase(),
      country: data.country?.trim() || "US",
      zip: data.zip.trim(),
      cellNumber: data.cellNumber?.trim() || undefined,
      pocName: data.pocName?.trim() || undefined,
      pocEmail: data.pocEmail?.trim() || undefined,
      pocPhone: data.pocPhone?.trim() || undefined,
      signingAuthorityName: data.signingAuthorityName.trim(),
      signingAuthorityTitle: data.signingAuthorityTitle.trim(),
      signingAuthorityEmail: data.signingAuthorityEmail?.trim() || undefined,
      phone: data.phone.trim(),
      thirdPartyDesignee:
        data.thirdPartyDesignee && data.thirdPartyDesignee.name.trim()
          ? {
              name: data.thirdPartyDesignee.name.trim(),
              phone: data.thirdPartyDesignee.phone.trim(),
              pin: data.thirdPartyDesignee.pin.trim(),
            }
          : undefined,
    });

    addAuditLog({
      actorRole: "OWNER_OP",
      actorName: saved.signingAuthorityName,
      action: "BUSINESS_UPSERT",
      entityType: "BusinessEntity",
      entityId: saved.id,
      details: `Saved business ${saved.legalName} (EIN ${saved.ein}, Name Control ${saved.nameControl})`,
    });

    return NextResponse.json({ business: saved });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save business" },
      { status: 500 },
    );
  }
}
