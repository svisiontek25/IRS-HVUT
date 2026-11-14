import { NextResponse } from "next/server";
import { markAllNotificationsRead } from "@/lib/hvut/db";

export async function POST() {
  markAllNotificationsRead();
  return NextResponse.json({ ok: true });
}

