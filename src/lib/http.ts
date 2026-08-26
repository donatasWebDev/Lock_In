import { NextResponse } from "next/server";
import { readSessionUserId } from "@/lib/session";
import { getUserById } from "@/lib/store";
import type { UserRow } from "@/lib/store";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireUser(): Promise<UserRow | NextResponse> {
  const userId = await readSessionUserId();
  if (!userId) return error("Sign in first.", 401);
  const user = getUserById(userId);
  if (!user) return error("Account not found.", 401);
  return user;
}

export function isError(value: UserRow | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
