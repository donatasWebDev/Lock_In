import { error, isError, json, readJson, requireUser } from "@/lib/http";
import { addStrategy } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser();
  if (isError(user)) return user;
  const body = await readJson<{ title?: string; description?: string }>(request);
  const title = body?.title?.trim() ?? "";
  const description = body?.description?.trim() ?? "";
  if (!title) return error("Give the strategy a title.");
  try {
    return json({ strategy: addStrategy(user.id, title.slice(0, 80), description.slice(0, 280)) });
  } catch (err) {
    return error(err instanceof Error ? err.message : "Could not add strategy.");
  }
}
