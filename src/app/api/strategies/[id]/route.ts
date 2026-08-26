import { error, isError, json, readJson, requireUser } from "@/lib/http";
import { removeStrategy, updateStrategy } from "@/lib/store";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  if (isError(user)) return user;
  const { id } = await params;
  const body = await readJson<{
    title?: string;
    description?: string;
    active?: boolean;
  }>(request);
  try {
    return json({
      strategy: updateStrategy(user.id, id, {
        title: body?.title?.trim().slice(0, 80),
        description: body?.description?.trim().slice(0, 280),
        active: body?.active,
      }),
    });
  } catch (err) {
    return error(err instanceof Error ? err.message : "Could not update strategy.");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  if (isError(user)) return user;
  const { id } = await params;
  try {
    removeStrategy(user.id, id);
    return json({ ok: true });
  } catch (err) {
    return error(err instanceof Error ? err.message : "Could not delete strategy.");
  }
}
