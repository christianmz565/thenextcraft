"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  type AlphaBox,
  type Cube,
  computeAlphaBBox,
  cubeVertices,
  type DepthField,
  depthToSize,
  estimateVanishingPoint,
  type Point,
  type Rotation,
  readDepthField,
  rotateVec3,
  sampleDepth,
  toDisplayPoint,
  toFieldPoint,
  VP_HANDLE_RADIUS,
} from "@/lib/depth-scene";
import { drawTextLayer, type TextLayer, textLayerBounds } from "@/lib/text-layers";
import { cn } from "@/lib/utils";

export type Placement = { cube: Cube; scale: number };

type SceneCanvasProps = {
  sceneUrl: string;
  depthUrl: string;
  colorDepthUrl: string | null;
  /** Product cutout that replaces the cube when a perspective is selected. */
  overlayUrl: string | null;
  rotation: Rotation;
  scale: number;
  showDepth: boolean;
  showVanishingPoint: boolean;
  showProduct: boolean;
  onPlacementChange: (placement: Placement | null) => void;
  exportRequestId: number;
  onExported: (dataUrl: string) => void;
  /**
   * Optional text sandwiched between the background and the product/cube, so the
   * product visually sits in front of it — same product image used everywhere else,
   * no separate subject extraction needed.
   */
  textLayers?: TextLayer[];
  selectedTextId?: string | null;
  /** "text" lets pointer events drag text layers instead of placing the cube. */
  interactionMode?: "place" | "text";
  onSelectText?: (id: string | null) => void;
  onMoveText?: (id: string, x: number, y: number) => void;
};

