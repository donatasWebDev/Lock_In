import { v } from "convex/values";
import { query } from "./_generated/server";
import {
  addDaysKey,
  computeBestStreak,
  computeStreak,
  isDevUnlimited,
  lockedDates,
  optionalUser,
  profileOf,
  requireUser,
  sameMonth,
  toDayEntry,
} from "./helpers";
import { dayFor } from "./helpers";

export const get = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const user = await optionalUser(ctx);
    if (!user) return null;
    const strategies = (
      await ctx.db
        .query("strategies")
        .withIndex("userId", (q) => q.eq("userId", user._id))
        .collect()
    ).map((s) => ({
      id: s._id,
      title: s.title,
      description: s.description,
      active: s.active,
    }));

    const days = await ctx.db
      .query("days")
      .withIndex("userId_date", (q) => q.eq("userId", user._id))
      .collect();
    const history: Record<
      string,
      ReturnType<typeof toDayEntry>
    > = {};
    for (const day of days) history[day.date] = toDayEntry(day, day.date);
    if (!history[date]) history[date] = toDayEntry(null, date);

    const playbookRules = (
      await ctx.db
        .query("rules")
        .withIndex("userId", (q) => q.eq("userId", user._id))
        .collect()
    ).map((r) => ({
      id: r._id,
      title: r.title,
      description: r.description,
      active: r.active,
    }));

    const dates = await lockedDates(ctx, user._id);
    const weekStart = addDaysKey(date, -6);

    return {
      profile: profileOf(user),
      today: history[date],
      history,
      strategies,
      playbookRules,
      streak: computeStreak(dates, date),
      bestStreak: computeBestStreak(dates),
      weekCount: dates.filter((d) => d >= weekStart && d <= date).length,
      monthCount: dates.filter((d) => sameMonth(d, date)).length,
      totalDays: dates.length,
      unlimitedGenerate: isDevUnlimited(),
    };
  },
});

export const today = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const user = await requireUser(ctx);
    return toDayEntry(await dayFor(ctx, user._id, date), date);
  },
});
