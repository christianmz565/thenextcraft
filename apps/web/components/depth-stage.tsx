"use client";

import { Crosshair, Eye, Loader2, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  type AlphaBox,
  type CameraParams,
  type Cube,
  computeAlphaBBox,
  cubeVertices,
  type DepthField,
  depthToSize,
  deriveCamera,
  estimateVanishingPoint,
  type Point,
  type Rotation,
  readDepthField,
  rotateVec3,
  SCALE_MAX,
  SCALE_MIN,
  sampleDepth,
  toDisplayPoint,
  toFieldPoint,
  VP_HANDLE_RADIUS,
} from "@/lib/depth-scene";
import { cn } from "@/lib/utils";

type DepthStageProps = {
  sceneUrl: string;
  depthUrl: string;
  colorDepthUrl: string | null;
  /** When set, the cube is replaced by this product cutout. */
  overlayUrl?: string | null;
  /** Free 3D rotation applied only to the product sheet, never to the cube. */
  rotation?: Rotation;
  /** Reports the current placement so the parent can derive camera params and export. */
  onPlacementChange?: (placement: Placement | null) => void;
  exportRequestId?: number;
  onExported?: (dataUrl: string) => void;
};

export type Placement = {
  cube: Cube;
  vanishingPoint: Point;
  scale: number;
  camera: CameraParams;
};

