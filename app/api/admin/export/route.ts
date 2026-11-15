import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { isAdmin } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { todayStr, timeStr } from "@/lib/date";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  const date = req.nextUrl.searchParams.get("date") || todayStr();
  const db = await readDb();
  const recs = new Map(db.attendance.filter((r) => r.date === date).map((r) => [r.attendeeId, r]));

  const data = db.attendees.map((a, i) => {
    const r = recs.get(a.id);
    return {
      "№": i + 1,
      Familiya: a.familiya,
      Ism: a.ism,
      "Otasining ismi": a.otasiningIsmi,
      Lavozimi: a.lavozim,
      Holati: !r ? "Kelmadi" : r.type === "self" ? "Keldi" : "O'rniga keldi",
      "O'rniga kelgan (F.I.Sh.)": r?.substituteName ?? "",
      "O'rniga kelgan lavozimi": r?.substitutePosition ?? "",
      Vaqt: r ? timeStr(r.createdAt) : "",
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [{ wch: 5 }, { wch: 18 }, { wch: 15 }, { wch: 18 }, { wch: 30 }, { wch: 14 }, { wch: 30 }, { wch: 25 }, { wch: 8 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, date);
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="davomat-${date}.xlsx"`,
    },
  });
}
