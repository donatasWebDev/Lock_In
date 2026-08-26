import { localDateFromRequest } from "@/lib/dates";
import { error, isError, json, readJson, requireUser } from "@/lib/http";
import { setTaskStatus } from "@/lib/store";
import type { TaskStatus } from "@/lib/types";

export const runtime = "nodejs";

const STATUSES = new Set<TaskStatus>(["pending", "done", "skipped"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  if (isError(user)) return user;
  const { id } = await params;
  const body = await readJson<{ status?: TaskStatus }>(request);
  if (!body?.status || !STATUSES.has(body.status)) return error("Invalid status.");
  try {
    return json({
      today: setTaskStatus(user.id, id, body.status, localDateFromRequest(request)),
    });
  } catch (err) {
    return error(err instanceof Error ? err.message : "Could not update task.");
  }
}
