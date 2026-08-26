import { json } from "@/lib/http";
import { clearSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  await clearSessionCookie();
  return json({ ok: true });
}
