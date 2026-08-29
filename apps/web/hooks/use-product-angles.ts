"use client";

import { api } from "backend/convex/_generated/api.js";
import type { Id } from "backend/convex/_generated/dataModel.js";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";

type StorageId = Id<"_storage">;
export type AngleId = Id<"productAngles">;

/**
 * Queues perspective generations and lists the stored ones.
 * `list` restores every completed angle after a reload; cube placement stays in memory
 * because the backend has no fields for it yet.
 */
export function useProductAngles() {
  const enqueue = useMutation(api.angles.enqueue);
  const angles = useQuery(api.angles.list, {});
  const [pendingId, setPendingId] = useState<AngleId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEnqueueing, setIsEnqueueing] = useState(false);

  const live = useQuery(api.angles.get, pendingId ? { id: pendingId } : "skip");

  const generate = useCallback(
    async (input: { sourceStorageId: StorageId; rotateDegrees: number; verticalTilt: number }) => {
      setError(null);
      setIsEnqueueing(true);
      try {
        const id = await enqueue(input);
        setPendingId(id);
        return id;
      } catch (enqueueError) {
        setError(
          enqueueError instanceof Error
            ? enqueueError.message
            : "No se pudo generar la perspectiva.",
        );
        return null;
      } finally {
        setIsEnqueueing(false);
      }
    },
    [enqueue],
  );

  const completed = (angles ?? []).filter((angle) => angle.status === "completed");
  const activeStatus = live?.status ?? (pendingId ? "pending" : "idle");
  const isRunning = isEnqueueing || activeStatus === "pending" || activeStatus === "processing";

  return {
    angles: angles ?? [],
    completed,
    pending: live ?? null,
    status: activeStatus,
    isRunning,
    isRestoring: angles === undefined,
    error: error ?? (live?.status === "failed" ? (live.error ?? "Falló la generación.") : null),
    generate,
  };
}
