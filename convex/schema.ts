import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const taskValidator = v.object({
  id: v.string(),
  title: v.string(),
  detail: v.string(),
  minutes: v.number(),
  status: v.union(v.literal("pending"), v.literal("done"), v.literal("skipped")),
});

const ruleOnDayValidator = v.object({
  id: v.string(),
  title: v.string(),
  status: v.union(v.literal("pending"), v.literal("done"), v.literal("skipped")),
});

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    username: v.optional(v.string()),
    goals: v.optional(v.string()),
    energy: v.optional(v.union(v.literal("low"), v.literal("steady"), v.literal("high"))),
    dailyTaskGoal: v.optional(v.number()),
    theme: v.optional(v.union(v.literal("dark"), v.literal("light"))),
    notifyEvening: v.optional(v.boolean()),
    notifyStreakRisk: v.optional(v.boolean()),
    notifyFriends: v.optional(v.boolean()),
    inviteCode: v.optional(v.string()),
    showRulesToFriends: v.optional(v.boolean()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("username", ["username"])
    .index("inviteCode", ["inviteCode"]),

  strategies: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.string(),
    active: v.boolean(),
  }).index("userId", ["userId"]),

  rules: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.string(),
    active: v.boolean(),
  }).index("userId", ["userId"]),

  days: defineTable({
    userId: v.id("users"),
    date: v.string(),
    locked: v.boolean(),
    lockedAt: v.optional(v.string()),
    note: v.string(),
    tasks: v.array(taskValidator),
    rules: v.optional(v.array(ruleOnDayValidator)),
    generateCount: v.optional(v.number()),
  })
    .index("userId_date", ["userId", "date"])
    .index("userId_locked", ["userId", "locked"]),

  friendships: defineTable({
    requesterId: v.id("users"),
    addresseeId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("accepted")),
  })
    .index("requesterId", ["requesterId"])
    .index("addresseeId", ["addresseeId"])
    .index("pair", ["requesterId", "addresseeId"]),
});
