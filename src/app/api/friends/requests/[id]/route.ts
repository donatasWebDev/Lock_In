import { error, isError, json, readJson, requireUser } from "@/lib/http";
import { resolveRequest } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  if (isError(user)) return user;
  const { id } = await params;
  const body = await readJson<{ accept?: boolean }>(request);
  try {
    resolveRequest(user.id, id, Boolean(body?.accept));
    return json({ ok: true });
  } catch (err) {
    return error(err instanceof Error ? err.message : "Could not update request.");
  }
}
