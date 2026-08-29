"use node";

import { internal } from "@backend/convex/_generated/api";
import { action } from "@backend/convex/_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
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

export const generateDepthMap = action({
  args: {
    objectStorageId: v.id("_storage"),
    sceneStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const apiKey = process.env.REPLICATE_API_KEY;
    if (!apiKey) throw new Error("Missing REPLICATE_API_KEY");

    const jobId = await ctx.runMutation(internal.depth.create, {
      userId,
      ...args,
    });

    try {
      const sceneUrl = await ctx.storage.getUrl(args.sceneStorageId);
      if (!sceneUrl) throw new Error("Scene image URL not found");

      const sceneResponse = await fetch(sceneUrl);
      if (!sceneResponse.ok) throw new Error("Could not download scene image");
      const sceneBlob = await sceneResponse.blob();

      const replicate = new Replicate({ auth: apiKey, useFileOutput: false });
      const output = (await replicate.run(modelVersion, {
        input: { image: sceneBlob },
      })) as { grey_depth?: unknown };

      const depthUrl = getOutputUrl(output.grey_depth);
      if (!depthUrl) throw new Error("Model did not return grey_depth");

      const depthResponse = await fetch(depthUrl);
      if (!depthResponse.ok) throw new Error("Could not download depth map");
      const depthBlob = await depthResponse.blob();
      const depthStorageId = await ctx.storage.store(depthBlob);

      await ctx.runMutation(internal.depth.complete, {
        id: jobId,
        depthStorageId,
      });

      return {
        id: jobId,
        status: "completed" as const,
        modelVersion,
        depthStorageId,
        depthUrl: await ctx.storage.getUrl(depthStorageId),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Depth estimation failed";
      await ctx.runMutation(internal.depth.fail, { id: jobId, error: message });
      throw new Error(message);
    }
  },
});
