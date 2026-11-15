import { NextRequest, NextResponse } from "next/server";
import { readDb, fullName } from "@/lib/db";
import { getClientIp, isIpAllowed } from "@/lib/ip";
import { todayStr } from "@/lib/date";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = await readDb();
  const ip = getClientIp(req);
  if (!isIpAllowed(ip, db.settings.allowedIps)) {
    return NextResponse.json({ error: "Ruxsat yo'q", ip }, { status: 403 });
  }
  const today = todayStr();
  const deviceId = req.cookies.get("device_id")?.value;
  const todays = db.attendance.filter((r) => r.date === today);
  const marked = new Map(todays.map((r) => [r.attendeeId, r.type]));

  const mine = deviceId ? todays.find((r) => r.deviceId === deviceId) : undefined;
  const mineAttendee = mine ? db.attendees.find((a) => a.id === mine.attendeeId) : undefined;

  return NextResponse.json({
    title: db.settings.title,
    date: today,
    attendees: db.attendees.map((a) => ({
      id: a.id,
      fullName: fullName(a),
      lavozim: a.lavozim,
      status: marked.get(a.id) ?? null,
    })),
    myRecord: mine
      ? {
          type: mine.type,
          fullName: mineAttendee ? fullName(mineAttendee) : "",
          substituteName: mine.substituteName,
          createdAt: mine.createdAt,
        }
      : null,
  });
}
