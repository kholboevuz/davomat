import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { getClientIp, isIpAllowed } from "@/lib/ip";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = await readDb();
  const ip = getClientIp(req);
  return NextResponse.json({ ip, allowed: isIpAllowed(ip, db.settings.allowedIps), title: db.settings.title });
}
