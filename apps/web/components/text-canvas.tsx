"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { drawTextLayer, type TextLayer, textLayerBounds } from "@/lib/text-layers";
import { cn } from "@/lib/utils";

type TextCanvasProps = {
  sceneUrl: string;
  /** Subject cutout drawn on top of the text; null renders text over the scene. */
  cutoutUrl: string | null;
  layers: TextLayer[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  exportRequestId: number;
  onExported: (dataUrl: string) => void;
};

/**
 * The text-behind sandwich: scene at the back, text layers in the middle, subject
 * cutout on top. Layers are dragged directly on the canvas; the export re-renders
 * at the scene's natural resolution so text stays sharp.
 */
export function TextCanvas({
  sceneUrl,
  cutoutUrl,
  layers,
  selectedId,
  onSelect,
  onMove,
  exportRequestId,
  onExported,
}: TextCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneImageRef = useRef<HTMLImageElement | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const dragRef = useRef<string | null>(null);

  const [ready, setReady] = useState(false);
  const [cutoutImage, setCutoutImage] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setLoadError(null);
    loadImage(sceneUrl)
      .then((image) => {
        if (cancelled) return;
        sceneImageRef.current = image;
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError("No se pudo cargar el fondo.");
      });
    return () => {
      cancelled = true;
    };
  }, [sceneUrl]);

  useEffect(() => {
    let cancelled = false;
    if (!cutoutUrl) {
      setCutoutImage(null);
      return;
    }
    loadImage(cutoutUrl)
      .then((image) => {
        if (!cancelled) setCutoutImage(image);
      })
      .catch(() => {
        if (!cancelled) setCutoutImage(null);
      });
    return () => {
      cancelled = true;
    };
  }, [cutoutUrl]);

  const drawComposition = useCallback(
    (context: CanvasRenderingContext2D, width: number, height: number) => {
      const scene = sceneImageRef.current;
      if (!scene) return;
      context.clearRect(0, 0, width, height);
      context.drawImage(scene, 0, 0, width, height);
      for (const layer of layers) drawTextLayer(context, layer, width, height);
      if (cutoutImage) context.drawImage(cutoutImage, 0, 0, width, height);
    },
    [cutoutImage, layers],
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const { width, height } = sizeRef.current;
    if (!canvas || !context || !width || !height) return;

    drawComposition(context, width, height);

    // Selection outline, only on the interactive canvas — never exported.
    const selected = layers.find((layer) => layer.id === selectedId);
    if (selected) {
      const bounds = textLayerBounds(context, selected, width, height);
      context.save();
      context.strokeStyle = "rgba(120, 120, 255, 0.9)";
      context.lineWidth = 1.5;
      context.setLineDash([4, 4]);
      context.strokeRect(
        bounds.left - 6,
        bounds.top - 6,
        bounds.right - bounds.left + 12,
        bounds.bottom - bounds.top + 12,
      );
      context.restore();
    }
  }, [drawComposition, layers, selectedId]);

  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const scene = sceneImageRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !scene || !container) return;

    const resize = () => {
      const maxWidth = container.clientWidth - 16;
      const maxHeight = Math.max(320, Math.round(window.innerHeight * 0.6));
      const ratio = Math.min(maxWidth / scene.naturalWidth, maxHeight / scene.naturalHeight);
      const width = Math.max(1, Math.round(scene.naturalWidth * ratio));
      const height = Math.max(1, Math.round(scene.naturalHeight * ratio));
      sizeRef.current = { width, height };
      canvas.width = width;
      canvas.height = height;
      render();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [ready, render]);

  useEffect(() => {
    if (ready) render();
  }, [ready, render]);

  // Export at natural resolution: relative coordinates make the re-render exact.
  useEffect(() => {
    if (!exportRequestId) return;
    const scene = sceneImageRef.current;
    if (!scene) return;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = scene.naturalWidth;
    exportCanvas.height = scene.naturalHeight;
    const context = exportCanvas.getContext("2d");
    if (!context) return;

    drawComposition(context, exportCanvas.width, exportCanvas.height);
    try {
      onExported(exportCanvas.toDataURL("image/png"));
    } catch {
      // A tainted canvas cannot be exported.
    }
  }, [drawComposition, exportRequestId, onExported]);

  function pointerPosition(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function layerAt(point: { x: number; y: number }): TextLayer | null {
    const context = canvasRef.current?.getContext("2d");
    const { width, height } = sizeRef.current;
    if (!context || !width || !height) return null;
    // Topmost layer wins, mirroring the paint order.
    for (let index = layers.length - 1; index >= 0; index -= 1) {
      const bounds = textLayerBounds(context, layers[index], width, height);
      if (
        point.x >= bounds.left &&
        point.x <= bounds.right &&
        point.y >= bounds.top &&
        point.y <= bounds.bottom
      ) {
        return layers[index];
      }
    }
    return null;
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!ready) return;
    const point = pointerPosition(event);
    const hit = layerAt(point);
    onSelect(hit?.id ?? null);
    if (hit) {
      dragRef.current = hit.id;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current) return;
    const { width, height } = sizeRef.current;
    if (!width || !height) return;
    const point = pointerPosition(event);
    onMove(
      dragRef.current,
      Math.min(1, Math.max(0, point.x / width)),
      Math.min(1, Math.max(0, point.y / height)),
    );
  }

  function endDrag(event: React.PointerEvent<HTMLCanvasElement>) {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div className="relative flex min-h-80 items-center justify-center border border-foreground/50 bg-canvas p-2">
      {!ready ? (
        <p className="flex items-center gap-2 p-8 text-center text-sm text-muted-foreground">
          {loadError ?? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Preparando escena…
            </>
          )}
        </p>
      ) : null}
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={cn("touch-none select-none", ready ? "cursor-move" : "hidden")}
        aria-label="Composición de texto. Haz clic sobre un texto para seleccionarlo y arrástralo."
      />
    </div>
  );
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    // Required so the composition can be exported with toDataURL.
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    image.src = src;
  });
}
