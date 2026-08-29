"use client";

import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  degToRad,
  ROT_DRAG_SENSITIVITY,
  type Rotation,
  radToDeg,
  rotateVec3,
  wrapAngle,
} from "@/lib/depth-scene";
import { cn } from "@/lib/utils";

const CORNERS = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({
  x: i & 1 ? 1 : -1,
  y: i & 2 ? 1 : -1,
  z: i & 4 ? 1 : -1,
}));

const EDGES: [number, number][] = [
  [0, 1],
  [1, 3],
  [3, 2],
  [2, 0],
  [4, 5],
  [5, 7],
  [7, 6],
  [6, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];

// Front face so the sheet orientation is readable at a glance.
const FRONT_FACE = [4, 5, 7, 6];

const AXES = [
  { key: "x" as const, label: "X", vector: { x: 1, y: 0, z: 0 }, dash: [] as number[] },
  { key: "y" as const, label: "Y", vector: { x: 0, y: 1, z: 0 }, dash: [5, 3] },
  { key: "z" as const, label: "Z", vector: { x: 0, y: 0, z: 1 }, dash: [2, 2] },
];

const PRESETS = [
  { label: "Frente", rotation: { x: 0, y: 0, z: 0 } },
  { label: "3/4 izq.", rotation: { x: 0, y: degToRad(-35), z: 0 } },
  { label: "3/4 der.", rotation: { x: 0, y: degToRad(35), z: 0 } },
  { label: "Perfil", rotation: { x: 0, y: degToRad(90), z: 0 } },
  { label: "Pájaro", rotation: { x: degToRad(30), y: degToRad(-20), z: 0 } },
  { label: "Gusano", rotation: { x: degToRad(-30), y: degToRad(20), z: 0 } },
];

const SIZE = 240;

type RotationEngineProps = { rotation: Rotation; onChange: (rotation: Rotation) => void };

/** Drag to orbit like a 3D viewport; sliders and presets give precise control. */
export function RotationEngine({ rotation, onChange }: RotationEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, SIZE, SIZE);
    const center = { x: SIZE / 2, y: SIZE / 2 };
    const half = SIZE * 0.2;
    const ink = readInk(canvas);
    const spin = (v: { x: number; y: number; z: number }) =>
      rotateVec3(v, rotation.x, rotation.y, rotation.z);
    const project = (v: { x: number; y: number; z: number }) => {
      const r = spin(v);
      return { x: center.x + r.x, y: center.y - r.y, z: r.z };
    };

    // Ground grid: gives the rotation a spatial reference instead of floating in a void.
    context.save();
    context.strokeStyle = `rgba(${ink}, 0.14)`;
    context.lineWidth = 1;
    const span = half * 2;
    for (let i = -2; i <= 2; i += 1) {
      const offset = (i / 2) * span;
      const a = project({ x: offset, y: -half, z: -span });
      const b = project({ x: offset, y: -half, z: span });
      const c = project({ x: -span, y: -half, z: offset });
      const d = project({ x: span, y: -half, z: offset });
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.moveTo(c.x, c.y);
      context.lineTo(d.x, d.y);
      context.stroke();
    }
    context.restore();

    const projected = CORNERS.map((corner) =>
      project({ x: corner.x * half, y: corner.y * half, z: corner.z * half }),
    );

    // Shade the front face so it is obvious which side the product is showing.
    const normal = spin({ x: 0, y: 0, z: 1 });
    context.save();
    context.beginPath();
    context.moveTo(projected[FRONT_FACE[0]].x, projected[FRONT_FACE[0]].y);
    for (const index of FRONT_FACE.slice(1)) {
      context.lineTo(projected[index].x, projected[index].y);
    }
    context.closePath();
    context.fillStyle = `rgba(${ink}, ${normal.z >= 0 ? 0.22 : 0.07})`;
    context.fill();
    context.restore();

    context.save();
    context.strokeStyle = `rgba(${ink}, 0.5)`;
    context.lineWidth = 1.5;
    for (const [a, b] of EDGES) {
      context.beginPath();
      context.moveTo(projected[a].x, projected[a].y);
      context.lineTo(projected[b].x, projected[b].y);
      context.stroke();
    }
    context.restore();

    const axisLength = half * 1.8;
    for (const axis of AXES) {
      const r = spin({
        x: axis.vector.x * axisLength,
        y: axis.vector.y * axisLength,
        z: axis.vector.z * axisLength,
      });
      drawArrow(context, center, { x: r.x, y: -r.y }, `rgba(${ink}, 1)`, axis.dash, axis.label);
    }
  }, [rotation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = SIZE * ratio;
    canvas.height = SIZE * ratio;
    canvas.getContext("2d")?.setTransform(ratio, 0, 0, ratio, 0, 0);
    render();
  }, [render]);

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    dragRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const last = dragRef.current;
    if (!last) return;
    const dx = event.clientX - last.x;
    const dy = event.clientY - last.y;
    dragRef.current = { x: event.clientX, y: event.clientY };
    onChange({
      x: wrapAngle(rotation.x - dy * ROT_DRAG_SENSITIVITY),
      y: wrapAngle(rotation.y + dx * ROT_DRAG_SENSITIVITY),
      z: rotation.z,
    });
  }

  function endDrag(event: React.PointerEvent<HTMLCanvasElement>) {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ width: SIZE, height: SIZE }}
        className="mx-auto max-w-full touch-none cursor-grab select-none border bg-canvas active:cursor-grabbing"
        aria-label="Motor de rotación. Arrastra para orbitar el producto."
      />
      <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        Arrastra para orbitar
      </p>

      <div className="mt-3 grid grid-cols-3 gap-px bg-border">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChange(preset.rotation)}
            className={cn(
              "min-h-9 bg-background px-1 font-mono text-[9px] uppercase tracking-wider hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              isSameRotation(rotation, preset.rotation) && "bg-foreground text-background",
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {AXES.map((axis) => (
          <label key={axis.key} className="flex items-center gap-2">
            <span className="w-3 font-mono text-[10px]">{axis.label}</span>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={Math.round(radToDeg(rotation[axis.key]))}
              onChange={(event) =>
                onChange({ ...rotation, [axis.key]: degToRad(Number(event.target.value)) })
              }
              aria-label={`Rotación ${axis.label}`}
              className="h-4 min-w-0 flex-1 accent-foreground"
            />
            <span className="w-10 text-right font-mono text-[10px] tabular-nums">
              {Math.round(radToDeg(rotation[axis.key]))}°
            </span>
          </label>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="mt-2 w-full"
        onClick={() => onChange({ x: 0, y: 0, z: 0 })}
      >
        <RotateCcw aria-hidden="true" /> Reiniciar rotación
      </Button>
    </div>
  );
}

function isSameRotation(a: Rotation, b: Rotation) {
  const round = (value: number) => Math.round(radToDeg(value));
  return round(a.x) === round(b.x) && round(a.y) === round(b.y) && round(a.z) === round(b.z);
}

function drawArrow(
  context: CanvasRenderingContext2D,
  origin: { x: number; y: number },
  delta: { x: number; y: number },
  color: string,
  dash: number[],
  label: string,
) {
  const length = Math.hypot(delta.x, delta.y) || 0.0001;
  const dir = { x: delta.x / length, y: delta.y / length };
  const tip = { x: origin.x + delta.x, y: origin.y + delta.y };
  const headLength = Math.min(11, length * 0.3);
  const angle = Math.atan2(dir.y, dir.x);

  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 2;
  context.lineCap = "round";

  context.setLineDash(dash);
  context.beginPath();
  context.moveTo(origin.x, origin.y);
  context.lineTo(tip.x, tip.y);
  context.stroke();

  context.setLineDash([]);
  context.beginPath();
  context.moveTo(tip.x, tip.y);
  context.lineTo(
    tip.x - headLength * Math.cos(angle - Math.PI / 6),
    tip.y - headLength * Math.sin(angle - Math.PI / 6),
  );
  context.lineTo(
    tip.x - headLength * Math.cos(angle + Math.PI / 6),
    tip.y - headLength * Math.sin(angle + Math.PI / 6),
  );
  context.closePath();
  context.fill();

  context.font = "600 10px monospace";
  context.fillText(label, tip.x + dir.x * 8 - 3, tip.y + dir.y * 8 + 3);
  context.restore();
}

function readInk(element: HTMLElement) {
  const probe = document.createElement("span");
  probe.style.color = getComputedStyle(element).getPropertyValue("--foreground").trim();
  probe.style.display = "none";
  element.parentElement?.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  const match = computed.match(/-?[\d.]+/g);
  return match && match.length >= 3 ? `${match[0]}, ${match[1]}, ${match[2]}` : "0, 0, 0";
}
