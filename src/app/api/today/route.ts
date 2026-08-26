import { generateTasks } from "@/lib/ai";
import { addDaysKey, localDateFromRequest } from "@/lib/dates";
import { error, isError, json, readJson, requireUser } from "@/lib/http";
import {
  getHistory,
  listStrategies,
  lockDay,
  replaceTasks,
  setNote,
} from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser();
  if (isError(user)) return user;
  const today = localDateFromRequest(request);
  const body = await readJson<{ action?: string; note?: string }>(request);
  const action = body?.action;

  try {
    if (action === "note") {
      return json({ today: setNote(user.id, today, (body?.note ?? "").slice(0, 2000)) });
    }
    if (action === "lock") {
      return json({ today: lockDay(user.id, today, user.daily_task_goal) });
    }
    if (action === "generate") {
      const strategies = listStrategies(user.id);
      if (!strategies.some((s) => s.active)) {
        return error("Turn on at least one strategy first.");
      }
      const history = getHistory(user.id);
      const yesterday = history[addDaysKey(today, -1)];
      const drafts = await generateTasks({
        strategies,
        energy: user.energy,
        goals: user.goals,
        count: user.daily_task_goal,
        date: today,
        previousTitles: yesterday?.tasks.map((t) => t.title) ?? [],
      });
      return json({ today: replaceTasks(user.id, today, drafts) });
    }
    return error("Unknown action.");
  } catch (err) {
    return error(err instanceof Error ? err.message : "Could not update today.");
  }
}
