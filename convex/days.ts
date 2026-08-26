import { v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import {
  applyActiveRulesToDay,
  compileIntensity,
  computeStreak,
  dayFor,
  emptyDay,
  isDevUnlimited,
  lockedDates,
  requireUser,
  startOfCalendarMonth,
  toDayEntry,
  type Energy,
} from "./helpers";

function matchesStrategy(
  task: { title: string; detail: string },
  strategyTitle: string
) {
  const hay = `${task.title} ${task.detail}`.toLowerCase();
  const needle = strategyTitle.toLowerCase();
  if (hay.includes(needle)) return true;
  const words = needle.split(/\s+/).filter((w) => w.length > 4);
  return words.length > 0 && words.every((w) => hay.includes(w));
}

export const getGenerateContext = internalQuery({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const user = await requireUser(ctx);
    const strategies = await ctx.db
      .query("strategies")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .collect();
    const yesterdayKey = (() => {
      const [y, m, d] = date.split("-").map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      dt.setUTCDate(dt.getUTCDate() - 1);
      return dt.toISOString().slice(0, 10);
    })();
    const yesterday = await dayFor(ctx, user._id, yesterdayKey);
    const today = await dayFor(ctx, user._id, date);
    const standingRules = (
      await ctx.db
        .query("rules")
        .withIndex("userId", (q) => q.eq("userId", user._id))
        .collect()
    )
      .filter((r) => r.active)
      .map((r) => r.title);
    const monthStart = startOfCalendarMonth(date);
    const monthDays = (
      await ctx.db
        .query("days")
        .withIndex("userId_date", (q) => q.eq("userId", user._id))
        .collect()
    ).filter((d) => d.date >= monthStart && d.date <= date && d.date !== date);

    let monthDone = 0;
    let monthSkipped = 0;
    let monthPending = 0;
    const perStrategy = strategies.map((s) => ({
      title: s.title,
      done: 0,
      skipped: 0,
      pending: 0,
      recentSkips: [] as string[],
    }));

    for (const day of monthDays) {
      for (const task of day.tasks) {
        if (task.status === "done") monthDone += 1;
        else if (task.status === "skipped") monthSkipped += 1;
        else monthPending += 1;
        const hit = perStrategy.find((s) => matchesStrategy(task, s.title));
        if (!hit) continue;
        if (task.status === "done") hit.done += 1;
        else if (task.status === "skipped") {
          hit.skipped += 1;
          if (hit.recentSkips.length < 3) hit.recentSkips.push(task.title);
        } else hit.pending += 1;
      }
    }

    const monthLocked = monthDays.filter((d) => d.locked).length;
    const dates = await lockedDates(ctx, user._id);
    const streak = computeStreak(dates, date);
    const profileEnergy = (user.energy ?? "steady") as Energy;
    const compiled = compileIntensity(streak, monthDone, monthSkipped, profileEnergy);

    return {
      userId: user._id,
      energy: profileEnergy,
      intensity: compiled.intensity,
      intensityReason: compiled.reason,
      streak,
      goals: user.goals ?? "",
      count: user.dailyTaskGoal ?? 3,
      locked: today?.locked ?? false,
      strategies: strategies.map((s) => ({
        id: s._id,
        title: s.title,
        description: s.description,
        active: s.active,
      })),
      previousTitles: yesterday?.tasks.map((t) => t.title) ?? [],
      standingRules,
      generateCount: today?.generateCount ?? 0,
      month: {
        start: monthStart,
        lockedDays: monthLocked,
        done: monthDone,
        skipped: monthSkipped,
        pending: monthPending,
        perStrategy,
      },
    };
  },
});

export const replaceTasks = internalMutation({
  args: {
    date: v.string(),
    tasks: v.array(
      v.object({
        title: v.string(),
        detail: v.string(),
        minutes: v.number(),
      })
    ),
  },
  handler: async (ctx, { date, tasks }) => {
    const user = await requireUser(ctx);
    const existing = await dayFor(ctx, user._id, date);
    if (existing?.locked) throw new Error("Today is already locked in.");
    const mapped = tasks.map((t, i) => ({
      id: `${date}-${i}-${Date.now()}`,
      title: t.title,
      detail: t.detail,
      minutes: t.minutes,
      status: "pending" as const,
    }));
    const generateCount = (existing?.generateCount ?? 0) + 1;
    if (existing) {
      await ctx.db.patch(existing._id, { tasks: mapped, generateCount });
    } else {
      await ctx.db.insert("days", {
        userId: user._id,
        date,
        locked: false,
        note: "",
        tasks: mapped,
        rules: [],
        generateCount,
      });
    }
    await applyActiveRulesToDay(ctx, user._id, date);
  },
});

