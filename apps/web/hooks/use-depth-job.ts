"use client";

import { api } from "backend/convex/_generated/api.js";
import type { Id } from "backend/convex/_generated/dataModel.js";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";

export type DepthJobId = Id<"depthMaps">;
type StorageId = Id<"_storage">;

/**
 * Queues a depth estimation and follows it with the reactive `get` query.
 * On reload the latest job is restored from `list`, so persisted work is not lost.
 * Cube placement and scale stay in memory: the backend has no fields for them yet.
 */
export function useDepthJob() {
  const enqueue = useMutation(api.depth.enqueue);
  const jobs = useQuery(api.depth.list, {});
  const [selectedId, setSelectedId] = useState<DepthJobId | null>(null);
  const [enqueueError, setEnqueueError] = useState<string | null>(null);
  const [isEnqueueing, setIsEnqueueing] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // `list` returns newest first, so the head is the job to resume after a reload.
  const restored = dismissed ? null : (jobs?.[0] ?? null);
  const activeId = selectedId ?? restored?._id ?? null;

  const live = useQuery(api.depth.get, activeId ? { id: activeId } : "skip");
  const job = live ?? (activeId === restored?._id ? restored : null);

  const start = useCallback(
    async (input: { sceneStorageId: StorageId; objectStorageId: StorageId }) => {
      setEnqueueError(null);
      setIsEnqueueing(true);
      try {
        const id = await enqueue(input);
        setDismissed(false);
        setSelectedId(id);
        return id;
      } catch (error) {
        setEnqueueError(error instanceof Error ? error.message : "No se pudo encolar el trabajo.");
        return null;
      } finally {
        setIsEnqueueing(false);
      }
    },
    [enqueue],
  );

  /** Leaves the current job aside to start a new pair of images. */
  const reset = useCallback(() => {
    setSelectedId(null);
    setEnqueueError(null);
    setDismissed(true);
  }, []);

  const status = job?.status ?? (activeId ? "pending" : "idle");
  const isRunning = isEnqueueing || status === "pending" || status === "processing";

  return {
    job,
    jobId: activeId,
    status,
    isRunning,
    isEnqueueing,
    isRestoring: jobs === undefined,
    error: enqueueError ?? (job?.status === "failed" ? (job.error ?? "Falló el proceso.") : null),
    start,
    reset,
  };
}
