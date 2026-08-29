"use client";

import { api } from "backend/convex/_generated/api.js";
import type { Id } from "backend/convex/_generated/dataModel.js";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";

type StorageId = Id<"_storage">;
export type CutoutId = Id<"subjectCutouts">;

/**
 * Extracts the foreground subject of the scene (background removal) for the
 * text-behind effect. Same pattern as the other job hooks: enqueue + reactive `get`.
 * A completed cutout for this scene is restored from `list` — the backend also
 * caches per (source, threshold), so re-running the same scene is free.
 */
export function useSubjectCutout(sourceStorageId: StorageId | null) {
  const enqueue = useMutation(api.cutouts.enqueue);
  const cutouts = useQuery(api.cutouts.list, {});
  const [pendingId, setPendingId] = useState<CutoutId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEnqueueing, setIsEnqueueing] = useState(false);

  const live = useQuery(api.cutouts.get, pendingId ? { id: pendingId } : "skip");

  // Newest completed cutout of this exact scene, so a reload keeps the effect.
  const restored =
    sourceStorageId === null
      ? null
      : ((cutouts ?? []).find(
          (cutout) =>
            cutout.sourceStorageId === sourceStorageId &&
            cutout.status === "completed" &&
            cutout.resultUrl,
        ) ?? null);

  const job = live ?? restored;

  const extract = useCallback(async () => {
    if (!sourceStorageId) return null;
    setError(null);
    setIsEnqueueing(true);
    try {
      const id = await enqueue({ sourceStorageId });
      setPendingId(id);
      return id;
    } catch (enqueueError) {
      setError(
        enqueueError instanceof Error ? enqueueError.message : "No se pudo extraer el sujeto.",
      );
      return null;
    } finally {
      setIsEnqueueing(false);
    }
  }, [enqueue, sourceStorageId]);

  const status = job?.status ?? "idle";
  const isRunning = isEnqueueing || status === "pending" || status === "processing";

  return {
    job,
    cutoutUrl: job?.status === "completed" ? (job.resultUrl ?? null) : null,
    status,
    isRunning,
    isRestoring: cutouts === undefined,
    error: error ?? (job?.status === "failed" ? (job.error ?? "Falló la extracción.") : null),
    extract,
  };
}
