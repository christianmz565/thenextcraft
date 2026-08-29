"use node";

import { internal } from "@backend/convex/_generated/api";
import { internalAction } from "@backend/convex/_generated/server";
import { MODEL_BG_REMOVE, MODEL_ROTATE } from "@backend/convex/angles";
import { blobFromStorage, getOutputUrl, storeFromUrl } from "@backend/convex/lib/replicate";
import { v } from "convex/values";
import Replicate from "replicate";

/**
 * Two chained models: qwen-edit-multiangle re-renders the product from another angle,
 * then background-remover puts back a real alpha channel (qwen paints its own studio
 * background and does not preserve transparency).
 *
 * Scheduled by `angles.enqueue` — the pair takes ~25-45s and costs money per run.
 */
export const processAngle = internalAction({
  args: {
    id: v.id("productAngles"),
    sourceStorageId: v.id("_storage"),
    rotateDegrees: v.number(),
    verticalTilt: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    try {
      const apiKey = process.env.REPLICATE_API_KEY;
      if (!apiKey) throw new Error("Missing REPLICATE_API_KEY");

      await ctx.runMutation(internal.angles.markProcessing, { id: args.id });

      const sourceBlob = await blobFromStorage(ctx, args.sourceStorageId, "Source image");
      const replicate = new Replicate({ auth: apiKey, useFileOutput: false });

      // output_format defaults to "webp" on this model; pinning png keeps the chain
      // in one format instead of guessing the content-type of the download later.
      const rotated = await replicate.run(MODEL_ROTATE, {
        input: {
          image: sourceBlob,
          go_fast: false,
          rotate_degrees: args.rotateDegrees,
          vertical_tilt: args.verticalTilt,
          output_format: "png",
        },
      });

      // This model returns an array of URIs, unlike background-remover below.
      const rotatedUrl = getOutputUrl(rotated);
      if (!rotatedUrl) throw new Error("Angle model did not return an image");

      const cutout = await replicate.run(MODEL_BG_REMOVE, {
        input: { image: rotatedUrl, background_type: "rgba", format: "png" },
      });

      const cutoutUrl = getOutputUrl(cutout);
      if (!cutoutUrl) throw new Error("Background remover did not return an image");

      const resultStorageId = await storeFromUrl(ctx, cutoutUrl, "generated angle");

      await ctx.runMutation(internal.angles.complete, { id: args.id, resultStorageId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Angle generation failed";
      await ctx.runMutation(internal.angles.fail, { id: args.id, error: message });
    }
  },
});
