import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  computeStreak,
  dayFor,
  lockedDates,
  requireUser,
  sameMonth,
} from "./helpers";
import type { MutationCtx, QueryCtx } from "./_generated/server";

async function friendIds(ctx: QueryCtx, userId: Id<"users">) {
  const out: Id<"users">[] = [];
  const a = await ctx.db
    .query("friendships")
    .withIndex("requesterId", (q) => q.eq("requesterId", userId))
    .collect();
  const b = await ctx.db
    .query("friendships")
    .withIndex("addresseeId", (q) => q.eq("addresseeId", userId))
    .collect();
  for (const row of [...a, ...b]) {
    if (row.status !== "accepted") continue;
    out.push(row.requesterId === userId ? row.addresseeId : row.requesterId);
  }
  return out;
}

async function mutuals(ctx: QueryCtx, a: Id<"users">, b: Id<"users">) {
  const mine = new Set((await friendIds(ctx, a)).map((id) => id as string));
  return (await friendIds(ctx, b)).filter((id) => mine.has(id)).length;
}

async function friendCard(ctx: QueryCtx, userId: Id<"users">, today: string) {
  const user = await ctx.db.get(userId);
  if (!user) return null;
  const dates = await lockedDates(ctx, userId);
  const day = await dayFor(ctx, userId, today);
  const lockedDays = await ctx.db
    .query("days")
    .withIndex("userId_locked", (q) => q.eq("userId", userId).eq("locked", true))
    .collect();
  const lastNote =
    lockedDays
      .filter((d) => d.note)
      .sort((x, y) => y.date.localeCompare(x.date))[0]?.note ?? "";
  return {
    id: user._id,
    name: user.name ?? user.username ?? "Friend",
    username: user.username ?? "user",
    streak: computeStreak(dates, today),
    lockedToday: day?.locked ?? false,
    daysThisMonth: dates.filter((d) => sameMonth(d, today)).length,
    lastNote,
    todayTasks: (day?.tasks ?? []).map((t) => ({ title: t.title, status: t.status })),
    todayRules:
      user.showRulesToFriends === false
        ? []
        : (day?.rules ?? []).map((r) => ({ title: r.title, status: r.status })),
    showRules: user.showRulesToFriends !== false,
  };
}

export const list = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const user = await requireUser(ctx);
    const ids = await friendIds(ctx, user._id);
    const friends = [];
    for (const id of ids) {
      const card = await friendCard(ctx, id, date);
      if (card) friends.push(card);
    }
    friends.sort(
      (a, b) => Number(b.lockedToday) - Number(a.lockedToday) || b.streak - a.streak
    );
    return friends;
  },
});

export const requests = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const rows = await ctx.db
      .query("friendships")
      .withIndex("addresseeId", (q) => q.eq("addresseeId", user._id))
      .collect();
    const pending = rows.filter((r) => r.status === "pending");
    const out = [];
    for (const row of pending) {
      const other = await ctx.db.get(row.requesterId);
      if (!other) continue;
      out.push({
        id: row._id,
        name: other.name ?? other.username ?? "Someone",
        username: other.username ?? "user",
        mutuals: await mutuals(ctx, user._id, other._id),
      });
    }
    return out;
  },
});

export const suggested = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const blocked = new Set<string>([user._id]);
    const related = [
      ...(await ctx.db
        .query("friendships")
        .withIndex("requesterId", (q) => q.eq("requesterId", user._id))
        .collect()),
      ...(await ctx.db
        .query("friendships")
        .withIndex("addresseeId", (q) => q.eq("addresseeId", user._id))
        .collect()),
    ];
    for (const row of related) {
      blocked.add(row.requesterId);
      blocked.add(row.addresseeId);
    }
    const people = [];
    for await (const other of ctx.db.query("users")) {
      if (blocked.has(other._id)) continue;
      people.push({
        id: other._id,
        name: other.name ?? other.username ?? "Someone",
        username: other.username ?? "user",
        mutuals: await mutuals(ctx, user._id, other._id),
      });
      if (people.length >= 6) break;
    }
    return people;
  },
});

export const search = query({
  args: { q: v.string() },
  handler: async (ctx, { q }) => {
    const user = await requireUser(ctx);
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    const people = [];
    for await (const other of ctx.db.query("users")) {
      if (other._id === user._id) continue;
      const name = (other.name ?? "").toLowerCase();
      const username = (other.username ?? "").toLowerCase();
      const code = (other.inviteCode ?? "").toLowerCase();
      if (!name.includes(needle) && !username.includes(needle) && !code.includes(needle)) {
        continue;
      }
      people.push({
        id: other._id,
        name: other.name ?? other.username ?? "Someone",
        username: other.username ?? "user",
        mutuals: await mutuals(ctx, user._id, other._id),
      });
      if (people.length >= 8) break;
    }
    return people;
  },
});

async function existingPair(
  ctx: QueryCtx | MutationCtx,
  a: Id<"users">,
  b: Id<"users">
) {
  return (
    (await ctx.db
      .query("friendships")
      .withIndex("pair", (q) => q.eq("requesterId", a).eq("addresseeId", b))
      .unique()) ??
    (await ctx.db
      .query("friendships")
      .withIndex("pair", (q) => q.eq("requesterId", b).eq("addresseeId", a))
      .unique())
  );
}

export const sendRequest = mutation({
  args: {
    userId: v.optional(v.id("users")),
    username: v.optional(v.string()),
    inviteCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    let target = args.userId ? await ctx.db.get(args.userId) : null;
    if (!target && args.inviteCode) {
      target = await ctx.db
        .query("users")
        .withIndex("inviteCode", (q) =>
          q.eq("inviteCode", args.inviteCode!.trim().toUpperCase())
        )
        .unique();
    }
    if (!target && args.username) {
      target = await ctx.db
        .query("users")
        .withIndex("username", (q) =>
          q.eq("username", args.username!.replace(/^@/, "").trim())
        )
        .unique();
    }
    if (!target) throw new Error("Nobody found with that username or code.");
    if (target._id === user._id) throw new Error("You cannot add yourself.");
    const existing = await existingPair(ctx, user._id, target._id);
    if (existing?.status === "accepted") throw new Error("Already friends.");
    if (existing?.requesterId === user._id && existing.status === "pending") {
      throw new Error("Request already sent.");
    }
    if (existing?.addresseeId === user._id && existing.status === "pending") {
      await ctx.db.patch(existing._id, { status: "accepted" });
      return { accepted: true };
    }
    await ctx.db.insert("friendships", {
      requesterId: user._id,
      addresseeId: target._id,
      status: "pending",
    });
    return { accepted: false };
  },
});

export const resolveRequest = mutation({
  args: { id: v.id("friendships"), accept: v.boolean() },
  handler: async (ctx, { id, accept }) => {
    const user = await requireUser(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.addresseeId !== user._id || row.status !== "pending") {
      throw new Error("Request not found.");
    }
    if (accept) await ctx.db.patch(id, { status: "accepted" });
    else await ctx.db.delete(id);
  },
});
