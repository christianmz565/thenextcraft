"use client";

import type { HydratedDepthMap } from "backend/convex/depth.js";
import { AlertTriangle, Download, Loader2, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";

import { DepthStage, type Placement } from "@/components/depth-stage";
import { Button } from "@/components/ui/button";
import { useProductAngles } from "@/hooks/use-product-angles";
import { cn } from "@/lib/utils";

export function PerspectivePanel({ job }: { job: HydratedDepthMap }) {
  const angles = useProductAngles();
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [exportRequestId, setExportRequestId] = useState(0);

  const onPlacementChange = useCallback((next: Placement | null) => setPlacement(next), []);

  const onExported = useCallback((dataUrl: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `composicion-${Date.now()}.png`;
    link.click();
  }, []);

  async function generate() {
    if (!placement) return;
    await angles.generate({
      sourceStorageId: job.objectStorageId,
      rotateDegrees: placement.camera.rotateDegrees,
      verticalTilt: placement.camera.verticalTilt,
    });
  }

  if (!job.sceneUrl || !job.depthUrl) {
    return (
      <p className="border border-foreground/50 bg-background p-8 text-center text-sm text-muted-foreground">
        Necesitas un mapa de profundidad para trabajar las perspectivas.
      </p>
    );
  }

  return (
    <div className="flex w-full max-w-6xl flex-col gap-4 lg:flex-row">
      <div className="min-w-0 flex-1">
        <DepthStage
          sceneUrl={job.sceneUrl}
          depthUrl={job.depthUrl}
          colorDepthUrl={job.colorDepthUrl}
          overlayUrl={selectedUrl}
          onPlacementChange={onPlacementChange}
          exportRequestId={exportRequestId}
          onExported={onExported}
        />
      </div>

      <aside className="w-full shrink-0 border border-foreground/50 bg-background lg:w-72">
        <div className="border-b p-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            Cámara derivada
          </p>
          <h3 className="mt-2 text-lg font-medium tracking-tight">Perspectiva</h3>
          {placement ? (
            <dl className="mt-3 space-y-1 font-mono text-[10px] uppercase tracking-wider">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Giro</dt>
                <dd>{placement.camera.rotateDegrees}°</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Inclinación</dt>
                <dd>{tiltLabel(placement.camera.verticalTilt)}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm leading-5 text-muted-foreground">
              Coloca el cubo en la escena para definir el ángulo.
            </p>
          )}
          <Button
            className="mt-4 w-full"
            disabled={!placement || angles.isRunning}
            onClick={() => void generate()}
          >
            {angles.isRunning ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles aria-hidden="true" />
            )}
            {angles.isRunning ? "Generando…" : "Generar perspectiva"}
          </Button>
          {angles.error ? (
            <p className="mt-3 flex items-start gap-2 border border-destructive p-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {angles.error}
            </p>
          ) : null}
        </div>

        <div className="border-b p-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            Perspectivas · {angles.completed.length}
          </p>
          {angles.isRestoring ? (
            <p className="mt-3 text-sm text-muted-foreground">Cargando…</p>
          ) : angles.completed.length === 0 ? (
            <p className="mt-3 text-sm leading-5 text-muted-foreground">
              Todavía no generaste ninguna.
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedUrl(null)}
                aria-pressed={selectedUrl === null}
                className={cn(
                  "grid aspect-square place-items-center border font-mono text-[8px] uppercase",
                  selectedUrl === null && "border-foreground bg-foreground text-background",
                )}
              >
                Cubo
              </button>
              {angles.completed.map((angle) =>
                angle.resultUrl ? (
                  <button
                    key={angle._id}
                    type="button"
                    onClick={() => setSelectedUrl(angle.resultUrl)}
                    aria-pressed={selectedUrl === angle.resultUrl}
                    className={cn(
                      "checkerboard aspect-square border p-0.5",
                      selectedUrl === angle.resultUrl && "border-foreground",
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
          )}
        </div>

        <div className="p-4">
          <Button
            variant="outline"
            className="w-full"
            disabled={!placement}
            onClick={() => setExportRequestId((value) => value + 1)}
          >
            <Download aria-hidden="true" /> Exportar PNG
          </Button>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Exporta la escena con el producto tal como se ve en el lienzo.
          </p>
        </div>
      </aside>
    </div>
  );
}

function tiltLabel(tilt: number) {
  if (tilt < 0) return "Pájaro";
  if (tilt > 0) return "Gusano";
  return "Nivel";
}
