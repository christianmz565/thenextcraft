import { internal } from "@backend/convex/_generated/api";
import type { Doc, Id } from "@backend/convex/_generated/dataModel";
import {
  internalMutation,
  mutation,
  type QueryCtx,
  query,
} from "@backend/convex/_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

const modelVersion =
  "chenxwh/depth-anything-v2:b239ea33cff32bb7abb5db39ffe9a09c14cbc2894331d1ef66fe096eed88ebd4";

const storageId = v.id("_storage");

/**
 * A job plus every URL the client needs to composite the product onto the scene:
 * the scene itself, the product cutout, the greyscale map that drives the depth
 * sampling, and the colored map used only for the visualization toggle.
 */
export type HydratedDepthMap = Doc<"depthMaps"> & {
  depthUrl: string | null;
  colorDepthUrl: string | null;
  sceneUrl: string | null;
  objectUrl: string | null;
};

async function hydrate(ctx: QueryCtx, job: Doc<"depthMaps">): Promise<HydratedDepthMap> {
  const [depthUrl, colorDepthUrl, sceneUrl, objectUrl] = await Promise.all([
    job.depthStorageId ? ctx.storage.getUrl(job.depthStorageId) : null,
    job.colorStorageId ? ctx.storage.getUrl(job.colorStorageId) : null,
    ctx.storage.getUrl(job.sceneStorageId),
    ctx.storage.getUrl(job.objectStorageId),
  ]);
  return { ...job, depthUrl, colorDepthUrl, sceneUrl, objectUrl };
}

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
  handler: async (ctx): Promise<HydratedDepthMap[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const jobs = await ctx.db
      .query("depthMaps")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return await Promise.all(jobs.map((job) => hydrate(ctx, job)));
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

/** Files the signed-in user has uploaded, so the client can reuse them across sessions. */
export const listUploads = query({
  args: { kind: v.optional(v.union(v.literal("object"), v.literal("scene"))) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const files = await ctx.db
      .query("userFiles")
      .withIndex("by_user_storage", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return await Promise.all(
      files
        .filter((file) => args.kind === undefined || file.kind === args.kind)
        .map(async (file) => ({ ...file, url: await ctx.storage.getUrl(file.storageId) })),
    );
  },
});

export const get = query({
  args: { id: v.id("depthMaps") },
  handler: async (ctx, args): Promise<HydratedDepthMap> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const job = await ctx.db.get(args.id);
    if (!job || job.userId !== userId) throw new Error("Depth map not found");

    return await hydrate(ctx, job);
  },
});

/**
 * Queues a depth estimation and returns immediately. The Replicate call runs in a
 * scheduled action; the client follows progress with `get`.
 */
export const enqueue = mutation({
  args: {
    objectStorageId: storageId,
    sceneStorageId: storageId,
  },
  handler: async (ctx, args): Promise<Id<"depthMaps">> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const [objectFile, sceneFile] = await Promise.all([
      ctx.storage.getMetadata(args.objectStorageId),
      ctx.storage.getMetadata(args.sceneStorageId),
    ]);

    if (!objectFile || !sceneFile) throw new Error("Uploaded image not found");

    const [objectOwnership, sceneOwnership] = await Promise.all([
      ctx.db
        .query("userFiles")
        .withIndex("by_user_storage", (q) =>
          q.eq("userId", userId).eq("storageId", args.objectStorageId),
        )
        .first(),
      ctx.db
        .query("userFiles")
        .withIndex("by_user_storage", (q) =>
          q.eq("userId", userId).eq("storageId", args.sceneStorageId),
        )
        .first(),
    ]);

    if (objectOwnership?.kind !== "object" || sceneOwnership?.kind !== "scene") {
      throw new Error("Images do not belong to the authenticated user");
    }

    // The map only depends on the scene, so an earlier run for the same scene is reusable.
    const cached = await ctx.db
      .query("depthMaps")
      .withIndex("by_user_scene", (q) =>
        q.eq("userId", userId).eq("sceneStorageId", args.sceneStorageId),
      )
      .order("desc")
      .first();

    if (cached?.status === "completed" && cached.depthStorageId) {
      return await ctx.db.insert("depthMaps", {
        userId,
        ...args,
        depthStorageId: cached.depthStorageId,
        colorStorageId: cached.colorStorageId,
        status: "completed",
        modelVersion,
        createdAt: Date.now(),
        completedAt: Date.now(),
      });
    }

    const jobId = await ctx.db.insert("depthMaps", {
      userId,
      ...args,
      status: "pending",
      modelVersion,
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.depthActions.processDepthMap, {
      id: jobId,
      sceneStorageId: args.sceneStorageId,
    });

    return jobId;
  },
});

export const markProcessing = internalMutation({
  args: { id: v.id("depthMaps") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "processing" });
  },
});

export const complete = internalMutation({
  args: {
    id: v.id("depthMaps"),
    depthStorageId: storageId,
    colorStorageId: v.optional(storageId),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      depthStorageId: args.depthStorageId,
      colorStorageId: args.colorStorageId,
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

/** Removes a job. Blobs shared with another job (same scene, cached) are kept. */
export const remove = mutation({
  args: { id: v.id("depthMaps") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const job = await ctx.db.get(args.id);
    if (!job || job.userId !== userId) throw new Error("Depth map not found");

    await ctx.db.delete(args.id);

    if (!job.depthStorageId) return;
    const stillReferenced = await ctx.db
      .query("depthMaps")
      .withIndex("by_user_scene", (q) =>
        q.eq("userId", userId).eq("sceneStorageId", job.sceneStorageId),
      )
      .first();
    if (stillReferenced) return;

    await Promise.all([
      ctx.storage.delete(job.depthStorageId),
      job.colorStorageId ? ctx.storage.delete(job.colorStorageId) : Promise.resolve(),
    ]);
  },
});
