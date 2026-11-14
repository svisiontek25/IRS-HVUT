import { NextResponse } from "next/server";
import {
  addAuditLog,
  getSimulatorConfig,
  resetAndReseedDatabase,
  updateSimulatorConfig,
} from "@/lib/hvut/db";
import { SimulatorConfig } from "@/lib/adapters/types";

export async function GET() {
  return NextResponse.json({ simulatorConfig: getSimulatorConfig() });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as Partial<SimulatorConfig> & { action?: string };
  if (body.action === "RESET") {
    resetAndReseedDatabase();
    return NextResponse.json({
      reset: true,
      simulatorConfig: getSimulatorConfig(),
    });
  }

  const updated = updateSimulatorConfig({
    mode: body.mode,
    simulatedDelayMs: body.simulatedDelayMs,
    forcedRejectCode: body.forcedRejectCode,
    efin: body.efin,
    etin: body.etin,
    softwareId: body.softwareId,
  });

  addAuditLog({
    actorRole: "ADMIN",
    actorName: "Simulator Console",
    action: "SIMULATOR_CONFIG_UPDATED",
    entityType: "SimulatorConfig",
    entityId: "1",
    details: `Mode=${updated.mode}, Delay=${updated.simulatedDelayMs}ms, ForcedCode=${updated.forcedRejectCode}`,
  });

  return NextResponse.json({ simulatorConfig: updated });
}

