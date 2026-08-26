import { error, json, readJson } from "@/lib/http";
import { setSessionCookie } from "@/lib/session";
import { createUser, getUserByEmail, getUserByUsername } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await readJson<{
    name?: string;
    username?: string;
    email?: string;
    password?: string;
  }>(request);
  const name = body?.name?.trim() ?? "";
  const username = (body?.username ?? "").trim().replace(/\s/g, "");
  const email = body?.email?.trim() ?? "";
  const password = body?.password ?? "";

  if (name.length < 2) return error("Name needs at least 2 characters.");
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return error("Username must be 3–20 letters, numbers, or underscores.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error("Enter a valid email.");
  if (password.length < 8) return error("Password must be at least 8 characters.");
  if (getUserByEmail(email)) return error("That email is already in use.");
  if (getUserByUsername(username)) return error("That username is taken.");

  const user = createUser({ name, username, email, password });
  await setSessionCookie(user.id);
  return json({ ok: true });
}
