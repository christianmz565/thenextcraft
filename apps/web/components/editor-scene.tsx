import { Move3d } from "lucide-react";

import { cn } from "@/lib/utils";

type EditorSceneProps = { className?: string; compact?: boolean };

export function EditorScene({ className, compact = false }: EditorSceneProps) {
  return (
    <div
      role="img"
      className={cn("editor-scene relative isolate min-h-90 overflow-hidden bg-canvas", className)}
      aria-label="Previsualización de escena editorial con una silla seleccionada"
    >
      <div className="scene-ceiling" aria-hidden="true" />
      <div className="scene-wall scene-wall-left" aria-hidden="true" />
      <div className="scene-wall scene-wall-right" aria-hidden="true" />
      <div className="scene-floor" aria-hidden="true" />
      <div className="scene-lines" aria-hidden="true" />
      <div className="scene-plinth" aria-hidden="true" />
      <div className="scene-product" aria-hidden="true">
        <span className="scene-product-back" />
        <span className="scene-product-seat" />
        <span className="scene-product-leg scene-product-leg-a" />
        <span className="scene-product-leg scene-product-leg-b" />
      </div>
      <div className="scene-selection" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      {!compact ? (
        <>
          <div className="absolute left-4 top-4 border border-foreground/50 bg-background/80 px-2 py-1 font-mono text-[10px] uppercase tracking-wider">
            Cámara 01 · 35 mm
          </div>
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-foreground px-3 py-2 text-[10px] uppercase tracking-wider text-background">
            <Move3d className="size-3" aria-hidden="true" />
            Objeto seleccionado
          </div>
          <div
            className="absolute right-4 top-1/2 size-3 -translate-y-1/2 border border-foreground bg-background"
            title="Punto de fuga"
            aria-hidden="true"
          />
        </>
      ) : null}
    </div>
  );
}
