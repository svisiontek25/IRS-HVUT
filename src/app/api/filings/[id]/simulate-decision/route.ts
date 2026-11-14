import { NextResponse } from "next/server";
import { applyAdminSimulatedDecision } from "@/lib/hvut/filing-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      decision: "ACCEPT" | "REJECT";
      rejectionCode?: string;
      actorName?: string;
    };

    const updated = applyAdminSimulatedDecision({
      filingId: id,
      decision: body.decision,
      rejectionCode: body.rejectionCode,
      actorName: body.actorName ?? "Platform Admin",
    });

    return NextResponse.json({ filing: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to apply simulated decision" },
      { status: 500 },
    );
  }
}

