import { error, isError, json, requireUser } from "@/lib/http";
import { localDateFromRequest } from "@/lib/dates";
import { loadSnapshot } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await requireUser();
  if (isError(user)) return user;
  try {
    return json(loadSnapshot(user, localDateFromRequest(request)));
  } catch (err) {
    return error(err instanceof Error ? err.message : "Could not load state.", 500);
  }
}
