"use client";

import { api } from "backend/convex/_generated/api.js";
import type { Id } from "backend/convex/_generated/dataModel.js";
import { Authenticated, AuthLoading, useMutation, useQuery } from "convex/react";
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

function DepthTester() {
  const [objectStorageId, setObjectStorageId] = useState<StorageId | null>(null);
  const [sceneStorageId, setSceneStorageId] = useState<StorageId | null>(null);
  const [jobId, setJobId] = useState<Id<"depthMaps"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enqueue = useMutation(api.depth.enqueue);
  // Polling: the query re-runs on its own as the scheduled action patches the row.
  const job = useQuery(api.depth.get, jobId ? { id: jobId } : "skip");
  const jobs = useQuery(api.depth.list, {});

  const running = job?.status === "pending" || job?.status === "processing";

  async function processScene() {
    if (!objectStorageId || !sceneStorageId) return;
    setError(null);
    try {
      setJobId(await enqueue({ objectStorageId, sceneStorageId }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo encolar el trabajo");
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
        disabled={Boolean(running) || !objectStorageId || !sceneStorageId}
        onClick={() => void processScene()}
      >
        {running ? "Procesando…" : "Generar mapa de profundidad"}
      </Button>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {job ? (
        <div className="flex flex-col gap-3">
          <h2 className="font-medium">
            Estado: {job.status}
            {job.error ? ` — ${job.error}` : ""}
          </h2>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(job, null, 2)}
          </pre>
          <div className="flex flex-wrap gap-4">
            {(
              [
                ["Escenario", job.sceneUrl],
                ["Producto", job.objectUrl],
                ["Profundidad (grey)", job.depthUrl],
                ["Profundidad (color)", job.colorDepthUrl],
              ] as const
            ).map(([label, url]) =>
              url ? (
                <figure key={label} className="flex flex-col gap-1">
                  <figcaption className="text-muted-foreground text-xs">{label}</figcaption>
                  {/* crossOrigin: el canvas lee el mapa grey con getImageData */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={label}
                    crossOrigin="anonymous"
                    className="max-h-64 rounded-md"
                  />
                </figure>
              ) : null,
            )}
          </div>
        </div>
      ) : null}

      <p className="text-muted-foreground text-sm">
        {jobs ? `Trabajos registrados: ${jobs.length}` : "Cargando trabajos…"}
      </p>
    </div>
  );
}

// Las queries de `depth` lanzan "Not authenticated" en vez de devolver null, así que
// el componente solo se monta cuando el cliente ya tiene el token.
export default function DepthTestPage() {
  return (
    <>
      <AuthLoading>
        <p className="p-6 text-muted-foreground text-sm">Comprobando sesión…</p>
      </AuthLoading>
      <Authenticated>
        <DepthTester />
      </Authenticated>
    </>
  );
}
