import { error, isError, json, readJson, requireUser } from "@/lib/http";
import { toProfile, updateProfile } from "@/lib/store";
import type { EnergyLevel } from "@/lib/types";

export const runtime = "nodejs";

const ENERGIES = new Set<EnergyLevel>(["low", "steady", "high"]);

export async function PATCH(request: Request) {
  const user = await requireUser();
  if (isError(user)) return user;
  const body = await readJson<{
    name?: string;
    username?: string;
    goals?: string;
    energy?: EnergyLevel;
    dailyTaskGoal?: number;
    theme?: "dark" | "light";
    notifyEvening?: boolean;
    notifyStreakRisk?: boolean;
    notifyFriends?: boolean;
  }>(request);
  if (body?.energy && !ENERGIES.has(body.energy)) return error("Invalid energy.");
  if (body?.dailyTaskGoal != null) {
    const n = Number(body.dailyTaskGoal);
    if (!Number.isInteger(n) || n < 1 || n > 8) return error("Daily goal must be 1–8.");
    body.dailyTaskGoal = n;
  }
  if (body?.username) {
    const username = body.username.replace(/\s/g, "");
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return error("Username must be 3–20 letters, numbers, or underscores.");
    }
    body.username = username;
  }
  try {
    const updated = updateProfile(user.id, {
      ...body,
      name: body?.name?.trim().slice(0, 60),
      goals: body?.goals?.slice(0, 500),
    });
    return json({ profile: toProfile(updated) });
  } catch (err) {
    return error(err instanceof Error ? err.message : "Could not save profile.");
  }
}
