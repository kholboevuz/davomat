import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { readDb, updateDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  const db = await readDb();
  return NextResponse.json({ attendees: db.attendees });
}

// ?id=... bitta o'chirish, ?all=1 hammasini o'chirish
export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  const all = req.nextUrl.searchParams.get("all") === "1";
  await updateDb((db) => {
    if (all) {
      db.attendees = [];
      db.attendance = [];
    } else if (id) {
      db.attendees = db.attendees.filter((a) => a.id !== id);
      db.attendance = db.attendance.filter((r) => r.attendeeId !== id);
    }
  });
  return NextResponse.json({ ok: true });
}
