import type { Id } from "@backend/convex/_generated/dataModel";
import type { ActionCtx } from "@backend/convex/_generated/server";

/**
 * Replicate outputs are inconsistent: a plain URL string, a FileOutput object, or an
 * array of either (qwen-edit-multiangle returns an array; background-remover a string).
 * Normalizes any of those to a URL.
 */
export function getOutputUrl(value: unknown): string | null {
  if (Array.isArray(value)) return value.length > 0 ? getOutputUrl(value[0]) : null;
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

/** Downloads a Replicate result and puts it in Convex storage. */
export async function storeFromUrl(
  ctx: ActionCtx,
  url: string,
  label: string,
): Promise<Id<"_storage">> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download ${label}`);
  return await ctx.storage.store(await response.blob());
}

/** Reads a stored file back out as a Blob, to feed it to a model as input. */
export async function blobFromStorage(
  ctx: ActionCtx,
  storageId: Id<"_storage">,
  label: string,
): Promise<Blob> {
  const blob = await ctx.storage.get(storageId);
  if (!blob) throw new Error(`${label} not found in storage`);
  return blob;
}
