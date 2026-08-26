import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

export type Energy = "low" | "steady" | "high";

export function addDaysKey(dateKey: string, amount: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + amount);
  return dt.toISOString().slice(0, 10);
}

export function startOfCalendarMonth(dateKey: string): string {
  return `${dateKey.slice(0, 7)}-01`;
}

export function sameMonth(a: string, b: string) {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function inviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "LOCKIN-";
  for (let i = 0; i < 4; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export function computeStreak(dates: string[], today: string): number {
  const set = new Set(dates);
  let cursor = set.has(today) ? today : addDaysKey(today, -1);
  let n = 0;
  while (set.has(cursor)) {
    n += 1;
    cursor = addDaysKey(cursor, -1);
  }
  return n;
}

export function computeBestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === addDaysKey(sorted[i - 1], 1)) {
      run += 1;
      best = Math.max(best, run);
    } else run = 1;
  }
  return best;
}

export async function optionalUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return await ctx.db.get(userId);
}

export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const user = await optionalUser(ctx);
  if (!user) throw new Error("Sign in first.");
  return user;
}

export function profileOf(user: Doc<"users">) {
  return {
    name: user.name ?? "You",
    username: user.username ?? "user",
    email: user.username ?? user.email ?? "",
    goals: user.goals ?? "",
    energy: (user.energy ?? "steady") as Energy,
    dailyTaskGoal: user.dailyTaskGoal ?? 3,
    theme: (user.theme ?? "dark") as "dark" | "light",
    notifyEvening: user.notifyEvening ?? true,
    notifyStreakRisk: user.notifyStreakRisk ?? true,
    notifyFriends: user.notifyFriends ?? false,
    inviteCode: user.inviteCode ?? "",
    showRulesToFriends: user.showRulesToFriends ?? true,
  };
}

export async function lockedDates(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  const days = await ctx.db
    .query("days")
    .withIndex("userId_locked", (q) => q.eq("userId", userId).eq("locked", true))
    .collect();
  return days.map((d) => d.date).sort();
}

export async function dayFor(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  date: string
) {
  return await ctx.db
    .query("days")
    .withIndex("userId_date", (q) => q.eq("userId", userId).eq("date", date))
    .unique();
}

export type RuleOnDay = {
  id: string;
  title: string;
  status: "pending" | "done" | "skipped";
};

export function emptyDay(date: string) {
  return {
    date,
    locked: false,
    lockedAt: null as string | null,
    note: "",
    tasks: [] as {
      id: string;
      title: string;
      detail: string;
      minutes: number;
      status: "pending" | "done" | "skipped";
    }[],
    rules: [] as RuleOnDay[],
    generateCount: 0,
  };
}

export function toDayEntry(
  day:
    | {
        date: string;
        locked: boolean;
        lockedAt?: string;
        note: string;
        tasks: {
          id: string;
          title: string;
          detail: string;
          minutes: number;
          status: "pending" | "done" | "skipped";
        }[];
        rules?: RuleOnDay[];
        generateCount?: number;
      }
    | null,
  date: string
) {
  if (!day) return emptyDay(date);
  return {
    date: day.date,
    locked: day.locked,
    lockedAt: day.lockedAt ?? null,
    note: day.note,
    tasks: day.tasks,
    rules: day.rules ?? [],
    generateCount: day.generateCount ?? 0,
  };
}

export async function applyActiveRulesToDay(
  ctx: MutationCtx,
  userId: Id<"users">,
  date: string
) {
  const day = await dayFor(ctx, userId, date);
  if (day?.locked) return day;
  const catalog = await ctx.db
    .query("rules")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .collect();
  const active = catalog.filter((r) => r.active);
  const prev = day?.rules ?? [];
  const next: RuleOnDay[] = active.map((r) => {
    const old = prev.find((p) => p.id === r._id);
    return { id: r._id, title: r.title, status: old?.status ?? "pending" };
  });
  if (day) {
    await ctx.db.patch(day._id, { rules: next });
    return await ctx.db.get(day._id);
  }
  const id = await ctx.db.insert("days", {
    userId,
    date,
    locked: false,
    note: "",
    tasks: [],
    rules: next,
  });
  return await ctx.db.get(id);
}

export const RULE_STARTERS = [
  { title: "No alcohol", description: "None today. Plan the evening so it stays true." },
  { title: "No smoking", description: "Not a puff. If the urge hits, walk it off." },
  { title: "No social media", description: "Apps off or deleted from the home screen today." },
  { title: "No fast food", description: "Cook or simple food. Drive-through is a skip." },
] as const;

export const STARTERS = [
  {
    title: "Morning deep work",
    description: "90 minutes on the hardest thing before email, chat, or news.",
    active: true,
  },
  {
    title: "Train six days",
    description: "Lift or run. Rest day is scheduled, not negotiated in the moment.",
    active: true,
  },
  {
    title: "Write every day",
    description: "500 rough words. Editing does not count as writing.",
    active: true,
  },
  {
    title: "No phone before 10am",
    description: "Phone charges outside the bedroom. First hour stays quiet.",
    active: false,
  },
] as const;

export const ENERGY_MINUTES = { low: 20, steady: 45, high: 75 } as const;
export const GENERATE_DAILY_LIMIT = 3;

export function isDevUnlimited() {
  return process.env.DEV_UNLIMITED_GENERATE === "true";
}

/** Streak + this month's done/skip rate, then cap with today's energy setting. */
export function compileIntensity(
  streak: number,
  done: number,
  skipped: number,
  profileEnergy: Energy
): { intensity: Energy; reason: string } {
  const handled = done + skipped;
  const rate = handled === 0 ? null : done / handled;
  let score = 0;
  if (rate === null) {
    // No month data: streak only.
    if (streak >= 7) score += 1;
    else if (streak <= 1) score -= 1;
  } else {
    if (rate >= 0.75) score += 1;
    else if (rate < 0.45) score -= 1;
    if (streak >= 7) score += 1;
    else if (streak <= 1) score -= 1;
  }
  let derived: Energy = "steady";
  if (score >= 1) derived = "high";
  else if (score <= -1) derived = "low";

  // Today's energy setting is a cap, not a booster past the data.
  let intensity: Energy = derived;
  if (profileEnergy === "low") intensity = "low";
  else if (profileEnergy === "high" && derived === "low") intensity = "steady";
  else if (profileEnergy === "high" && derived === "steady") intensity = "high";

  const rateText =
    rate === null ? "no month data" : `${Math.round(rate * 100)}% done (${done} / ${skipped} skipped)`;
  const reason = `streak ${streak}, ${rateText}, setting ${profileEnergy} → ${intensity}`;
  return { intensity, reason };
}
