import { internalMutation, mutation, query } from "@backend/convex/_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

const modelVersion =
  "chenxwh/depth-anything-v2:b239ea33cff32bb7abb5db39ffe9a09c14cbc2894331d1ef66fe096eed88ebd4";

const storageId = v.id("_storage");

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const jobs = await ctx.db
      .query("depthMaps")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return await Promise.all(
      jobs.map(async (job) => ({
        ...job,
        depthUrl: job.depthStorageId ? await ctx.storage.getUrl(job.depthStorageId) : null,
      })),
    );
  },
});

export const registerUpload = mutation({
  args: { storageId, kind: v.union(v.literal("object"), v.literal("scene")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (!(await ctx.storage.getMetadata(args.storageId))) {
      throw new Error("Uploaded image not found");
    }

    return await ctx.db.insert("userFiles", {
      userId,
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const get = query({
  args: { id: v.id("depthMaps") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const job = await ctx.db.get(args.id);
    if (!job || job.userId !== userId) throw new Error("Depth map not found");

    return {
      ...job,
      depthUrl: job.depthStorageId ? await ctx.storage.getUrl(job.depthStorageId) : null,
    };
  },
});

export const create = internalMutation({
  args: {
    userId: v.id("users"),
    objectStorageId: storageId,
    sceneStorageId: storageId,
  },
  handler: async (ctx, args) => {
    const [objectFile, sceneFile] = await Promise.all([
      ctx.storage.getMetadata(args.objectStorageId),
      ctx.storage.getMetadata(args.sceneStorageId),
    ]);

    if (!objectFile || !sceneFile) throw new Error("Uploaded image not found");

    const [objectOwnership, sceneOwnership] = await Promise.all([
      ctx.db
        .query("userFiles")
        .withIndex("by_user_storage", (q) =>
          q.eq("userId", args.userId).eq("storageId", args.objectStorageId),
        )
        .first(),
      ctx.db
        .query("userFiles")
        .withIndex("by_user_storage", (q) =>
          q.eq("userId", args.userId).eq("storageId", args.sceneStorageId),
        )
        .first(),
    ]);

    if (objectOwnership?.kind !== "object" || sceneOwnership?.kind !== "scene") {
      throw new Error("Images do not belong to the authenticated user");
    }

    return await ctx.db.insert("depthMaps", {
      ...args,
      status: "processing",
      modelVersion,
      createdAt: Date.now(),
    });
  },
});

export const complete = internalMutation({
  args: {
    id: v.id("depthMaps"),
    depthStorageId: storageId,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      depthStorageId: args.depthStorageId,
      status: "completed",
      completedAt: Date.now(),
      error: undefined,
    });
  },
});

export const fail = internalMutation({
  args: { id: v.id("depthMaps"), error: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "failed",
      error: args.error.slice(0, 1000),
      completedAt: Date.now(),
    });
  },
});
