"use client";

import { api } from "backend/convex/_generated/api.js";
import type { Id } from "backend/convex/_generated/dataModel.js";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

export type StorageId = Id<"_storage">;
export type UploadKind = "scene" | "object";
export type UploadStatus = "empty" | "validating" | "uploading" | "ready" | "error";

export type UploadedImage = {
  storageId: StorageId;
  fileName: string;
  size: number | null;
  width: number | null;
  height: number | null;
  previewUrl: string;
};

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Uploads an image to Convex Storage and registers its ownership.
 * Contract: depth.generateUploadUrl -> POST file -> depth.registerUpload.
 * The most recent upload of this kind is restored on reload from `listUploads`.
 */
export function useImageUpload(kind: UploadKind) {
  const generateUploadUrl = useMutation(api.depth.generateUploadUrl);
  const registerUpload = useMutation(api.depth.registerUpload);
  const uploads = useQuery(api.depth.listUploads, { kind: kind === "scene" ? "scene" : "object" });

  const [image, setImage] = useState<UploadedImage | null>(null);
  const [status, setStatus] = useState<UploadStatus>("empty");
  const [error, setError] = useState<string | null>(null);
  const [cleared, setCleared] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  useEffect(() => revokePreview, [revokePreview]);

  // Restore the latest stored upload so a reload keeps the persisted image.
  const restored = !cleared && uploads?.[0]?.url ? uploads[0] : null;
  const effective: UploadedImage | null =
    image ??
    (restored?.url
      ? {
          storageId: restored.storageId,
          fileName: `${kind === "scene" ? "Fondo" : "Producto"} guardado`,
          size: null,
          width: null,
          height: null,
          previewUrl: restored.url,
        }
      : null);

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      setStatus("validating");

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setStatus(effective ? "ready" : "error");
        setError("Formato no admitido. Usa JPEG, PNG o WebP.");
        return null;
      }
      if (file.size > MAX_BYTES) {
        setStatus(effective ? "ready" : "error");
        setError("La imagen supera el límite de 25 MB.");
        return null;
      }

      const previewUrl = URL.createObjectURL(file);
      const dimensions = await readImageSize(previewUrl);
      if (!dimensions) {
        URL.revokeObjectURL(previewUrl);
        setStatus(effective ? "ready" : "error");
        setError("No se pudo leer la imagen. Prueba con otro archivo.");
        return null;
      }

      setStatus("uploading");
      try {
        const uploadUrl = await generateUploadUrl({});
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!response.ok) {
          throw new Error(`La carga falló (${response.status})`);
        }

        const { storageId } = (await response.json()) as { storageId: StorageId };
        await registerUpload({ storageId, kind });

        revokePreview();
        previewUrlRef.current = previewUrl;

        const uploaded: UploadedImage = {
          storageId,
          fileName: file.name,
          size: file.size,
          width: dimensions.width,
          height: dimensions.height,
          previewUrl,
        };
        setCleared(false);
        setImage(uploaded);
        setStatus("ready");
        return uploaded;
      } catch (uploadError) {
        URL.revokeObjectURL(previewUrl);
        setStatus(effective ? "ready" : "error");
        setError(uploadError instanceof Error ? uploadError.message : "La carga falló.");
        return null;
      }
    },
    [effective, generateUploadUrl, kind, registerUpload, revokePreview],
  );

  const reset = useCallback(() => {
    revokePreview();
    setImage(null);
    setStatus("empty");
    setError(null);
    setCleared(true);
  }, [revokePreview]);

  return {
    image: effective,
    status,
    error,
    upload,
    reset,
    isUploading: status === "uploading",
    isRestoring: uploads === undefined,
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
