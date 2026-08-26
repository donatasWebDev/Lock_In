import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { applyActiveRulesToDay, requireUser } from "./helpers";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return (
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
  },
});

export const add = mutation({
  args: { title: v.string(), description: v.string(), date: v.string() },
  handler: async (ctx, { title, description, date }) => {
    const user = await requireUser(ctx);
    const trimmed = title.trim();
    if (!trimmed) throw new Error("Give the rule a title.");
    await ctx.db.insert("rules", {
      userId: user._id,
      title: trimmed.slice(0, 80),
      description: description.trim().slice(0, 280),
      active: true,
    });
    await applyActiveRulesToDay(ctx, user._id, date);
  },
});

export const update = mutation({
  args: {
    id: v.id("rules"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    active: v.optional(v.boolean()),
    date: v.string(),
  },
  handler: async (ctx, { id, title, description, active, date }) => {
    const user = await requireUser(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== user._id) throw new Error("Rule not found.");
    await ctx.db.patch(id, {
      title: title !== undefined ? title.trim().slice(0, 80) : row.title,
      description:
        description !== undefined ? description.trim().slice(0, 280) : row.description,
      active: active ?? row.active,
    });
    await applyActiveRulesToDay(ctx, user._id, date);
  },
});

export const remove = mutation({
  args: { id: v.id("rules"), date: v.string() },
  handler: async (ctx, { id, date }) => {
    const user = await requireUser(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== user._id) throw new Error("Rule not found.");
    await ctx.db.delete(id);
    await applyActiveRulesToDay(ctx, user._id, date);
  },
});
