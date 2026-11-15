export const TZ = "Asia/Tashkent";

export function todayStr(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function timeStr(iso: string) {
  return new Intl.DateTimeFormat("uz-UZ", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
