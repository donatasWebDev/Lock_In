import { error, json, readJson } from "@/lib/http";
import { setSessionCookie } from "@/lib/session";
import { getUserByEmail, verifyPassword } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await readJson<{ email?: string; password?: string }>(request);
  const email = body?.email?.trim() ?? "";
  const password = body?.password ?? "";
  const user = getUserByEmail(email);
  if (!user || !verifyPassword(user, password)) {
    return error("Email or password is wrong.", 401);
  }
  await setSessionCookie(user.id);
  return json({ ok: true });
}
