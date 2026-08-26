import { localDateFromRequest } from "@/lib/dates";
import { error, isError, json, requireUser } from "@/lib/http";
import { leaderboard } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await requireUser();
  if (isError(user)) return user;
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") ?? "week";
  const scope = searchParams.get("scope") ?? "global";
  if (range !== "week" && range !== "month" && range !== "all") {
    return error("Invalid range.");
  }
  if (scope !== "global" && scope !== "friends") return error("Invalid scope.");
  return json({
    rows: leaderboard(user.id, localDateFromRequest(request), range, scope),
  });
}
