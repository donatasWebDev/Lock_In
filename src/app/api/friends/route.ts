import { error, isError, json, readJson, requireUser } from "@/lib/http";
import {
  getUserById,
  getUserByInviteCode,
  getUserByUsername,
  listFriends,
  listRequests,
  listSuggested,
  searchPeople,
  sendFriendRequest,
} from "@/lib/store";
import { localDateFromRequest } from "@/lib/dates";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await requireUser();
  if (isError(user)) return user;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length >= 2) {
    return json({ people: searchPeople(user.id, q) });
  }
  const today = localDateFromRequest(request);
  return json({
    friends: listFriends(user.id, today),
    requests: listRequests(user.id),
    suggested: listSuggested(user.id),
  });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (isError(user)) return user;
  const body = await readJson<{ username?: string; inviteCode?: string; userId?: string }>(
    request
  );
  const target =
    (body?.userId ? getUserById(body.userId) : null) ??
    (body?.inviteCode ? getUserByInviteCode(body.inviteCode) : null) ??
    (body?.username ? getUserByUsername(body.username.replace(/^@/, "")) : null);
  if (!target) return error("Nobody found with that username or code.");
  try {
    const result = sendFriendRequest(user.id, target);
    return json(result);
  } catch (err) {
    return error(err instanceof Error ? err.message : "Could not send request.");
  }
}
