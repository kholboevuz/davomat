"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
  ClipboardCheck, Users, Settings, QrCode, LogOut, Upload, Download, Trash2, Search, FileSpreadsheet,
  Loader2, Plus, ShieldCheck, RefreshCw, Printer,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { normalize } from "@/lib/text";

type Attendee = { id: string; familiya: string; ism: string; otasiningIsmi: string; lavozim: string };
type Row = {
  attendeeId: string; fullName: string; lavozim: string; status: "self" | "substitute" | null; recordId: string | null;
  substituteName: string | null; substitutePosition: string | null; ip: string | null; createdAt: string | null;
};

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(new Date());
const time = (iso: string) => new Intl.DateTimeFormat("uz-UZ", { timeZone: "Asia/Tashkent", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export default function AdminDashboard() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold leading-tight">Admin panel</div>
              <div className="text-xs text-muted-foreground">Davomat tizimi</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/" target="_blank">Saytni ochish</a>
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut /> <span className="hidden sm:inline">Chiqish</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Tabs defaultValue="attendance">
          <TabsList className="grid h-auto w-full grid-cols-4 sm:inline-flex sm:w-auto">
            <TabsTrigger value="attendance" className="flex-col gap-1 py-2 sm:flex-row"><ClipboardCheck /> <span className="text-xs sm:text-sm">Davomat</span></TabsTrigger>
            <TabsTrigger value="attendees" className="flex-col gap-1 py-2 sm:flex-row"><Users /> <span className="text-xs sm:text-sm">Tinglovchilar</span></TabsTrigger>
            <TabsTrigger value="settings" className="flex-col gap-1 py-2 sm:flex-row"><Settings /> <span className="text-xs sm:text-sm">IP sozlama</span></TabsTrigger>
            <TabsTrigger value="qr" className="flex-col gap-1 py-2 sm:flex-row"><QrCode /> <span className="text-xs sm:text-sm">QR kod</span></TabsTrigger>
          </TabsList>
          <TabsContent value="attendance"><AttendanceTab /></TabsContent>
          <TabsContent value="attendees"><AttendeesTab /></TabsContent>
          <TabsContent value="settings"><SettingsTab /></TabsContent>
          <TabsContent value="qr"><QrTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ---------------- Davomat ---------------- */
function AttendanceTab() {
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "self" | "substitute" | "absent">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/attendance?date=${date}`, { cache: "no-store" });
    const data = await res.json();
    setRows(data.rows || []);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000); // har 15 soniyada yangilanadi
    return () => clearInterval(t);
  }, [load]);

  const stats = useMemo(() => ({
    total: rows.length,
    self: rows.filter((r) => r.status === "self").length,
    sub: rows.filter((r) => r.status === "substitute").length,
    absent: rows.filter((r) => !r.status).length,
  }), [rows]);

  const shown = useMemo(() => {
    const nq = normalize(q);
    return rows.filter((r) => {
      if (filter === "self" && r.status !== "self") return false;
      if (filter === "substitute" && r.status !== "substitute") return false;
      if (filter === "absent" && r.status) return false;
      return !nq || nq.split(" ").every((w) => normalize(r.fullName + " " + (r.substituteName || "")).includes(w));
    });
  }, [rows, q, filter]);

  async function removeRecord(id: string) {
    if (!confirm("Bu davomat yozuvini o'chirasizmi?")) return;
    await fetch(`/api/admin/attendance?id=${id}`, { method: "DELETE" });
    toast.success("O'chirildi");
    load();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Jami" value={stats.total} active={filter === "all"} onClick={() => setFilter("all")} />
        <Stat label="Keldi" value={stats.self} color="text-emerald-600" active={filter === "self"} onClick={() => setFilter("self")} />
        <Stat label="O'rniga keldi" value={stats.sub} color="text-amber-600" active={filter === "substitute"} onClick={() => setFilter("substitute")} />
        <Stat label="Kelmadi" value={stats.absent} color="text-red-600" active={filter === "absent"} onClick={() => setFilter("absent")} />
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-end sm:justify-between sm:space-y-0">
          <div>
            <CardTitle>Davomat ro'yxati</CardTitle>
            <CardDescription>Sana bo'yicha tinglovchilar holati</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
            <Button variant="outline" size="icon" onClick={load} title="Yangilash"><RefreshCw className={loading ? "animate-spin" : ""} /></Button>
            <Button asChild variant="success">
              <a href={`/api/admin/export?date=${date}`}><Download /> Excel</a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism familiya bo'yicha qidirish..." className="pl-9" />
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">№</TableHead>
                  <TableHead>F.I.Sh.</TableHead>
                  <TableHead className="hidden md:table-cell">Lavozimi</TableHead>
                  <TableHead>Holati</TableHead>
                  <TableHead className="hidden lg:table-cell">O'rniga kelgan</TableHead>
                  <TableHead className="hidden sm:table-cell">Vaqt</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">{loading ? "Yuklanmoqda..." : "Ma'lumot yo'q"}</TableCell></TableRow>
                )}
                {shown.map((r, i) => (
                  <TableRow key={r.attendeeId}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{r.fullName}</div>
                      <div className="text-xs text-muted-foreground md:hidden">{r.lavozim}</div>
                      {r.substituteName && <div className="text-xs text-amber-700 lg:hidden">↳ {r.substituteName}</div>}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{r.lavozim}</TableCell>
                    <TableCell>
                      {r.status === "self" ? <Badge variant="success">Keldi</Badge>
                        : r.status === "substitute" ? <Badge variant="warning">O'rniga</Badge>
                        : <Badge variant="destructive">Kelmadi</Badge>}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {r.substituteName ? (
                        <div><div className="font-medium">{r.substituteName}</div><div className="text-xs text-muted-foreground">{r.substitutePosition}</div></div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{r.createdAt ? time(r.createdAt) : "—"}</TableCell>
                    <TableCell>
                      {r.recordId && (
                        <Button variant="ghost" size="icon" onClick={() => removeRecord(r.recordId!)} title="Davomatni bekor qilish">
                          <Trash2 className="text-red-500" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, color, active, onClick }: { label: string; value: number; color?: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-xl border bg-card p-4 text-left shadow-sm transition ${active ? "ring-2 ring-primary" : "hover:border-primary/40"}`}>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${color || ""}`}>{value}</div>
    </button>
  );
}

/* ---------------- Tinglovchilar ---------------- */
function AttendeesTab() {
  const [list, setList] = useState<Attendee[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [replace, setReplace] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/attendees", { cache: "no-store" });
    const data = await res.json();
    setList(data.attendees || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function upload() {
    if (!file) return toast.error("Excel faylni tanlang");
    if (replace && !confirm("Eski ro'yxat va barcha davomat ma'lumotlari o'chiriladi. Davom etasizmi?")) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("replace", String(replace));
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) return toast.error(data.error || "Xatolik");
    toast.success(`${data.added} ta tinglovchi qo'shildi${data.skipped ? `, ${data.skipped} ta takror o'tkazib yuborildi` : ""}`);
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
    load();
  }

  async function remove(id: string) {
    if (!confirm("Tinglovchini o'chirasizmi?")) return;
    await fetch(`/api/admin/attendees?id=${id}`, { method: "DELETE" });
    load();
  }
  async function removeAll() {
    if (!confirm("BARCHA tinglovchilar va davomat o'chiriladi. Ishonchingiz komilmi?")) return;
    await fetch(`/api/admin/attendees?all=1`, { method: "DELETE" });
    toast.success("Hammasi o'chirildi");
    load();
  }

  const shown = useMemo(() => {
    const nq = normalize(q);
    if (!nq) return list;
    return list.filter((a) => nq.split(" ").every((w) => normalize(`${a.familiya} ${a.ism} ${a.otasiningIsmi}`).includes(w)));
  }, [list, q]);

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-emerald-600" /> Excel yuklash</CardTitle>
          <CardDescription>
            Ustunlar: <b>Familiya</b>, <b>Ism</b>, <b>Otasining ismi</b>, <b>Lavozimi</b>. Birinchi qator sarlavha bo'lishi mumkin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition hover:border-primary hover:bg-primary/5">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium">{file ? file.name : "Faylni tanlang (.xlsx, .xls)"}</span>
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="h-4 w-4 accent-primary" />
            Eski ro'yxatni o'chirib, yangisini yozish
          </label>
          <Button className="w-full" onClick={upload} disabled={uploading || !file}>
            {uploading ? <Loader2 className="animate-spin" /> : <Upload />} Yuklash
          </Button>
          <Button variant="link" className="h-auto w-full p-0 text-xs" asChild>
            <a href="/namuna.xlsx" download>Namuna Excel faylni yuklab olish</a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle>Tinglovchilar</CardTitle>
            <CardDescription>Jami: {list.length} ta</CardDescription>
          </div>
          {list.length > 0 && (
            <Button variant="outline" size="sm" onClick={removeAll} className="text-red-600"><Trash2 /> Hammasini o'chirish</Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qidirish..." className="pl-9" />
          </div>
          <div className="max-h-[600px] overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">№</TableHead>
                  <TableHead>Familiya</TableHead>
                  <TableHead>Ism</TableHead>
                  <TableHead className="hidden sm:table-cell">Otasining ismi</TableHead>
                  <TableHead className="hidden md:table-cell">Lavozimi</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Ro'yxat bo'sh</TableCell></TableRow>
                )}
                {shown.map((a, i) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{a.familiya}</TableCell>
                    <TableCell>{a.ism}</TableCell>
                    <TableCell className="hidden sm:table-cell">{a.otasiningIsmi}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{a.lavozim}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => remove(a.id)}><Trash2 className="text-red-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- IP sozlamalar ---------------- */
function SettingsTab() {
  const [ips, setIps] = useState("");
  const [title, setTitle] = useState("");
  const [currentIp, setCurrentIp] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      setIps((d.settings?.allowedIps || []).join("\n"));
      setTitle(d.settings?.title || "");
      setCurrentIp(d.currentIp || "");
    });
  }, []);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowedIps: ips.split(/[\n,]+/), title }),
    });
    setSaving(false);
    if (res.ok) toast.success("Saqlandi");
    else toast.error("Saqlab bo'lmadi");
  }

  function addMine() {
    const list = ips.split(/\n/).map((s) => s.trim()).filter(Boolean);
    if (!list.includes(currentIp)) list.push(currentIp);
    setIps(list.join("\n"));
  }

  const count = ips.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean).length;

  return (
    <div className="grid max-w-3xl gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Ruxsat etilgan IP manzillar</CardTitle>
          <CardDescription>
            Faqat shu IP'lardan kirganlar davomat sahifasini ocha oladi. Har bir qatorga bitta yozing.
            Diapazon uchun: <code className="rounded bg-muted px-1">192.168.1.*</code> yoki <code className="rounded bg-muted px-1">10.0.0.0/24</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted p-3 text-sm">
            <span>Sizning hozirgi IP: <b className="font-mono">{currentIp || "..."}</b></span>
            <Button size="sm" variant="outline" onClick={addMine} disabled={!currentIp}><Plus /> Ro'yxatga qo'shish</Button>
          </div>
          <Textarea rows={8} value={ips} onChange={(e) => setIps(e.target.value)} placeholder={"213.230.100.25\n192.168.1.*"} className="font-mono" />
          {count === 0 && (
            <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              ⚠️ Ro'yxat bo'sh — hozir sayt <b>hamma uchun ochiq</b>. Cheklash uchun kamida bitta IP qo'shing.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sahifa sarlavhasi</CardTitle>
          <CardDescription>Davomat sahifasining tepasida ko'rinadi</CardDescription>
        </CardHeader>
        <CardContent>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: Malaka oshirish kursi" />
        </CardContent>
      </Card>

      <div>
        <Button onClick={save} disabled={saving} size="lg">{saving && <Loader2 className="animate-spin" />} Saqlash</Button>
      </div>
    </div>
  );
}

/* ---------------- QR kod ---------------- */
function QrTab() {
  const [url, setUrl] = useState("");
  const [img, setImg] = useState("");

  useEffect(() => { setUrl(window.location.origin + "/"); }, []);
  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, { width: 600, margin: 2, color: { dark: "#0f172a", light: "#ffffff" } }).then(setImg).catch(() => setImg(""));
  }, [url]);

  function print() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>QR</title></head><body style="font-family:sans-serif;text-align:center;padding:40px">
      <h1 style="font-size:32px">Davomat uchun QR kodni skanerlang</h1>
      <img src="${img}" style="width:420px;height:420px" />
      <p style="font-size:18px;color:#555">${url}</p>
      <script>window.onload=()=>{window.print()}</script></body></html>`);
    w.document.close();
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>QR kod</CardTitle>
        <CardDescription>Tinglovchilar shu QR kodni telefon kamerasi bilan skanerlab, davomat sahifasiga kiradi</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Sayt manzili</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        {img && (
          <div className="flex justify-center rounded-xl border bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt="QR" className="h-64 w-64" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" disabled={!img}>
            <a href={img} download="davomat-qr.png"><Download /> PNG yuklab olish</a>
          </Button>
          <Button onClick={print} disabled={!img}><Printer /> Chop etish</Button>
        </div>
      </CardContent>
    </Card>
  );
}
