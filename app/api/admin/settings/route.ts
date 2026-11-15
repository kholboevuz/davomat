import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { readDb, updateDb } from "@/lib/db";
import { getClientIp } from "@/lib/ip";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  const db = await readDb();
  return NextResponse.json({ settings: db.settings, currentIp: getClientIp(req) });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const settings = await updateDb((db) => {
    if (Array.isArray(body.allowedIps)) {
      db.settings.allowedIps = [...new Set(body.allowedIps.map((s: unknown) => String(s).trim()).filter(Boolean))] as string[];
    }
    if (typeof body.title === "string" && body.title.trim()) db.settings.title = body.title.trim();
    return db.settings;
  });
  return NextResponse.json({ ok: true, settings });
}
