import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { profileOf, requireUser } from "./helpers";

export const usernameTaken = internalQuery({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const row = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", username))
      .unique();
    return Boolean(row);
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return profileOf(user);
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    username: v.optional(v.string()),
    goals: v.optional(v.string()),
    energy: v.optional(v.union(v.literal("low"), v.literal("steady"), v.literal("high"))),
    dailyTaskGoal: v.optional(v.number()),
    theme: v.optional(v.union(v.literal("dark"), v.literal("light"))),
    notifyEvening: v.optional(v.boolean()),
    notifyStreakRisk: v.optional(v.boolean()),
    notifyFriends: v.optional(v.boolean()),
    showRulesToFriends: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.username && args.username !== user.username) {
      throw new Error("Username is your login id and can't be changed.");
    }
    if (args.dailyTaskGoal != null && (args.dailyTaskGoal < 1 || args.dailyTaskGoal > 8)) {
      throw new Error("Daily goal must be 1–8.");
    }
    await ctx.db.patch(user._id, {
      name: args.name !== undefined ? args.name.trim().slice(0, 60) : user.name,
      username: args.username ?? user.username,
      goals: args.goals !== undefined ? args.goals.slice(0, 500) : user.goals,
      energy: args.energy ?? user.energy,
      dailyTaskGoal: args.dailyTaskGoal ?? user.dailyTaskGoal,
      theme: args.theme ?? user.theme,
      notifyEvening: args.notifyEvening ?? user.notifyEvening,
      notifyStreakRisk: args.notifyStreakRisk ?? user.notifyStreakRisk,
      notifyFriends: args.notifyFriends ?? user.notifyFriends,
      showRulesToFriends: args.showRulesToFriends ?? user.showRulesToFriends,
    });
    return profileOf((await ctx.db.get(user._id))!);
  },
});
