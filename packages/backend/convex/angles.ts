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

// Pinned rather than resolved at runtime, so a model update cannot silently change
// results. Chained: qwen re-renders the angle but paints its own studio background,
// then background-remover restores a real alpha channel.
export const MODEL_ROTATE =
  "qwen/qwen-edit-multiangle:cf245ffaa67a6d7d0edeb597d2fded5ab80cbf72b0dceec185d709ea99667f79";
export const MODEL_BG_REMOVE =
  "851-labs/background-remover:a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc";

const modelVersions = `${MODEL_ROTATE} -> ${MODEL_BG_REMOVE}`;

export type HydratedProductAngle = Doc<"productAngles"> & {
  sourceUrl: string | null;
  resultUrl: string | null;
};

async function hydrate(ctx: QueryCtx, job: Doc<"productAngles">): Promise<HydratedProductAngle> {
  const [sourceUrl, resultUrl] = await Promise.all([
    ctx.storage.getUrl(job.sourceStorageId),
    job.resultStorageId ? ctx.storage.getUrl(job.resultStorageId) : null,
  ]);
  return { ...job, sourceUrl, resultUrl };
}

/**
 * Queues an angle generation and returns immediately; the two model calls run in a
 * scheduled action. Follow progress with `get`.
 *
 * `rotateDegrees` and `verticalTilt` are clamped to what the model accepts, so the
 * client can pass raw slider values without pre-validating.
 */
export const enqueue = mutation({
  args: {
    sourceStorageId: v.id("_storage"),
    rotateDegrees: v.number(),
    verticalTilt: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Id<"productAngles">> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (!(await ctx.storage.getMetadata(args.sourceStorageId))) {
      throw new Error("Source image not found");
    }

    const ownership = await ctx.db
      .query("userFiles")
      .withIndex("by_user_storage", (q) =>
        q.eq("userId", userId).eq("storageId", args.sourceStorageId),
      )
      .first();

    if (ownership?.kind !== "object") {
      throw new Error("Source image does not belong to the authenticated user");
    }

    // Model limits: rotate_degrees is an integer in [-90, 90], vertical_tilt an
    // integer in [-1, 0, 1] (-1 bird's eye, 0 level, 1 worm's eye).
    const rotateDegrees = Math.max(-90, Math.min(90, Math.round(args.rotateDegrees)));
    const verticalTilt = Number.isFinite(args.verticalTilt)
      ? Math.max(-1, Math.min(1, Math.round(args.verticalTilt as number)))
      : 0;

    const jobId = await ctx.db.insert("productAngles", {
      userId,
      sourceStorageId: args.sourceStorageId,
      rotateDegrees,
      verticalTilt,
      status: "pending",
      modelVersions,
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.anglesActions.processAngle, {
      id: jobId,
      sourceStorageId: args.sourceStorageId,
      rotateDegrees,
      verticalTilt,
    });

    return jobId;
  },
});

export const get = query({
  args: { id: v.id("productAngles") },
  handler: async (ctx, args): Promise<HydratedProductAngle> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const job = await ctx.db.get(args.id);
    if (!job || job.userId !== userId) throw new Error("Product angle not found");

    return await hydrate(ctx, job);
  },
});

export const list = query({
  args: {},
  handler: async (ctx): Promise<HydratedProductAngle[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const jobs = await ctx.db
      .query("productAngles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return await Promise.all(jobs.map((job) => hydrate(ctx, job)));
  },
});

export const markProcessing = internalMutation({
  args: { id: v.id("productAngles") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "processing" });
  },
});

/**
 * Stores the result and registers it in `userFiles` as an `object`, which is what makes
 * it usable as the source of another angle (chaining) and as the product of a depth job.
 */
export const complete = internalMutation({
  args: {
    id: v.id("productAngles"),
    resultStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id);
    if (!job) throw new Error("Product angle not found");

    await ctx.db.patch(args.id, {
      resultStorageId: args.resultStorageId,
      status: "completed",
      completedAt: Date.now(),
      error: undefined,
    });

    await ctx.db.insert("userFiles", {
      userId: job.userId,
      storageId: args.resultStorageId,
      kind: "object",
      createdAt: Date.now(),
    });
  },
});

export const fail = internalMutation({
  args: { id: v.id("productAngles"), error: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "failed",
      error: args.error.slice(0, 1000),
      completedAt: Date.now(),
    });
  },
});

/** Removes a job. The generated image is kept if a later job used it as its source. */
export const remove = mutation({
  args: { id: v.id("productAngles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const job = await ctx.db.get(args.id);
    if (!job || job.userId !== userId) throw new Error("Product angle not found");

    await ctx.db.delete(args.id);

    if (!job.resultStorageId) return;

    const chainedFrom = await ctx.db
      .query("productAngles")
      .withIndex("by_user_source", (q) =>
        q.eq("userId", userId).eq("sourceStorageId", job.resultStorageId as Id<"_storage">),
      )
      .first();
    if (chainedFrom) return;

    const registration = await ctx.db
      .query("userFiles")
      .withIndex("by_user_storage", (q) =>
        q.eq("userId", userId).eq("storageId", job.resultStorageId as Id<"_storage">),
      )
      .first();
    if (registration) await ctx.db.delete(registration._id);

    await ctx.storage.delete(job.resultStorageId);
  },
});
