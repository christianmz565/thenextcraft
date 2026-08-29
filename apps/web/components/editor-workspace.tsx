"use client";

import {
  AlertTriangle,
  Box,
  Image as ImageIcon,
  Lock,
  RefreshCw,
  ScanLine,
  Type,
} from "lucide-react";
import { useState } from "react";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { BrandMark } from "@/components/brand-mark";
import { ImageDropzone } from "@/components/image-dropzone";
import { Button } from "@/components/ui/button";
import { type UploadedImage, useImageUpload } from "@/hooks/use-image-upload";
import { cn } from "@/lib/utils";

type Step = "scene" | "product" | "text";

export function EditorWorkspace() {
  const scene = useImageUpload("scene");
  const product = useImageUpload("object");
  const [step, setStep] = useState<Step>("scene");

  const hasScene = scene.image !== null;
  const hasProduct = product.image !== null;
  const canProcess = hasScene && hasProduct;

  const steps = [
    {
      id: "scene" as const,
      index: "01",
      label: "Fondo",
      icon: ImageIcon,
      state: hasScene ? "Cargado" : "Requerido",
      locked: false,
    },
    {
      id: "product" as const,
      index: "02",
      label: "Producto",
      icon: Box,
      state: hasProduct ? "Cargado" : hasScene ? "Pendiente" : "Sube el fondo",
      locked: !hasScene,
    },
    {
      id: "text" as const,
      index: "03",
      label: "Texto",
      icon: Type,
      state: "Opcional",
      locked: !canProcess,
    },
  ];

  return (
    <main className="flex min-h-svh flex-col overflow-x-hidden bg-workspace text-foreground">
      <header className="z-30 flex min-h-16 items-center border-b bg-background">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center border-r lg:w-64 lg:justify-start lg:px-5">
          <BrandMark href="/app" compact className="lg:hidden" />
          <div className="hidden lg:block">
            <BrandMark href="/app" />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-3 md:px-4">
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-medium">Composición</p>
            <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              {hasScene ? "Fondo cargado" : "Esperando fondo"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              disabled={!canProcess}
              title={!canProcess ? "Sube fondo y producto" : undefined}
            >
              <ScanLine aria-hidden="true" />
              <span className="hidden sm:inline">Procesar profundidad</span>
              <span className="sm:hidden">Procesar</span>
            </Button>
            <div className="hidden lg:block">
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
        <aside className="border-b bg-background lg:border-r lg:border-b-0">
          <div className="grid grid-cols-3 lg:block">
            {steps.map(({ id, index, label, icon: Icon, state, locked }) => (
              <button
                key={id}
                type="button"
                onClick={() => setStep(id)}
                aria-pressed={step === id}
                className={cn(
                  "flex min-h-18 items-center gap-3 border-r px-3 text-left last:border-r-0 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:w-full lg:border-r-0 lg:border-b lg:px-5",
                  step === id && "bg-foreground text-background hover:bg-foreground",
                  locked && step !== id && "opacity-55",
                )}
              >
                <span className="hidden font-mono text-[10px] opacity-60 lg:block">{index}</span>
                {locked ? (
                  <Lock className="size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                )}
                <span className="min-w-0">
                  <strong className="block text-xs font-medium lg:text-sm">{label}</strong>
                  <span className="hidden text-[10px] opacity-60 lg:block">{state}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="border-t p-5">
            <StepPanel
              step={step}
              scene={scene.image}
              product={product.image}
              onResetScene={scene.reset}
              onResetProduct={product.reset}
            />
          </div>
        </aside>

        <section className="technical-grid flex min-h-120 flex-1 items-center justify-center p-3 md:p-8">
          {step === "product" ? (
            <ProductStage
              product={product.image}
              busy={product.isUploading}
              error={product.error}
              locked={!hasScene}
              onSelect={(file) => void product.upload(file)}
            />
          ) : (
            <SceneStage
              scene={scene.image}
              busy={scene.isUploading}
              error={scene.error}
              onSelect={(file) => void scene.upload(file)}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function SceneStage({
  scene,
  busy,
  error,
  onSelect,
}: {
  scene: UploadedImage | null;
  busy: boolean;
  error: string | null;
  onSelect: (file: File) => void;
}) {
  if (!scene) {
    return (
      <div className="w-full max-w-3xl">
        <ImageDropzone
          title="Empieza por el fondo"
          hint="Sube la imagen del espacio. A partir de ella se genera la profundidad y se coloca el producto."
          busy={busy}
          onSelect={onSelect}
        />
        {error ? <ErrorNote message={error} /> : null}
      </div>
    );
  }

  return (
    <figure className="w-full max-w-5xl border border-foreground/50 bg-background p-2 shadow-[8px_8px_0_0_var(--foreground)] md:p-3">
      <figcaption className="mb-2 flex items-center justify-between border-b px-1 pb-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        <span className="truncate">{scene.fileName}</span>
        <span>
          {scene.width} × {scene.height}
        </span>
      </figcaption>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={scene.previewUrl}
        alt={`Fondo cargado: ${scene.fileName}`}
        className="max-h-[70svh] w-full bg-canvas object-contain"
      />
    </figure>
  );
}

function ProductStage({
  product,
  busy,
  error,
  locked,
  onSelect,
}: {
  product: UploadedImage | null;
  busy: boolean;
  error: string | null;
  locked: boolean;
  onSelect: (file: File) => void;
}) {
  if (locked) {
    return (
      <div className="flex max-w-md flex-col items-center gap-3 border border-dashed p-8 text-center">
        <Lock className="size-7" aria-hidden="true" />
        <p className="text-xl font-medium tracking-tight">Primero el fondo</p>
        <p className="text-sm leading-6 text-muted-foreground">
          El producto se coloca sobre la escena, así que necesitas cargar el fondo antes de
          continuar.
        </p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="w-full max-w-3xl">
        <ImageDropzone
          title="Sube el producto"
          hint="Usa una imagen del producto. Se limpiará el fondo para integrarlo en la escena."
          busy={busy}
          onSelect={onSelect}
        />
        {error ? <ErrorNote message={error} /> : null}
      </div>
    );
  }

  return (
    <figure className="w-full max-w-xl border border-foreground/50 bg-background p-2 md:p-3">
      <figcaption className="mb-2 flex items-center justify-between border-b px-1 pb-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        <span className="truncate">{product.fileName}</span>
        <span>
          {product.width} × {product.height}
        </span>
      </figcaption>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={product.previewUrl}
        alt={`Producto cargado: ${product.fileName}`}
        className="checkerboard max-h-[60svh] w-full object-contain"
      />
    </figure>
  );
}

function StepPanel({
  step,
  scene,
  product,
  onResetScene,
  onResetProduct,
}: {
  step: Step;
  scene: UploadedImage | null;
  product: UploadedImage | null;
  onResetScene: () => void;
  onResetProduct: () => void;
}) {
  if (step === "text") {
    return (
      <>
        <PanelHeading index="03" title="Texto" text="Capas tipográficas opcionales." />
        <p className="border-y py-4 text-sm leading-6 text-muted-foreground">
          Disponible después de generar la profundidad y la vista del producto.
        </p>
      </>
    );
  }

  const isScene = step === "scene";
  const asset = isScene ? scene : product;

  return (
    <>
      <PanelHeading
        index={isScene ? "01" : "02"}
        title={isScene ? "Fondo" : "Producto"}
        text={
          isScene
            ? "Imagen del espacio donde se integrará el producto."
            : "Imagen del producto que se colocará en la escena."
        }
      />
      {asset ? (
        <>
          <div className="border-y py-4">
            <p className="truncate text-xs font-medium">{asset.fileName}</p>
            <p className="mt-1 font-mono text-[9px] text-muted-foreground">
              {asset.width} × {asset.height} · {formatBytes(asset.size)}
            </p>
          </div>
          <Button
            variant="ghost"
            className="mt-3 w-full"
            onClick={isScene ? onResetScene : onResetProduct}
          >
            <RefreshCw aria-hidden="true" /> Cambiar imagen
          </Button>
        </>
      ) : (
        <p className="border-y py-4 text-sm leading-6 text-muted-foreground">
          Sube la imagen en el área central para continuar.
        </p>
      )}
    </>
  );
}

function PanelHeading({ index, title, text }: { index: string; title: string; text: string }) {
  return (
    <div className="mb-6">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {index} / Recurso
      </p>
      <h2 className="mt-2 text-2xl font-medium tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p className="mt-3 flex items-start gap-2 border border-destructive p-3 text-sm text-destructive">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
