"use client";

import type { Id } from "backend/convex/_generated/dataModel.js";
import type { HydratedDepthMap } from "backend/convex/depth.js";
import { AlertTriangle, Check, Download, Link2, Loader2, Sparkles } from "lucide-react";
import { type ReactNode, useCallback, useState } from "react";

import { DepthStage, type Placement } from "@/components/depth-stage";
import { RotationGizmo } from "@/components/rotation-gizmo";
import { Button } from "@/components/ui/button";
import { useProductAngles } from "@/hooks/use-product-angles";
import { cameraFromRotation, type Rotation, radToDeg } from "@/lib/depth-scene";
import { cn } from "@/lib/utils";

type StorageId = Id<"_storage">;

export function PerspectivePanel({ job }: { job: HydratedDepthMap }) {
  const angles = useProductAngles();
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [rotation, setRotation] = useState<Rotation>({ x: 0, y: 0, z: 0 });
  const [selected, setSelected] = useState<{ url: string; storageId: StorageId } | null>(null);
  const [chain, setChain] = useState(false);
  const [exportRequestId, setExportRequestId] = useState(0);

  const onPlacementChange = useCallback((next: Placement | null) => setPlacement(next), []);

  const onExported = useCallback((dataUrl: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `composicion-${Date.now()}.png`;
    link.click();
  }, []);

  const camera = cameraFromRotation(rotation);

  async function generate() {
    // Chaining keeps rotating the already generated image; otherwise start from the original.
    const source = chain && selected ? selected.storageId : job.objectStorageId;
    const id = await angles.generate({
      sourceStorageId: source,
      rotateDegrees: camera.rotateDegrees,
      verticalTilt: camera.verticalTilt,
    });
    // The new image already is that perspective: keeping the manual spin would double it.
    if (id) setRotation({ x: 0, y: 0, z: 0 });
  }

  if (!job.sceneUrl || !job.depthUrl) {
    return (
      <p className="border border-foreground/50 bg-background p-8 text-center text-sm text-muted-foreground">
        Necesitas un mapa de profundidad para trabajar las perspectivas.
      </p>
    );
  }

  const hasPlacement = placement !== null;
  const hasAngles = angles.completed.length > 0;

  return (
    <div className="flex w-full max-w-6xl flex-col gap-4 lg:flex-row">
      <div className="min-w-0 flex-1">
        <DepthStage
          sceneUrl={job.sceneUrl}
          depthUrl={job.depthUrl}
          colorDepthUrl={job.colorDepthUrl}
          overlayUrl={selected?.url ?? null}
          rotation={rotation}
          onPlacementChange={onPlacementChange}
          exportRequestId={exportRequestId}
          onExported={onExported}
        />
      </div>

      <aside className="w-full shrink-0 divide-y border border-foreground/50 bg-background lg:w-80">
        <Step
          index="01"
          title="Coloca el objeto"
          state={hasPlacement ? "done" : "active"}
          hint="Haz clic en la escena. El tamaño sale de la profundidad del punto."
        >
          {placement ? (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider">
              <dt className="text-muted-foreground">Profundidad</dt>
              <dd className="text-right tabular-nums">{Math.round(placement.cube.depth)}</dd>
              <dt className="text-muted-foreground">Lado</dt>
              <dd className="text-right tabular-nums">
                {Math.round(placement.cube.size * placement.scale)} px
              </dd>
            </dl>
          ) : null}
        </Step>

        <Step
          index="02"
          title="Orienta la cámara"
          state={hasPlacement ? "active" : "blocked"}
          hint="Arrastra el cubo de control u ajusta cada eje. Y define el giro, X la inclinación."
        >
          <RotationGizmo rotation={rotation} onChange={setRotation} />
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 border-t pt-3 font-mono text-[10px] uppercase tracking-wider">
            <dt className="text-muted-foreground">Giro enviado</dt>
            <dd className="text-right tabular-nums">{camera.rotateDegrees}°</dd>
            <dt className="text-muted-foreground">Inclinación</dt>
            <dd className="text-right">{tiltLabel(camera.verticalTilt)}</dd>
            <dt className="text-muted-foreground">Eje Z</dt>
            <dd className="text-right">solo vista</dd>
          </dl>
          {Math.abs(radToDeg(rotation.y)) > 90 ? (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              El servicio admite hasta 90°; el giro se recortará.
            </p>
          ) : null}
        </Step>

        <Step
          index="03"
          title="Genera la perspectiva"
          state={hasAngles ? "done" : hasPlacement ? "active" : "blocked"}
          hint="Se envía el producto con el ángulo elegido."
        >
          {selected ? (
            <label className="mb-3 flex min-h-8 items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={chain}
                onChange={(event) => setChain(event.target.checked)}
                className="size-3.5 accent-foreground"
              />
              <Link2 className="size-3.5" aria-hidden="true" />
              Encadenar desde la perspectiva actual
            </label>
          ) : null}
          <Button
            className="w-full"
            disabled={!hasPlacement || angles.isRunning}
            onClick={() => void generate()}
          >
            {angles.isRunning ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles aria-hidden="true" />
            )}
            {angles.isRunning ? "Generando…" : "Generar perspectiva"}
          </Button>
          {angles.isRunning ? (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Estado: {statusLabel(angles.status)}
            </p>
          ) : null}
          {angles.error ? (
            <p className="mt-2 flex items-start gap-2 border border-destructive p-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {angles.error}
            </p>
          ) : null}
        </Step>

        <Step
          index="04"
          title="Sustituye y exporta"
          state={selected ? "done" : hasAngles ? "active" : "blocked"}
          hint="Elige una perspectiva para reemplazar el cubo en la escena."
        >
          {angles.isRestoring ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : hasAngles ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-pressed={selected === null}
                  className={cn(
                    "grid aspect-square place-items-center border font-mono text-[8px] uppercase",
                    selected === null && "border-foreground bg-foreground text-background",
                  )}
                >
                  Cubo
                </button>
                {angles.completed.map((angle) =>
                  angle.resultUrl && angle.resultStorageId ? (
                    <button
                      key={angle._id}
                      type="button"
                      onClick={() =>
                        setSelected({
                          url: angle.resultUrl as string,
                          storageId: angle.resultStorageId as StorageId,
                        })
                      }
                      aria-pressed={selected?.url === angle.resultUrl}
                      className={cn(
                        "checkerboard aspect-square border p-0.5",
                        selected?.url === angle.resultUrl && "border-foreground",
                      )}
                      title={`${angle.rotateDegrees}° · ${tiltLabel(angle.verticalTilt ?? 0)}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={angle.resultUrl}
                        alt={`Perspectiva ${angle.rotateDegrees}°`}
                        crossOrigin="anonymous"
                        className="size-full object-contain"
                      />
                    </button>
                  ) : null,
                )}
              </div>
              <Button
                variant="outline"
                className="mt-3 w-full"
                disabled={!hasPlacement}
                onClick={() => setExportRequestId((value) => value + 1)}
              >
                <Download aria-hidden="true" /> Exportar PNG
              </Button>
            </>
          ) : null}
        </Step>
      </aside>
    </div>
  );
}

function Step({
  index,
  title,
  state,
  hint,
  children,
}: {
  index: string;
  title: string;
  state: "done" | "active" | "blocked";
  hint: string;
  children?: ReactNode;
}) {
  return (
    <section className={cn("p-4", state === "blocked" && "opacity-55")}>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "grid size-5 shrink-0 place-items-center border font-mono text-[9px]",
            state === "done" && "border-foreground bg-foreground text-background",
            state === "active" && "border-foreground",
          )}
        >
          {state === "done" ? <Check className="size-3" aria-hidden="true" /> : index}
        </span>
        <h3 className="text-sm font-medium tracking-tight">{title}</h3>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{hint}</p>
      {children ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}

function statusLabel(status: string) {
  if (status === "pending") return "En cola";
  if (status === "processing") return "Procesando";
  if (status === "completed") return "Listo";
  if (status === "failed") return "Falló";
  return "Sin iniciar";
}

function tiltLabel(tilt: number) {
  if (tilt < 0) return "Pájaro";
  if (tilt > 0) return "Gusano";
  return "Nivel";
}