export function DepthStage({
  sceneUrl,
  depthUrl,
  colorDepthUrl,
  overlayUrl = null,
  rotation = { x: 0, y: 0, z: 0 },
  onPlacementChange,
  exportRequestId,
  onExported,
}: DepthStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneImageRef = useRef<HTMLImageElement | null>(null);
  const depthVisualRef = useRef<HTMLImageElement | null>(null);
  const fieldRef = useRef<DepthField | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cube, setCube] = useState<Cube | null>(null);
  const [vanishingPoint, setVanishingPoint] = useState<Point | null>(null);
  const [showDepth, setShowDepth] = useState(false);
  const [showVanishingPoint, setShowVanishingPoint] = useState(true);
  const [scale, setScale] = useState(1);
  const dragRef = useRef<"cube" | "vp" | null>(null);
  const scaleId = useId();
  const [overlayImage, setOverlayImage] = useState<HTMLImageElement | null>(null);
  const [overlayBox, setOverlayBox] = useState<AlphaBox | null>(null);

  // Load scene, depth map and optional colored map before enabling interaction.
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

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const scene = sceneImageRef.current;
    const field = fieldRef.current;
    if (!canvas || !scene || !field) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const { width, height } = sizeRef.current;
    if (!width || !height) return;

    context.clearRect(0, 0, width, height);
    const background = showDepth ? (depthVisualRef.current ?? scene) : scene;
    context.drawImage(background, 0, 0, width, height);

    const vpDisplay = vanishingPoint
      ? toDisplayPoint(vanishingPoint, field, width, height)
      : { x: width / 2, y: height / 2 };

    // With a generated perspective the product replaces the cube, drawn as a flat sheet
    // with free 3D rotation. Orthographic projection turns the rotated rectangle into a
    // parallelogram, which an affine transform maps exactly without WebGL.
    const overlay = overlayImage;
    const box = overlayBox;
    if (cube && overlay && box) {
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
      // Seeing the back of the sheet: there is no real reverse texture, so dim it.
      context.globalAlpha = normal.z >= 0 ? 1 : 0.35;
      context.setTransform(
        (p10.x - p00.x) / box.w,
        (p10.y - p00.y) / box.w,
        (p01.x - p00.x) / box.h,
        (p01.y - p00.y) / box.h,
        p00.x,
        p00.y,
      );
      context.drawImage(overlay, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
      context.restore();
    } else if (cube) {
      const vertices = cubeVertices(cube, vpDisplay, scale);
      const foreground = readCssColor(canvas, "--foreground");
      const surface = readCssColor(canvas, "--background");

      // Top or bottom face, chosen by where the cube recedes vertically.
      drawFace(
        context,
        vertices.skewY <= 0
          ? [
              vertices.frontTopLeft,
              vertices.frontTopRight,
              vertices.backTopRight,
              vertices.backTopLeft,
            ]
          : [
              vertices.frontBottomLeft,
              vertices.frontBottomRight,
              vertices.backBottomRight,
              vertices.backBottomLeft,
            ],
        withAlpha(surface, 0.55),
        withAlpha(foreground, 1),
      );

      // Visible lateral face, the opposite one stays hidden behind the front face.
      drawFace(
        context,
        vertices.skewX >= 0
          ? [
              vertices.frontBottomRight,
              vertices.frontTopRight,
              vertices.backTopRight,
              vertices.backBottomRight,
            ]
          : [
              vertices.frontBottomLeft,
              vertices.frontTopLeft,
              vertices.backTopLeft,
              vertices.backBottomLeft,
            ],
        withAlpha(foreground, 0.35),
        withAlpha(foreground, 1),
      );

      drawFace(
        context,
        [
          vertices.frontBottomLeft,
          vertices.frontBottomRight,
          vertices.frontTopRight,
          vertices.frontTopLeft,
        ],
        withAlpha(foreground, 0.8),
        withAlpha(foreground, 1),
      );
    }

    if (showVanishingPoint && !overlayImage) {
      const vpColor = readCssColor(canvas, "--foreground");
      if (cube) {
        context.save();
        context.strokeStyle = withAlpha(vpColor, 0.5);
        context.setLineDash([5, 5]);
        context.beginPath();
        context.moveTo(cube.x, cube.y);
        context.lineTo(vpDisplay.x, vpDisplay.y);
        context.stroke();
        context.restore();
      }
      context.save();
      context.strokeStyle = withAlpha(vpColor, 1);
      context.fillStyle = withAlpha(readCssColor(canvas, "--background"), 1);
      context.lineWidth = 2;
      context.beginPath();
      context.arc(vpDisplay.x, vpDisplay.y, VP_HANDLE_RADIUS, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.beginPath();
      context.moveTo(vpDisplay.x - 4, vpDisplay.y);
      context.lineTo(vpDisplay.x + 4, vpDisplay.y);
      context.moveTo(vpDisplay.x, vpDisplay.y - 4);
      context.lineTo(vpDisplay.x, vpDisplay.y + 4);
      context.stroke();
      context.restore();
    }
  }, [
    cube,
    overlayBox,
    overlayImage,
    rotation.x,
    rotation.y,
    rotation.z,
    scale,
    showDepth,
    showVanishingPoint,
    vanishingPoint,
  ]);

  // Fit the canvas to its container while preserving the scene aspect ratio.
  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const scene = sceneImageRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !scene || !container) return;

    const resize = () => {
      const maxWidth = container.clientWidth;
      const maxHeight = Math.max(320, Math.round(window.innerHeight * 0.62));
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

  // Load the product cutout that replaces the cube.
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
        // Trim the transparent padding so the visible content fills the derived size.
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

  // Report placement so the parent can derive camera params for the angle service.
  useEffect(() => {
    if (!onPlacementChange) return;
    const field = fieldRef.current;
    const { width, height } = sizeRef.current;
    if (!cube || !vanishingPoint || !field || !width || !height) {
      onPlacementChange(null);
      return;
    }
    const vpDisplay = toDisplayPoint(vanishingPoint, field, width, height);
    onPlacementChange({
      cube,
      vanishingPoint: vpDisplay,
      scale,
      camera: deriveCamera(cube, vpDisplay),
    });
  }, [cube, onPlacementChange, scale, vanishingPoint]);

  // Export the composed canvas as a PNG when the parent bumps the request id.
  useEffect(() => {
    if (!exportRequestId || !onExported) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      onExported(canvas.toDataURL("image/png"));
    } catch {
      // Ignore: a tainted canvas cannot be exported.
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

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!ready) return;
    const field = fieldRef.current;
    const { width, height } = sizeRef.current;
    if (!field) return;

    const point = pointerPosition(event);
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
    const field = fieldRef.current;
    const { width, height } = sizeRef.current;
    if (!field) return;

    const point = pointerPosition(event);
    if (dragRef.current === "vp") {
      setVanishingPoint(toFieldPoint(point, field, width, height));
      return;
    }
    placeCube(point);
  }

  function endDrag(event: React.PointerEvent<HTMLCanvasElement>) {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function reset() {
    const field = fieldRef.current;
    setCube(null);
    setScale(1);
    if (field) setVanishingPoint(estimateVanishingPoint(field));
  }

  return (
    <div className="w-full max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border border-b-0 border-foreground/50 bg-background px-2 py-2">
        <div className="flex flex-wrap items-center gap-1">
          <Toggle active={showDepth} onClick={() => setShowDepth((value) => !value)}>
            <Eye className="size-3" aria-hidden="true" /> Profundidad
          </Toggle>
          <Toggle
            active={showVanishingPoint}
            onClick={() => setShowVanishingPoint((value) => !value)}
          >
            <Crosshair className="size-3" aria-hidden="true" /> Punto de fuga
          </Toggle>
        </div>
        <div className="flex items-center gap-3">
          <label
            htmlFor={scaleId}
            className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider"
          >
            Escala {scale.toFixed(2)}×
            <input
              id={scaleId}
              type="range"
              min={SCALE_MIN}
              max={SCALE_MAX}
              step={0.05}
              value={scale}
              onChange={(event) => setScale(Number(event.target.value))}
              className="h-4 w-28 accent-foreground"
            />
          </label>
          <Button variant="ghost" size="xs" onClick={reset}>
            <RotateCcw aria-hidden="true" /> Reiniciar
          </Button>
        </div>
      </div>

      <div className="relative flex min-h-80 items-center justify-center border border-foreground/50 bg-canvas p-2 shadow-[8px_8px_0_0_var(--foreground)]">
        {!ready ? (
          <p className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
            {loadError ? (
              loadError
            ) : (
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
          className={cn("touch-none select-none", ready ? "cursor-crosshair" : "hidden")}
          aria-label="Escena con mapa de profundidad. Haz clic para colocar el cubo."
        />
      </div>

      <p className="border border-t-0 border-foreground/50 bg-background px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {cube
          ? `Cubo · x ${Math.round(cube.x)} · y ${Math.round(cube.y)} · profundidad ${Math.round(cube.depth)} · lado ${Math.round(cube.size * scale)} px`
          : "Haz clic o arrastra sobre la escena para colocar el cubo"}
      </p>
    </div>
  );
}

function Toggle({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-8 items-center gap-1.5 px-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "bg-foreground text-background hover:text-background",
      )}
    >
      {children}
    </button>
  );
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
function readCssColor(element: HTMLElement, token: string) {
  const raw = getComputedStyle(element).getPropertyValue(token).trim();
  if (!raw) return { r: 0, g: 0, b: 0 };

  const probe = document.createElement("span");
  probe.style.color = raw;
  probe.style.display = "none";
  element.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();

  const match = computed.match(/-?[\d.]+/g);
  if (!match || match.length < 3) return { r: 0, g: 0, b: 0 };
  return { r: Number(match[0]), g: Number(match[1]), b: Number(match[2]) };
}

function withAlpha(color: { r: number; g: number; b: number }, alpha: number) {
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