export function SceneCanvas({
  sceneUrl,
  depthUrl,
  colorDepthUrl,
  overlayUrl,
  rotation,
  scale,
  showDepth,
  showVanishingPoint,
  showProduct,
  onPlacementChange,
  exportRequestId,
  onExported,
  textLayers = [],
  selectedTextId = null,
  interactionMode = "place",
  onSelectText,
  onMoveText,
}: SceneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneImageRef = useRef<HTMLImageElement | null>(null);
  const depthVisualRef = useRef<HTMLImageElement | null>(null);
  const fieldRef = useRef<DepthField | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const dragRef = useRef<"cube" | "vp" | "text" | null>(null);
  const dragTextIdRef = useRef<string | null>(null);

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cube, setCube] = useState<Cube | null>(null);
  const [vanishingPoint, setVanishingPoint] = useState<Point | null>(null);
  const [overlayImage, setOverlayImage] = useState<HTMLImageElement | null>(null);
  const [overlayBox, setOverlayBox] = useState<AlphaBox | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setLoadError(null);
    setCube(null);

    async function load() {
      try {
        const [scene, depth, colored] = await Promise.all([
          loadImage(sceneUrl),
          loadImage(depthUrl),
          colorDepthUrl ? loadImage(colorDepthUrl) : Promise.resolve(null),
        ]);
        if (cancelled) return;

        const field = readDepthField(depth);
        if (!field) {
          setLoadError("No se pudo leer el mapa de profundidad (CORS).");
          return;
        }

        sceneImageRef.current = scene;
        depthVisualRef.current = colored ?? depth;
        fieldRef.current = field;
        setVanishingPoint(estimateVanishingPoint(field));
        setReady(true);
      } catch {
        if (!cancelled) setLoadError("No se pudieron cargar las imágenes de la escena.");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [sceneUrl, depthUrl, colorDepthUrl]);

  useEffect(() => {
    let cancelled = false;
    if (!overlayUrl) {
      setOverlayImage(null);
      setOverlayBox(null);
      return;
    }
    loadImage(overlayUrl)
      .then((image) => {
        if (cancelled) return;
        setOverlayImage(image);
        setOverlayBox(computeAlphaBBox(image));
      })
      .catch(() => {
        if (!cancelled) {
          setOverlayImage(null);
          setOverlayBox(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [overlayUrl]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const scene = sceneImageRef.current;
    const field = fieldRef.current;
    if (!canvas || !scene || !field) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const { width, height } = sizeRef.current;
    if (!width || !height) return;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, width, height);
    context.drawImage(showDepth ? (depthVisualRef.current ?? scene) : scene, 0, 0, width, height);

    const vpDisplay = vanishingPoint
      ? toDisplayPoint(vanishingPoint, field, width, height)
      : { x: width / 2, y: height / 2 };

    const ink = readCssColor(canvas, "--foreground");
    const surface = readCssColor(canvas, "--background");

    // Text sits behind the product/cube, so the inserted object reads as being in
    // front of it — same sandwich as the reference "text behind subject" effect.
    for (const layer of textLayers) drawTextLayer(context, layer, width, height);

    if (cube && showProduct && overlayImage && overlayBox) {
      drawProductSheet(context, cube, scale, rotation, overlayImage, overlayBox);
    } else if (cube) {
      drawCube(context, cube, vpDisplay, scale, ink, surface);
    }

    if (showVanishingPoint) {
      drawVanishingPoint(context, vpDisplay, cube, ink, surface);
    }

    if (interactionMode === "text" && selectedTextId) {
      const selected = textLayers.find((layer) => layer.id === selectedTextId);
      if (selected) drawTextSelection(context, selected, width, height, ink);
    }
  }, [
    cube,
    interactionMode,
    overlayBox,
    overlayImage,
    rotation,
    scale,
    selectedTextId,
    showDepth,
    showProduct,
    showVanishingPoint,
    textLayers,
    vanishingPoint,
  ]);

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

  useEffect(() => {
    onPlacementChange(cube ? { cube, scale } : null);
  }, [cube, onPlacementChange, scale]);

  useEffect(() => {
    if (!exportRequestId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      onExported(canvas.toDataURL("image/png"));
    } catch {
      // A tainted canvas cannot be exported.
    }
  }, [exportRequestId, onExported]);

  function pointerPosition(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function placeCube(point: Point) {
    const field = fieldRef.current;
    const { width, height } = sizeRef.current;
    if (!field) return;
    const depth = sampleDepth(field, point.x, point.y, width, height);
    if (depth === null) return;
    setCube({ x: point.x, y: point.y, size: depthToSize(field, depth), depth });
  }

  function textLayerAt(point: Point): TextLayer | null {
    const context = canvasRef.current?.getContext("2d");
    const { width, height } = sizeRef.current;
    if (!context || !width || !height) return null;
    // Topmost layer wins, mirroring paint order.
    for (let index = textLayers.length - 1; index >= 0; index -= 1) {
      const bounds = textLayerBounds(context, textLayers[index], width, height);
      if (
        point.x >= bounds.left &&
        point.x <= bounds.right &&
        point.y >= bounds.top &&
        point.y <= bounds.bottom
      ) {
        return textLayers[index];
      }
    }
    return null;
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!ready) return;
    const point = pointerPosition(event);

    if (interactionMode === "text") {
      const hit = textLayerAt(point);
      onSelectText?.(hit?.id ?? null);
      if (hit) {
        dragRef.current = "text";
        dragTextIdRef.current = hit.id;
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      return;
    }

    const field = fieldRef.current;
    const { width, height } = sizeRef.current;
    if (!field) return;

    event.currentTarget.setPointerCapture(event.pointerId);

    if (showVanishingPoint && vanishingPoint) {
      const vp = toDisplayPoint(vanishingPoint, field, width, height);
      if (Math.hypot(point.x - vp.x, point.y - vp.y) <= VP_HANDLE_RADIUS + 6) {
        dragRef.current = "vp";
        return;
      }
    }

    dragRef.current = "cube";
    placeCube(point);
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current) return;
    const { width, height } = sizeRef.current;
    const point = pointerPosition(event);

    if (dragRef.current === "text") {
      const id = dragTextIdRef.current;
      if (id && width && height) {
        onMoveText?.(
          id,
          Math.min(1, Math.max(0, point.x / width)),
          Math.min(1, Math.max(0, point.y / height)),
        );
      }
      return;
    }

    const field = fieldRef.current;
    if (!field) return;

    if (dragRef.current === "vp") {
      setVanishingPoint(toFieldPoint(point, field, width, height));
      return;
    }
    placeCube(point);
  }

  function endDrag(event: React.PointerEvent<HTMLCanvasElement>) {
    dragRef.current = null;
    dragTextIdRef.current = null;
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
        className={cn(
          "touch-none select-none",
          !ready && "hidden",
          ready && interactionMode === "text" ? "cursor-move" : "cursor-crosshair",
        )}
        aria-label={
          interactionMode === "text"
            ? "Escena. Haz clic sobre un texto para seleccionarlo y arrástralo."
            : "Escena. Haz clic o arrastra para colocar la referencia."
        }
      />
    </div>
  );
}

type Ink = { r: number; g: number; b: number };

/** Dashed outline around the selected text layer, shown only while editing text. */
function drawTextSelection(
  context: CanvasRenderingContext2D,
  layer: TextLayer,
  width: number,
  height: number,
  ink: Ink,
) {
  const bounds = textLayerBounds(context, layer, width, height);
  context.save();
  context.strokeStyle = withAlpha(ink, 0.9);
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

/**
 * Product sheet with free 3D rotation. Orthographic projection turns the rotated
 * rectangle into a parallelogram, which an affine transform maps exactly without WebGL.
 */
function drawProductSheet(
  context: CanvasRenderingContext2D,
  cube: Cube,
  scale: number,
  rotation: Rotation,
  image: HTMLImageElement,
  box: AlphaBox,
) {
  const size = cube.size * scale;
  const halfWidth = (size * (box.w / (box.h || 1))) / 2;
  const halfHeight = size / 2;
  const center = { x: cube.x, y: cube.y - halfHeight };
  const spin = (x: number, y: number) =>
    rotateVec3({ x, y, z: 0 }, rotation.x, rotation.y, rotation.z);
  const toScreen = (point: { x: number; y: number }) => ({
    x: center.x + point.x,
    y: center.y - point.y,
  });

  const p00 = toScreen(spin(-halfWidth, halfHeight));
  const p10 = toScreen(spin(halfWidth, halfHeight));
  const p01 = toScreen(spin(-halfWidth, -halfHeight));
  const normal = rotateVec3({ x: 0, y: 0, z: 1 }, rotation.x, rotation.y, rotation.z);

  context.save();
  // No real reverse texture exists, so dim the sheet when its back is showing.
  context.globalAlpha = normal.z >= 0 ? 1 : 0.35;
  context.setTransform(
    (p10.x - p00.x) / box.w,
    (p10.y - p00.y) / box.w,
    (p01.x - p00.x) / box.h,
    (p01.y - p00.y) / box.h,
    p00.x,
    p00.y,
  );
  context.drawImage(image, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
  context.restore();
  context.setTransform(1, 0, 0, 1, 0, 0);
}

/** Reference cube: it leans toward the vanishing point, it has no manual rotation. */
function drawCube(
  context: CanvasRenderingContext2D,
  cube: Cube,
  vanishingPoint: Point,
  scale: number,
  ink: Ink,
  surface: Ink,
) {
  const v = cubeVertices(cube, vanishingPoint, scale);

  drawFace(
    context,
    v.skewY <= 0
      ? [v.frontTopLeft, v.frontTopRight, v.backTopRight, v.backTopLeft]
      : [v.frontBottomLeft, v.frontBottomRight, v.backBottomRight, v.backBottomLeft],
    withAlpha(surface, 0.55),
    withAlpha(ink, 1),
  );

  drawFace(
    context,
    v.skewX >= 0
      ? [v.frontBottomRight, v.frontTopRight, v.backTopRight, v.backBottomRight]
      : [v.frontBottomLeft, v.frontTopLeft, v.backTopLeft, v.backBottomLeft],
    withAlpha(ink, 0.35),
    withAlpha(ink, 1),
  );

  drawFace(
    context,
    [v.frontBottomLeft, v.frontBottomRight, v.frontTopRight, v.frontTopLeft],
    withAlpha(ink, 0.8),
    withAlpha(ink, 1),
  );
}

/** Draggable handle plus a dashed line, to verify and correct the estimate. */
function drawVanishingPoint(
  context: CanvasRenderingContext2D,
  vp: Point,
  cube: Cube | null,
  ink: Ink,
  surface: Ink,
) {
  context.save();
  if (cube) {
    context.strokeStyle = withAlpha(ink, 0.5);
    context.setLineDash([5, 5]);
    context.beginPath();
    context.moveTo(cube.x, cube.y);
    context.lineTo(vp.x, vp.y);
    context.stroke();
    context.setLineDash([]);
  }

  context.strokeStyle = withAlpha(ink, 1);
  context.fillStyle = withAlpha(surface, 1);
  context.lineWidth = 2;
  context.beginPath();
  context.arc(vp.x, vp.y, VP_HANDLE_RADIUS, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.beginPath();
  context.moveTo(vp.x - 4, vp.y);
  context.lineTo(vp.x + 4, vp.y);
  context.moveTo(vp.x, vp.y - 4);
  context.lineTo(vp.x, vp.y + 4);
  context.stroke();
  context.restore();
}

function drawFace(
  context: CanvasRenderingContext2D,
  points: Point[],
  fill: string,
  stroke: string,
) {
  context.save();
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) context.lineTo(point.x, point.y);
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = stroke;
  context.lineWidth = 1.5;
  context.stroke();
  context.restore();
}

/** Resolves a CSS custom property to an rgb triple the canvas can consume. */
function readCssColor(element: HTMLElement, token: string): Ink {
  const raw = getComputedStyle(element).getPropertyValue(token).trim();
  if (!raw) return { r: 0, g: 0, b: 0 };

  const probe = document.createElement("span");
  probe.style.color = raw;
  probe.style.display = "none";
  element.parentElement?.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();

  const match = computed.match(/-?[\d.]+/g);
  if (!match || match.length < 3) return { r: 0, g: 0, b: 0 };
  return { r: Number(match[0]), g: Number(match[1]), b: Number(match[2]) };
}

function withAlpha(color: Ink, alpha: number) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    // Required so the depth map can be read with getImageData.
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    image.src = src;
  });
}
