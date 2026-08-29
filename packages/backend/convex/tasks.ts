import { mutation, query } from "@backend/convex/_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const listOpen = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db
      .query("tasks")
      .withIndex("by_user_completed", (q) => q.eq("userId", userId).eq("completed", false))
      .collect();
  },
});

export const create = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const text = args.text.trim();
    if (text.length === 0) throw new Error("text must not be empty");
    return await ctx.db.insert("tasks", { text, completed: false, userId });
  },
});

export const setCompleted = mutation({
  args: { id: v.id("tasks"), completed: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new Error("Task not found");
    if (doc.userId !== userId) throw new Error("Unauthorized");
    await ctx.db.patch(args.id, { completed: args.completed });
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new Error("Task not found");
    if (doc.userId !== userId) throw new Error("Unauthorized");
    await ctx.db.delete(args.id);
  },
});
