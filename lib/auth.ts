import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "admin_session";

function password() {
  return process.env.ADMIN_PASSWORD || "admin123";
}
function secret() {
  return process.env.SESSION_SECRET || "davomat-secret-change-me";
}

export function sessionToken() {
  return createHash("sha256").update(password() + ":" + secret()).digest("hex");
}

export function checkPassword(input: string) {
  const a = Buffer.from(createHash("sha256").update(input).digest("hex"));
  const b = Buffer.from(createHash("sha256").update(password()).digest("hex"));
  return timingSafeEqual(a, b);
}

export async function isAdmin() {
  const c = await cookies();
  return c.get(ADMIN_COOKIE)?.value === sessionToken();
}
