import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  addDaysKey,
  computeStreak,
  lockedDates,
  requireUser,
  startOfCalendarMonth,
} from "./helpers";

export const get = query({
  args: {
    date: v.string(),
    range: v.union(v.literal("week"), v.literal("month"), v.literal("all")),
    scope: v.union(v.literal("global"), v.literal("friends")),
  },
  handler: async (ctx, { date, range, scope }) => {
    const viewer = await requireUser(ctx);
    const start =
      range === "week"
        ? addDaysKey(date, -6)
        : range === "month"
          ? startOfCalendarMonth(date)
          : "0000-01-01";

    const friendSet = new Set<string>();
    const req = await ctx.db
      .query("friendships")
      .withIndex("requesterId", (q) => q.eq("requesterId", viewer._id))
      .collect();
    const add = await ctx.db
      .query("friendships")
      .withIndex("addresseeId", (q) => q.eq("addresseeId", viewer._id))
      .collect();
    for (const row of [...req, ...add]) {
      if (row.status !== "accepted") continue;
      friendSet.add(row.requesterId === viewer._id ? row.addresseeId : row.requesterId);
    }

    const allowed =
      scope === "friends" ? new Set<string>([viewer._id, ...friendSet]) : null;

    const tally = new Map<
      string,
      { days: number; tasks: number }
    >();
    for await (const day of ctx.db.query("days")) {
      if (!day.locked || day.date < start || day.date > date) continue;
      if (allowed && !allowed.has(day.userId)) continue;
      const cur = tally.get(day.userId) ?? { days: 0, tasks: 0 };
      cur.days += 1;
      cur.tasks += day.tasks.filter((t) => t.status === "done").length;
      tally.set(day.userId, cur);
    }

    if (!tally.has(viewer._id)) tally.set(viewer._id, { days: 0, tasks: 0 });

    const rows = [];
    for (const [userId, stats] of tally) {
      const user = await ctx.db.get(userId as Id<"users">);
      if (!user) continue;
      const dates = await lockedDates(ctx, user._id);
      rows.push({
        id: user._id as string,
        name: user.name ?? user.username ?? "Someone",
        username: user.username ?? "user",
        days: stats.days,
        streak: computeStreak(dates, date),
        tasks: stats.tasks,
        isYou: user._id === viewer._id,
        isFriend: friendSet.has(user._id),
      });
    }
    rows.sort((a, b) => b.days - a.days || b.tasks - a.tasks);
    return rows.slice(0, 50);
  },
});
