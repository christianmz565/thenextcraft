import { mutation, query } from "@backend/convex/_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.image !== undefined) patch.image = args.image;
    if (Object.keys(patch).length === 0) return await ctx.db.get(userId);
    await ctx.db.patch(userId, patch);
    return await ctx.db.get(userId);
  },
});

export const deleteCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.delete(userId);
    // Note: authAccounts/authSessions for this user remain; no cascade.
    // Orphaned sessions will expire; add internal mutation to clean them if needed.
  },
});
