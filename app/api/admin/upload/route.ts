import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { isAdmin } from "@/lib/auth";
import { updateDb, newId, type Attendee } from "@/lib/db";

export const dynamic = "force-dynamic";

const has = (h: string, ...keys: string[]) => keys.some((k) => h.includes(k));

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const replace = form.get("replace") === "true";
  if (!(file instanceof File)) return NextResponse.json({ error: "Fayl tanlanmagan" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "", raw: false });
  if (rows.length === 0) return NextResponse.json({ error: "Fayl bo'sh" }, { status: 400 });

  // Sarlavha qatorini aniqlash
  const header = rows[0].map((c) => String(c).toLowerCase().replace(/[‘’ʻʼ`']/g, ""));
  const idx = { fam: -1, ism: -1, ota: -1, lav: -1, fish: -1 };
  header.forEach((h, i) => {
    if (idx.fish < 0 && has(h, "f.i.sh", "fish", "f.i.o", "fio", "ф.и.о", "фио")) idx.fish = i;
    else if (idx.fam < 0 && has(h, "familiya", "фамилия", "familya")) idx.fam = i;
    else if (idx.ota < 0 && has(h, "otasi", "sharif", "otchest", "отчество", "otch")) idx.ota = i;
    else if (idx.ism < 0 && has(h, "ism", "имя", "name")) idx.ism = i;
    else if (idx.lav < 0 && has(h, "lavozim", "должность", "lavozimi", "position")) idx.lav = i;
  });
  const hasHeader = Object.values(idx).some((v) => v >= 0);
  // Sarlavha bo'lmasa: A=Familiya, B=Ism, C=Otasining ismi, D=Lavozim
  if (!hasHeader) Object.assign(idx, { fam: 0, ism: 1, ota: 2, lav: 3 });
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const parsed: Attendee[] = [];
  for (const r of dataRows) {
    const get = (i: number) => (i >= 0 ? String(r[i] ?? "").trim() : "");
    let familiya = get(idx.fam);
    let ism = get(idx.ism);
    let ota = get(idx.ota);
    if (idx.fish >= 0) {
      const parts = get(idx.fish).split(/\s+/).filter(Boolean);
      familiya = parts[0] || "";
      ism = parts[1] || "";
      ota = parts.slice(2).join(" ");
    }
    const lavozim = get(idx.lav);
    if (!familiya && !ism) continue;
    parsed.push({ id: newId(), familiya, ism, otasiningIsmi: ota, lavozim });
  }
  if (parsed.length === 0) return NextResponse.json({ error: "Fayldan tinglovchi topilmadi" }, { status: 400 });

  const result = await updateDb((db) => {
    if (replace) {
      db.attendees = parsed;
      db.attendance = [];
      return { added: parsed.length, skipped: 0 };
    }
    const key = (a: Attendee) => `${a.familiya}|${a.ism}|${a.otasiningIsmi}`.toLowerCase();
    const existing = new Set(db.attendees.map(key));
    let added = 0;
    for (const a of parsed) {
      if (existing.has(key(a))) continue;
      existing.add(key(a));
      db.attendees.push(a);
      added++;
    }
    return { added, skipped: parsed.length - added };
  });

  return NextResponse.json({ ok: true, ...result });
}
