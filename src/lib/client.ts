import { format } from "date-fns";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("X-Local-Date", format(new Date(), "yyyy-MM-dd"));
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(path, { ...init, headers });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    window.location.href = "/login";
    throw new ApiError("Sign in first.", 401);
  }
  if (!res.ok) {
    throw new ApiError(data.error || "Request failed.", res.status);
  }
  return data;
}