export const setNote = mutation({
  args: { date: v.string(), note: v.string() },
  handler: async (ctx, { date, note }) => {
    const user = await requireUser(ctx);
    const existing = await dayFor(ctx, user._id, date);
    if (existing) {
      await ctx.db.patch(existing._id, { note: note.slice(0, 2000) });
    } else {
      await ctx.db.insert("days", {
        userId: user._id,
        date,
        locked: false,
        note: note.slice(0, 2000),
        tasks: [],
        rules: [],
      });
      await applyActiveRulesToDay(ctx, user._id, date);
    }
  },
});

export const setTaskStatus = mutation({
  args: {
    date: v.string(),
    taskId: v.string(),
    status: v.union(v.literal("pending"), v.literal("done"), v.literal("skipped")),
  },
  handler: async (ctx, { date, taskId, status }) => {
    const user = await requireUser(ctx);
    const existing = await dayFor(ctx, user._id, date);
    if (!existing) throw new Error("Task not found.");
    if (existing.locked) throw new Error("Today is already locked in.");
    const tasks = existing.tasks.map((t) => (t.id === taskId ? { ...t, status } : t));
    if (!existing.tasks.some((t) => t.id === taskId)) throw new Error("Task not found.");
    await ctx.db.patch(existing._id, { tasks });
  },
});

export const setRuleStatus = mutation({
  args: {
    date: v.string(),
    ruleId: v.string(),
    status: v.union(v.literal("pending"), v.literal("done"), v.literal("skipped")),
  },
  handler: async (ctx, { date, ruleId, status }) => {
    const user = await requireUser(ctx);
    const existing = await applyActiveRulesToDay(ctx, user._id, date);
    if (!existing) throw new Error("Rule not found.");
    if (existing.locked) throw new Error("Today is already locked in.");
    const rules = (existing.rules ?? []).map((r) =>
      r.id === ruleId ? { ...r, status } : r
    );
    if (!(existing.rules ?? []).some((r) => r.id === ruleId)) {
      throw new Error("Rule not found.");
    }
    await ctx.db.patch(existing._id, { rules });
  },
});

export const syncRules = mutation({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const user = await requireUser(ctx);
    await applyActiveRulesToDay(ctx, user._id, date);
  },
});

export const lock = mutation({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const user = await requireUser(ctx);
    const existing = await dayFor(ctx, user._id, date);
    const day = toDayEntry(existing, date);
    const goal = user.dailyTaskGoal ?? 3;
    if (day.locked) throw new Error("Already locked in.");
    if (day.tasks.length < goal) {
      throw new Error(`Generate ${goal} tasks before locking in.`);
    }
    if (day.tasks.some((t) => t.status === "pending")) {
      throw new Error("Clear or skip every task first.");
    }
    await applyActiveRulesToDay(ctx, user._id, date);
    const fresh = await dayFor(ctx, user._id, date);
    const rules = fresh?.rules ?? [];
    if (rules.some((r) => r.status === "pending")) {
      throw new Error("Hold or skip every rule first.");
    }
    const toLock = fresh ?? existing;
    if (!toLock) throw new Error("Nothing to lock.");
    await ctx.db.patch(toLock._id, {
      locked: true,
      lockedAt: new Date().toISOString(),
    });
  },
});

export const unlock = mutation({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    if (!isDevUnlimited()) {
      throw new Error("Unlock is only available in development.");
    }
    const user = await requireUser(ctx);
    const existing = await dayFor(ctx, user._id, date);
    if (!existing) throw new Error("Nothing to unlock.");
    await ctx.db.patch(existing._id, { locked: false, lockedAt: undefined });
  },
});

export const ensureDay = mutation({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const user = await requireUser(ctx);
    const existing = await dayFor(ctx, user._id, date);
    return toDayEntry(existing, date) ?? emptyDay(date);
  },
});
