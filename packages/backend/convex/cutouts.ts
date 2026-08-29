import { internal } from "@backend/convex/_generated/api";
import type { Doc, Id } from "@backend/convex/_generated/dataModel";
import {
  internalMutation,
  mutation,
  type QueryCtx,
  query,
} from "@backend/convex/_generated/server";
import { MODEL_BG_REMOVE } from "@backend/convex/angles";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

const modelVersions = MODEL_BG_REMOVE;

export type HydratedSubjectCutout = Doc<"subjectCutouts"> & {
  sourceUrl: string | null;
  resultUrl: string | null;
};

async function hydrate(ctx: QueryCtx, job: Doc<"subjectCutouts">): Promise<HydratedSubjectCutout> {
  const [sourceUrl, resultUrl] = await Promise.all([
    ctx.storage.getUrl(job.sourceStorageId),
    job.resultStorageId ? ctx.storage.getUrl(job.resultStorageId) : null,
  ]);
  return { ...job, sourceUrl, resultUrl };
}

/**
 * Queues a foreground-subject extraction (background removal) and returns immediately;
 * follow progress with `get`. The result is the top layer of a "text behind subject"
 * composition: the client draws the original photo, then the text, then this cutout.
 *
 * Accepts any image the user has registered (`registerUpload`), scene or object —
 * for text-behind it is normally the scene photo itself.
 */
export const enqueue = mutation({
  args: {
    sourceStorageId: v.id("_storage"),
    // Alpha threshold of the segmentation model; its default (0) is right for most
    // photos. Clamped to [0, 1].
    threshold: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Id<"subjectCutouts">> => {
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
    if (!ownership) {
      throw new Error("Source image does not belong to the authenticated user");
    }

    const threshold =
      args.threshold === undefined ? undefined : Math.max(0, Math.min(1, args.threshold));

    // The cutout depends only on (source, threshold): reuse an earlier completed run
    // instead of paying Replicate again.
    const previous = await ctx.db
      .query("subjectCutouts")
      .withIndex("by_user_source", (q) =>
        q.eq("userId", userId).eq("sourceStorageId", args.sourceStorageId),
      )
      .order("desc")
      .collect();
    const cached = previous.find(
      (job) =>
        job.status === "completed" &&
        job.resultStorageId &&
        (job.threshold ?? 0) === (threshold ?? 0),
    );

    if (cached?.resultStorageId) {
      return await ctx.db.insert("subjectCutouts", {
        userId,
        sourceStorageId: args.sourceStorageId,
        resultStorageId: cached.resultStorageId,
        threshold,
        status: "completed",
        modelVersions,
        createdAt: Date.now(),
        completedAt: Date.now(),
      });
    }

    const jobId = await ctx.db.insert("subjectCutouts", {
      userId,
      sourceStorageId: args.sourceStorageId,
      threshold,
      status: "pending",
      modelVersions,
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.cutoutsActions.processCutout, {
      id: jobId,
      sourceStorageId: args.sourceStorageId,
      threshold,
    });

    return jobId;
  },
});

export const get = query({
  args: { id: v.id("subjectCutouts") },
  handler: async (ctx, args): Promise<HydratedSubjectCutout> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const job = await ctx.db.get(args.id);
    if (!job || job.userId !== userId) throw new Error("Subject cutout not found");

    return await hydrate(ctx, job);
  },
});

export const list = query({
  args: {},
  handler: async (ctx): Promise<HydratedSubjectCutout[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const jobs = await ctx.db
      .query("subjectCutouts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return await Promise.all(jobs.map((job) => hydrate(ctx, job)));
  },
});

export const markProcessing = internalMutation({
  args: { id: v.id("subjectCutouts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "processing" });
  },
});

/**
 * Stores the result and registers it in `userFiles` as an `object`, so the cutout can
 * also feed the other services (an angle generation, a depth composition).
 */
export const complete = internalMutation({
  args: {
    id: v.id("subjectCutouts"),
    resultStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id);
    if (!job) throw new Error("Subject cutout not found");

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
  args: { id: v.id("subjectCutouts"), error: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "failed",
      error: args.error.slice(0, 1000),
      completedAt: Date.now(),
    });
  },
});

/** Removes a job. The blob is kept while another cutout row still points at it (cache). */
export const remove = mutation({
  args: { id: v.id("subjectCutouts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const job = await ctx.db.get(args.id);
    if (!job || job.userId !== userId) throw new Error("Subject cutout not found");

    await ctx.db.delete(args.id);

    if (!job.resultStorageId) return;

    const stillShared = await ctx.db
      .query("subjectCutouts")
      .withIndex("by_user_source", (q) =>
        q.eq("userId", userId).eq("sourceStorageId", job.sourceStorageId),
      )
      .collect();
    if (stillShared.some((row) => row.resultStorageId === job.resultStorageId)) return;

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
