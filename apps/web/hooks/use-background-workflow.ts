"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type DepthStatus = "idle" | "queued" | "processing" | "completed" | "failed";

export type BackgroundFile = {
  name: string;
  size: number;
  previewUrl: string;
  width: number;
  height: number;
};

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Front-end only workflow for the background step.
 * Depth generation is simulated until the Convex service contract is available.
 */
export function useBackgroundWorkflow() {
  const [background, setBackground] = useState<BackgroundFile | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [depthStatus, setDepthStatus] = useState<DepthStatus>("idle");
  const [depthProgress, setDepthProgress] = useState(0);
  const [depthError, setDepthError] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const objectUrl = useRef<string | null>(null);

  const clearTimers = useCallback(() => {
    for (const timer of timers.current) {
      clearTimeout(timer);
    }
    timers.current = [];
  }, []);

  useEffect(
    () => () => {
      clearTimers();
      if (objectUrl.current) {
        URL.revokeObjectURL(objectUrl.current);
      }
    },
    [clearTimers],
  );

  const selectBackground = useCallback(
    async (file: File) => {
      setUploadError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setUploadError("Formato no admitido. Usa JPEG, PNG o WebP.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setUploadError("La imagen supera el límite de 25 MB.");
        return;
      }

      clearTimers();
      if (objectUrl.current) {
        URL.revokeObjectURL(objectUrl.current);
      }

      const previewUrl = URL.createObjectURL(file);
      objectUrl.current = previewUrl;

      const dimensions = await readImageSize(previewUrl);
      if (!dimensions) {
        URL.revokeObjectURL(previewUrl);
        objectUrl.current = null;
        setUploadError("No se pudo leer la imagen. Prueba con otro archivo.");
        return;
      }

      setBackground({
        name: file.name,
        size: file.size,
        previewUrl,
        width: dimensions.width,
        height: dimensions.height,
      });
      setDepthStatus("idle");
      setDepthProgress(0);
      setDepthError(null);
    },
    [clearTimers],
  );

  const clearBackground = useCallback(() => {
    clearTimers();
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    }
    setBackground(null);
    setUploadError(null);
    setDepthStatus("idle");
    setDepthProgress(0);
    setDepthError(null);
  }, [clearTimers]);

  const generateDepthMap = useCallback(() => {
    if (!background) return;

    clearTimers();
    setDepthError(null);
    setDepthProgress(0);
    setDepthStatus("queued");

    timers.current.push(
      setTimeout(() => {
        setDepthStatus("processing");
      }, 500),
    );

    for (let step = 1; step <= 10; step += 1) {
      timers.current.push(
        setTimeout(
          () => {
            setDepthProgress(step * 10);
          },
          500 + step * 260,
        ),
      );
    }

    timers.current.push(
      setTimeout(() => {
        setDepthStatus("completed");
      }, 3400),
    );
  }, [background, clearTimers]);

  return {
    background,
    uploadError,
    depthStatus,
    depthProgress,
    depthError,
    hasDepthMap: depthStatus === "completed",
    isDepthRunning: depthStatus === "queued" || depthStatus === "processing",
    selectBackground,
    clearBackground,
    generateDepthMap,
  };
}

function readImageSize(url: string) {
  return new Promise<{ width: number; height: number } | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve(null);
    image.src = url;
  });
}
