"use client";

import { Authenticated, AuthLoading } from "convex/react";
import { AlertTriangle, Check, Loader2, Lock, RefreshCw, ScanLine } from "lucide-react";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { BrandMark } from "@/components/brand-mark";
import { DepthResult } from "@/components/depth-result";
import { ImageDropzone } from "@/components/image-dropzone";
import { Button } from "@/components/ui/button";
import { useDepthJob } from "@/hooks/use-depth-job";
import { type UploadedImage, useImageUpload } from "@/hooks/use-image-upload";
import { cn } from "@/lib/utils";

export function EditorWorkspace() {
  return (
    <main className="flex min-h-svh flex-col overflow-x-hidden bg-workspace text-foreground">
      <AuthLoading>
        <div className="grid flex-1 place-items-center p-6">
          <p className="text-sm text-muted-foreground">Comprobando sesión…</p>
        </div>
      </AuthLoading>
      <Authenticated>
        <EditorSurface />
      </Authenticated>
    </main>
  );
}

function EditorSurface() {
  const scene = useImageUpload("scene");
  const product = useImageUpload("object");
  const depth = useDepthJob();

  const hasScene = scene.image !== null;
  const hasProduct = product.image !== null;
  const bothReady = hasScene && hasProduct;
  const isCompleted = depth.status === "completed";
  const isRestoring = depth.isRestoring || scene.isRestoring || product.isRestoring;

  if (isRestoring) {
    return (
      <div className="grid flex-1 place-items-center p-6">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Recuperando tu trabajo…
        </p>
      </div>
    );
  }

  async function process() {
    if (!scene.image || !product.image) return;
    await depth.start({
      sceneStorageId: scene.image.storageId,
      objectStorageId: product.image.storageId,
    });
  }

  return (
    <>
      <header className="z-30 flex min-h-16 items-center border-b bg-background">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center border-r lg:w-72 lg:justify-start lg:px-5">
          <BrandMark href="/app" compact className="lg:hidden" />
          <div className="hidden lg:block">
            <BrandMark href="/app" />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-3 md:px-4">
          <ol className="hidden min-w-0 items-center gap-3 font-mono text-[10px] uppercase tracking-wider md:flex">
            <StepChip index="01" label="Imágenes" done={bothReady} active={!bothReady} />
            <span className="text-muted-foreground">→</span>
            <StepChip
              index="02"
              label="Profundidad"
              done={isCompleted}
              active={bothReady && !isCompleted}
            />
          </ol>
          <div className="flex items-center gap-2">
            <Button
              disabled={!bothReady || depth.isRunning}
              onClick={() => void process()}
              title={!bothReady ? "Sube el fondo y el producto" : undefined}
            >
              {depth.isRunning ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <ScanLine aria-hidden="true" />
              )}
              <span className="hidden sm:inline">
                {depth.isRunning ? "Procesando…" : isCompleted ? "Procesar de nuevo" : "Procesar"}
              </span>
              <span className="sm:hidden">Procesar</span>
            </Button>
            <div className="hidden lg:block">
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[288px_minmax(0,1fr)]">
        <aside className="border-b bg-background lg:border-r lg:border-b-0">
          <div className="border-b p-5">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              Paso 01 / Requerido
            </p>
            <h2 className="mt-2 text-2xl font-medium tracking-tight">Imágenes</h2>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              Sube el fondo y el producto. Ambos son necesarios para generar la profundidad.
            </p>
          </div>
          <AssetRow
            index="A"
            label="Fondo"
            asset={scene.image}
            onReset={() => {
              scene.reset();
              depth.reset();
            }}
          />
          <AssetRow
            index="B"
            label="Producto"
            asset={product.image}
            onReset={() => {
              product.reset();
              depth.reset();
            }}
          />
          <div className="border-b p-5">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              Paso 02
            </p>
            <h3 className="mt-2 flex items-center gap-2 text-sm font-medium">
              {bothReady ? null : <Lock className="size-3.5" aria-hidden="true" />}
              Mapa de profundidad
            </h3>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              {bothReady
                ? "Envía las imágenes al servicio para estimar la profundidad de la escena."
                : "Se activa cuando ambas imágenes estén cargadas."}
            </p>
            {depth.status !== "idle" ? (
              <>
                <p className="mt-4 border-t pt-3 font-mono text-[10px] uppercase tracking-wider">
                  Estado: {statusLabel(depth.status)}
                </p>
                {isCompleted ? (
                  <Button
                    variant="ghost"
                    className="mt-3 w-full"
                    onClick={() => {
                      depth.reset();
                      scene.reset();
                      product.reset();
                    }}
                  >
                    <RefreshCw aria-hidden="true" /> Empezar de nuevo
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        </aside>

        <section className="technical-grid flex min-h-120 flex-1 flex-col items-center justify-center gap-4 p-3 md:p-8">
          {depth.error ? <ErrorNote message={depth.error} /> : null}
          {isCompleted && depth.job ? (
            <DepthResult job={depth.job} />
          ) : (
            <div className="grid w-full max-w-6xl gap-4 lg:grid-cols-2">
              <UploadSlot
                title="Fondo"
                hint="Imagen del espacio donde se integrará el producto."
                asset={scene.image}
                busy={scene.isUploading}
                error={scene.error}
                onSelect={(file) => void scene.upload(file)}
              />
              <UploadSlot
                title="Producto"
                hint="Imagen del producto que se colocará en la escena."
                asset={product.image}
                busy={product.isUploading}
                error={product.error}
                checkerboard
                onSelect={(file) => void product.upload(file)}
              />
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function StepChip({
  index,
  label,
  done,
  active,
}: {
  index: string;
  label: string;
  done: boolean;
  active: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-2 border px-2 py-1",
        done && "bg-foreground text-background",
        !done && active && "border-foreground",
        !done && !active && "text-muted-foreground",
      )}
    >
      {done ? <Check className="size-3" aria-hidden="true" /> : <span>{index}</span>}
      {label}
    </li>
  );
}

function UploadSlot({
  title,
  hint,
  asset,
  busy,
  error,
  checkerboard = false,
  onSelect,
}: {
  title: string;
  hint: string;
  asset: UploadedImage | null;
  busy: boolean;
  error: string | null;
  checkerboard?: boolean;
  onSelect: (file: File) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      {asset ? (
        <figure className="border border-foreground/50 bg-background p-2">
          <figcaption className="mb-2 flex items-center justify-between gap-3 border-b px-1 pb-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            <span className="truncate">{title}</span>
            {asset.width && asset.height ? (
              <span>
                {asset.width} × {asset.height}
              </span>
            ) : (
              <span>Guardado</span>
            )}
          </figcaption>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset.previewUrl}
            alt={`${title}: ${asset.fileName}`}
            className={cn(
              "max-h-[46svh] w-full object-contain",
              checkerboard ? "checkerboard" : "bg-canvas",
            )}
          />
        </figure>
      ) : (
        <ImageDropzone
          title={`Sube el ${title.toLowerCase()}`}
          hint={hint}
          busy={busy}
          onSelect={onSelect}
        />
      )}
      {error ? <ErrorNote message={error} /> : null}
    </div>
  );
}

function AssetRow({
  index,
  label,
  asset,
  onReset,
}: {
  index: string;
  label: string;
  asset: UploadedImage | null;
  onReset: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b p-5">
      <div className="min-w-0">
        <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          {index} · {label}
        </p>
        {asset ? (
          <>
            <p className="mt-1 truncate text-sm font-medium">{asset.fileName}</p>
            <p className="mt-1 font-mono text-[9px] text-muted-foreground">
              {describeAsset(asset)}
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Sin cargar</p>
        )}
      </div>
      {asset ? (
        <Button variant="ghost" size="icon-sm" aria-label={`Cambiar ${label}`} onClick={onReset}>
          <RefreshCw />
        </Button>
      ) : null}
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p className="mt-3 flex w-full max-w-3xl items-start gap-2 border border-destructive bg-background p-3 text-sm text-destructive">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

function statusLabel(status: string) {
  if (status === "pending") return "En cola";
  if (status === "processing") return "Procesando";
  if (status === "completed") return "Listo";
  if (status === "failed") return "Falló";
  return "Sin iniciar";
}

function describeAsset(asset: UploadedImage) {
  const parts: string[] = [];
  if (asset.width && asset.height) parts.push(`${asset.width} × ${asset.height}`);
  if (asset.size !== null) parts.push(formatBytes(asset.size));
  return parts.length > 0 ? parts.join(" · ") : "Recuperado del almacenamiento";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
