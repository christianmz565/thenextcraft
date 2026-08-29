"use client";

import { api } from "backend/convex/_generated/api.js";
import type { Id } from "backend/convex/_generated/dataModel.js";
import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { Button } from "@/components/ui/button";

type StorageId = Id<"_storage">;
type Kind = "object" | "scene";

function Upload({
  kind,
  label,
  onUploaded,
}: {
  kind: Kind;
  label: string;
  onUploaded: (id: StorageId) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generateUploadUrl = useMutation(api.depth.generateUploadUrl);
  const registerUpload = useMutation(api.depth.registerUpload);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const url = await generateUploadUrl({});
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!response.ok) throw new Error(`Upload falló (${response.status})`);
      const { storageId } = (await response.json()) as { storageId: StorageId };
      await registerUpload({ storageId, kind });
      onUploaded(storageId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload falló");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="font-medium text-sm" htmlFor={`file-${kind}`}>
        {label}
      </label>
      <input
        id={`file-${kind}`}
        type="file"
        accept="image/*"
        className="text-sm"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        disabled={!file || busy}
        onClick={() => void upload()}
      >
        {busy ? "Subiendo…" : `Subir ${kind}`}
      </Button>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}

export default function DepthTestPage() {
  const [objectStorageId, setObjectStorageId] = useState<StorageId | null>(null);
  const [sceneStorageId, setSceneStorageId] = useState<StorageId | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const generateDepthMap = useAction(api.depthActions.generateDepthMap);
  const jobs = useQuery(api.depth.list, {});

  const depthUrl =
    result && typeof result === "object" && "depthUrl" in result
      ? ((result as { depthUrl: string | null }).depthUrl ?? null)
      : null;

  async function processScene() {
    if (!objectStorageId || !sceneStorageId) return;
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      setResult(await generateDepthMap({ objectStorageId, sceneStorageId }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Depth estimation falló");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-medium text-xl">Prueba de estimación de profundidad</h1>
        <SignOutButton />
      </div>

      <Upload kind="object" label="Imagen del producto" onUploaded={setObjectStorageId} />
      <Upload kind="scene" label="Imagen del escenario" onUploaded={setSceneStorageId} />

      <Button
        type="button"
        className="w-fit"
        disabled={busy || !objectStorageId || !sceneStorageId}
        onClick={() => void processScene()}
      >
        {busy ? "Procesando…" : "Generar mapa de profundidad"}
      </Button>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {result ? (
        <div className="flex flex-col gap-2">
          <h2 className="font-medium">Resultado</h2>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
          {depthUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={depthUrl} alt="Mapa de profundidad" className="max-h-96 w-fit rounded-md" />
          ) : null}
        </div>
      ) : null}

      <p className="text-muted-foreground text-sm">
        {jobs ? `Trabajos registrados: ${jobs.length}` : "Cargando trabajos…"}
      </p>
    </div>
  );
}
