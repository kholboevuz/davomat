import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { readDb, updateDb, fullName } from "@/lib/db";
import { todayStr } from "@/lib/date";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  const date = req.nextUrl.searchParams.get("date") || todayStr();
  const db = await readDb();
  const recs = new Map(db.attendance.filter((r) => r.date === date).map((r) => [r.attendeeId, r]));
  const rows = db.attendees.map((a) => {
    const r = recs.get(a.id);
    return {
      attendeeId: a.id,
      fullName: fullName(a),
      lavozim: a.lavozim,
      status: r ? r.type : null,
      recordId: r?.id ?? null,
      substituteName: r?.substituteName ?? null,
      substitutePosition: r?.substitutePosition ?? null,
      ip: r?.ip ?? null,
      createdAt: r?.createdAt ?? null,
    };
  });
  const dates = [...new Set(db.attendance.map((r) => r.date))].sort().reverse();
  return NextResponse.json({ date, rows, dates });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  await updateDb((db) => {
    db.attendance = db.attendance.filter((r) => r.id !== id);
  });
  return NextResponse.json({ ok: true });
}
