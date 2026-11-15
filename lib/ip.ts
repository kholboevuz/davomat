import type { NextRequest } from "next/server";

export function getClientIp(req: NextRequest | Request): string {
  const h = req.headers;
  const xff = h.get("x-forwarded-for");
  let ip = (xff ? xff.split(",")[0] : null) || h.get("x-real-ip") || h.get("cf-connecting-ip") || "";
  ip = ip.trim();
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (ip === "::1") ip = "127.0.0.1";
  return ip || "unknown";
}

/**
 * Qoidalar:
 *  - "192.168.1.10"  — aniq IP
 *  - "192.168.1.*"   — yulduzcha bilan diapazon
 *  - "10.0.0.0/24"   — CIDR (IPv4)
 * Ro'yxat bo'sh bo'lsa — hamma uchun ochiq.
 */
export function isIpAllowed(ip: string, rules: string[]): boolean {
  const list = rules.map((r) => r.trim()).filter(Boolean);
  if (list.length === 0) return true;
  return list.some((rule) => matchRule(ip, rule));
}

function ipToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

function matchRule(ip: string, rule: string): boolean {
  if (rule === ip) return true;
  if (rule.includes("*")) {
    const re = new RegExp("^" + rule.replace(/\./g, "\\.").replace(/\*/g, "\\d{1,3}") + "$");
    return re.test(ip);
  }
  if (rule.includes("/")) {
    const [base, bitsStr] = rule.split("/");
    const bits = Number(bitsStr);
    const a = ipToInt(ip);
    const b = ipToInt(base);
    if (a === null || b === null || !(bits >= 0 && bits <= 32)) return false;
    if (bits === 0) return true;
    const mask = (0xffffffff << (32 - bits)) >>> 0;
    return ((a & mask) >>> 0) === ((b & mask) >>> 0);
  }
  return false;
}
