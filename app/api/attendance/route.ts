import { NextRequest, NextResponse } from "next/server";
import { updateDb, newId, readDb } from "@/lib/db";
import { getClientIp, isIpAllowed } from "@/lib/ip";
import { todayStr } from "@/lib/date";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const settings = (await readDb()).settings;
  if (!isIpAllowed(ip, settings.allowedIps)) {
    return NextResponse.json({ error: "Sizning tarmog'ingizdan davomat qilib bo'lmaydi" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const attendeeId = String(body.attendeeId || "");
  const type = body.type === "substitute" ? "substitute" : "self";
  const substituteName = String(body.substituteName || "").trim();
  const substitutePosition = String(body.substitutePosition || "").trim();

  if (!attendeeId) return NextResponse.json({ error: "Tinglovchi tanlanmagan" }, { status: 400 });
  if (type === "substitute" && (substituteName.split(/\s+/).length < 2 || !substitutePosition)) {
    return NextResponse.json({ error: "F.I.Sh. va lavozimni to'liq kiriting" }, { status: 400 });
  }

  let deviceId = req.cookies.get("device_id")?.value;
  const isNewDevice = !deviceId;
  if (!deviceId) deviceId = newId();

  const today = todayStr();
  const result = await updateDb((db) => {
    if (!db.attendees.some((a) => a.id === attendeeId)) return { error: "Tinglovchi topilmadi", status: 404 };
    const todays = db.attendance.filter((r) => r.date === today);
    if (todays.some((r) => r.deviceId === deviceId)) {
      return { error: "Bu qurilmadan bugun davomat allaqachon qilingan. Boshqa odamni belgilab bo'lmaydi.", status: 409 };
    }
    if (todays.some((r) => r.attendeeId === attendeeId)) {
      return { error: "Bu tinglovchi bugun allaqachon belgilangan", status: 409 };
    }
    db.attendance.push({
      id: newId(),
      date: today,
      attendeeId,
      type,
      ...(type === "substitute" ? { substituteName, substitutePosition } : {}),
      deviceId: deviceId!,
      ip,
      createdAt: new Date().toISOString(),
    });
    return { ok: true, status: 200 };
  });

  const res = NextResponse.json(result, { status: result.status });
  if (isNewDevice) {
    res.cookies.set("device_id", deviceId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
