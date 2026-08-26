import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./helpers";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query("strategies")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const add = mutation({
  args: { title: v.string(), description: v.string() },
  handler: async (ctx, { title, description }) => {
    const user = await requireUser(ctx);
    const trimmed = title.trim();
    if (!trimmed) throw new Error("Give the strategy a title.");
    return await ctx.db.insert("strategies", {
      userId: user._id,
      title: trimmed.slice(0, 80),
      description: description.trim().slice(0, 280),
      active: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("strategies"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, title, description, active }) => {
    const user = await requireUser(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== user._id) throw new Error("Strategy not found.");
    await ctx.db.patch(id, {
      title: title !== undefined ? title.trim().slice(0, 80) : row.title,
      description:
        description !== undefined ? description.trim().slice(0, 280) : row.description,
      active: active ?? row.active,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("strategies") },
  handler: async (ctx, { id }) => {
    const user = await requireUser(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== user._id) throw new Error("Strategy not found.");
    await ctx.db.delete(id);
  },
});
