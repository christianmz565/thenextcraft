"use node";

import { internal } from "@backend/convex/_generated/api";
import { internalAction } from "@backend/convex/_generated/server";
import { MODEL_BG_REMOVE } from "@backend/convex/angles";
import { blobFromStorage, getOutputUrl, storeFromUrl } from "@backend/convex/lib/replicate";
import { v } from "convex/values";
import Replicate from "replicate";

/**
 * Single background-remover call over the photo: keeps the foreground subject, replaces
 * everything else with a real alpha channel. Scheduled by `cutouts.enqueue`.
 */
export const processCutout = internalAction({
  args: {
    id: v.id("subjectCutouts"),
    sourceStorageId: v.id("_storage"),
    threshold: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<void> => {
    try {
      const apiKey = process.env.REPLICATE_API_KEY;
      if (!apiKey) throw new Error("Missing REPLICATE_API_KEY");

      await ctx.runMutation(internal.cutouts.markProcessing, { id: args.id });

      const sourceBlob = await blobFromStorage(ctx, args.sourceStorageId, "Source image");
      const replicate = new Replicate({ auth: apiKey, useFileOutput: false });

      const cutout = await replicate.run(MODEL_BG_REMOVE, {
        input: {
          image: sourceBlob,
          background_type: "rgba",
          format: "png",
          ...(args.threshold !== undefined && { threshold: args.threshold }),
        },
      });

      const cutoutUrl = getOutputUrl(cutout);
      if (!cutoutUrl) throw new Error("Background remover did not return an image");

      const resultStorageId = await storeFromUrl(ctx, cutoutUrl, "subject cutout");

      await ctx.runMutation(internal.cutouts.complete, { id: args.id, resultStorageId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Subject extraction failed";
      await ctx.runMutation(internal.cutouts.fail, { id: args.id, error: message });
    }
  },
});
