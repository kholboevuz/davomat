"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Search, ShieldX, CheckCircle2, UserCheck, Users, Loader2, X, ChevronRight, UserRoundPen, ArrowLeft, CalendarDays,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { normalize } from "@/lib/text";

type Item = { id: string; fullName: string; lavozim: string; status: "self" | "substitute" | null };
type MyRecord = { type: "self" | "substitute"; fullName: string; substituteName?: string; createdAt: string } | null;

type State =
  | { kind: "loading" }
  | { kind: "blocked"; ip: string }
  | { kind: "error"; message: string }
  | { kind: "ready"; title: string; date: string; items: Item[]; myRecord: MyRecord };

export default function AttendanceApp() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Item | null>(null);
  const [mode, setMode] = useState<"choose" | "substitute" | "done">("choose");
  const [subName, setSubName] = useState("");
  const [subPos, setSubPos] = useState("");
  const [saving, setSaving] = useState(false);
  const [doneText, setDoneText] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/attendees", { cache: "no-store" });
      const data = await res.json();
      if (res.status === 403) return setState({ kind: "blocked", ip: data.ip });
      if (!res.ok) return setState({ kind: "error", message: data.error || "Xatolik" });
      setState({ kind: "ready", title: data.title, date: data.date, items: data.attendees, myRecord: data.myRecord });
    } catch {
      setState({ kind: "error", message: "Serverga ulanib bo'lmadi" });
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (state.kind !== "ready") return [];
    const nq = normalize(q);
    if (!nq) return state.items;
    const words = nq.split(" ");
    return state.items.filter((i) => {
      const name = normalize(i.fullName);
      return words.every((w) => name.includes(w));
    });
  }, [state, q]);

  function openItem(item: Item) {
    if (state.kind !== "ready") return;
    if (state.myRecord) {
      toast.error("Siz bugun davomat qilib bo'lgansiz. Boshqa odamni belgilab bo'lmaydi.");
      return;
    }
    if (item.status) {
      toast.info("Bu tinglovchi bugun allaqachon belgilangan");
      return;
    }
    setSelected(item);
    setMode("choose");
    setSubName("");
    setSubPos("");
  }

  async function submit(type: "self" | "substitute") {
    if (!selected) return;
    if (type === "substitute") {
      if (subName.trim().split(/\s+/).length < 3) return toast.error("Familiya, ism va otasining ismini to'liq yozing");
      if (!subPos.trim()) return toast.error("Lavozimni yozing");
    }
    setSaving(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendeeId: selected.id, type, substituteName: subName, substitutePosition: subPos }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Saqlab bo'lmadi");
        if (res.status === 409) {
          setSelected(null);
          load();
        }
        return;
      }
      setDoneText(type === "self" ? "Davomatingiz saqlandi" : "O'rniga kelganingiz saqlandi");
      setMode("done");
      load();
    } finally {
      setSaving(false);
    }
  }

  if (state.kind === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (state.kind === "blocked" || state.kind === "error") {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <ShieldX className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold">Kirish cheklangan</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {state.kind === "blocked"
              ? "Davomat faqat o'quv xonasidagi tarmoq (Wi-Fi) orqali ishlaydi. Iltimos, belgilangan tarmoqqa ulaning."
              : state.message}
          </p>
          {state.kind === "blocked" && (
            <p className="mt-4 rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">IP: {state.ip}</p>
          )}
          <Button className="mt-6 w-full" variant="outline" onClick={() => { setState({ kind: "loading" }); load(); }}>
            Qayta urinish
          </Button>
        </div>
      </div>
    );
  }

  const total = state.items.length;
  const came = state.items.filter((i) => i.status).length;
  const dateLabel = new Date(state.date + "T00:00:00").toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-dvh pb-10">
      {/* Header + search (yopishqoq) */}
      <header className="sticky top-0 z-30 bg-gradient-to-b from-primary to-blue-500 pb-4 pt-5 text-white shadow-md">
        <div className="mx-auto max-w-2xl px-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold leading-tight">{state.title}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-white/80">
                <CalendarDays className="h-4 w-4" /> {dateLabel}
              </p>
            </div>
            <div className="rounded-xl bg-white/15 px-3 py-1.5 text-right backdrop-blur">
              <div className="text-lg font-bold leading-none">{came}/{total}</div>
              <div className="text-[11px] text-white/80">keldi</div>
            </div>
          </div>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Familiya yoki ism bo'yicha qidiring..."
              className="h-12 rounded-xl border-0 bg-white pl-11 pr-10 text-base text-foreground shadow-sm"
              autoComplete="off"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-4">
        {state.myRecord && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="text-sm">
              <div className="font-semibold">Bugungi davomatingiz saqlangan</div>
              <div className="mt-0.5">
                {state.myRecord.type === "self"
                  ? state.myRecord.fullName
                  : `${state.myRecord.substituteName} — ${state.myRecord.fullName} o'rniga`}
              </div>
            </div>
          </div>
        )}

        {total === 0 ? (
          <Empty text="Tinglovchilar ro'yxati hali yuklanmagan" />
        ) : filtered.length === 0 ? (
          <Empty text="Hech kim topilmadi. Boshqacha yozib ko'ring." />
        ) : (
          <>
            <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {q ? `Topildi: ${filtered.length}` : `Jami tinglovchilar: ${total}`}
            </p>
            <ul className="space-y-2">
              {filtered.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => openItem(item)}
                    className="flex w-full items-center gap-3 rounded-xl border bg-card p-3.5 text-left shadow-sm transition active:scale-[0.99] hover:border-primary/40 hover:shadow"
                  >
                    <Avatar name={item.fullName} done={!!item.status} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{item.fullName}</div>
                      <div className="truncate text-sm text-muted-foreground">{item.lavozim || "—"}</div>
                    </div>
                    {item.status === "self" ? (
                      <Badge variant="success">Keldi</Badge>
                    ) : item.status === "substitute" ? (
                      <Badge variant="warning">O'rniga</Badge>
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent onInteractOutside={(e) => saving && e.preventDefault()}>
          {selected && mode === "choose" && (
            <>
              <DialogHeader>
                <DialogTitle>Davomatni tasdiqlang</DialogTitle>
                <DialogDescription>Quyidagi tinglovchi uchun holatni tanlang</DialogDescription>
              </DialogHeader>
              <div className="rounded-xl bg-muted p-4">
                <div className="font-semibold">{selected.fullName}</div>
                <div className="text-sm text-muted-foreground">{selected.lavozim}</div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button size="lg" variant="success" disabled={saving} onClick={() => submit("self")}>
                  {saving ? <Loader2 className="animate-spin" /> : <UserCheck />} Darsga keldim
                </Button>
                <Button size="lg" variant="outline" disabled={saving} onClick={() => setMode("substitute")}>
                  <UserRoundPen /> O'rniga keldim
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Diqqat: bitta qurilmadan faqat bir kishi belgilanadi
              </p>
            </>
          )}

          {selected && mode === "substitute" && (
            <>
              <DialogHeader>
                <DialogTitle>O'rniga keldim</DialogTitle>
                <DialogDescription>
                  <span className="font-medium text-foreground">{selected.fullName}</span> o'rniga kelgan bo'lsangiz, o'z ma'lumotlaringizni kiriting
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subName">Familiya, ism, otasining ismi</Label>
                  <Input id="subName" value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="Masalan: Karimov Aziz Botirovich" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subPos">Lavozimi (to'liq)</Label>
                  <Input id="subPos" value={subPos} onChange={(e) => setSubPos(e.target.value)} placeholder="Masalan: Bo'lim boshlig'i o'rinbosari" className="h-11" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="lg" onClick={() => setMode("choose")} disabled={saving}>
                  <ArrowLeft /> Orqaga
                </Button>
                <Button size="lg" onClick={() => submit("substitute")} disabled={saving}>
                  {saving && <Loader2 className="animate-spin" />} Saqlash
                </Button>
              </div>
            </>
          )}

          {mode === "done" && (
            <div className="py-4 text-center">
              <DialogTitle className="sr-only">Saqlandi</DialogTitle>
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-11 w-11 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold">{doneText}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{selected?.fullName}</p>
              <Button className="mt-6 w-full" size="lg" onClick={() => setSelected(null)}>Yopish</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Avatar({ name, done }: { name: string; done: boolean }) {
  const initials = name.split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  return (
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
      {done ? <CheckCircle2 className="h-5 w-5" /> : initials}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="mt-10 flex flex-col items-center text-center text-muted-foreground">
      <Users className="mb-3 h-12 w-12 opacity-40" />
      <p>{text}</p>
    </div>
  );
}
