"use node";

import { internal } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { type ActionCtx, internalAction } from "@backend/convex/_generated/server";
import { v } from "convex/values";
import Replicate from "replicate";

const modelVersion =
  "chenxwh/depth-anything-v2:b239ea33cff32bb7abb5db39ffe9a09c14cbc2894331d1ef66fe096eed88ebd4";

function getOutputUrl(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return null;

  const candidate = value as { url?: unknown };
  if (typeof candidate.url === "string") return candidate.url;
  if (typeof candidate.url === "function") {
    const url = candidate.url();
    return url instanceof URL ? url.toString() : String(url);
  }
  return null;
}

async function storeFromUrl(ctx: ActionCtx, url: string, label: string): Promise<Id<"_storage">> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download ${label}`);
  return await ctx.storage.store(await response.blob());
}

/**
 * Runs Depth Anything V2 over the scene and stores both output maps.
 *
 * Scheduled by `depth.enqueue` rather than called directly, so the client is not
 * held open for the whole Replicate run and a reload cannot lose the job.
 */
export const processDepthMap = internalAction({
  args: {
    id: v.id("depthMaps"),
    sceneStorageId: v.id("_storage"),
  },
  handler: async (ctx, args): Promise<void> => {
    try {
      const apiKey = process.env.REPLICATE_API_KEY;
      if (!apiKey) throw new Error("Missing REPLICATE_API_KEY");

      await ctx.runMutation(internal.depth.markProcessing, { id: args.id });

      const sceneUrl = await ctx.storage.getUrl(args.sceneStorageId);
      if (!sceneUrl) throw new Error("Scene image URL not found");

      const sceneResponse = await fetch(sceneUrl);
      if (!sceneResponse.ok) throw new Error("Could not download scene image");
      const sceneBlob = await sceneResponse.blob();

      const replicate = new Replicate({ auth: apiKey, useFileOutput: false });
      const output = (await replicate.run(modelVersion, {
        input: { image: sceneBlob },
      })) as { grey_depth?: unknown; color_depth?: unknown };

      // grey_depth is the one sampled for placement; color_depth is display-only.
      const depthUrl = getOutputUrl(output.grey_depth);
      if (!depthUrl) throw new Error("Model did not return grey_depth");
      const colorUrl = getOutputUrl(output.color_depth);

      const [depthStorageId, colorStorageId] = await Promise.all([
        storeFromUrl(ctx, depthUrl, "depth map"),
        colorUrl
          ? storeFromUrl(ctx, colorUrl, "color depth map")
          : Promise.resolve<Id<"_storage"> | undefined>(undefined),
      ]);

      await ctx.runMutation(internal.depth.complete, {
        id: args.id,
        depthStorageId,
        colorStorageId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Depth estimation failed";
      await ctx.runMutation(internal.depth.fail, { id: args.id, error: message });
    }
  },
});
