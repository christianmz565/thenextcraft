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

// Unit cube corners indexed by three bits, plus its twelve edges.
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

const AXES = [
  { key: "x" as const, label: "X", vector: { x: 1, y: 0, z: 0 }, dash: [] as number[] },
  { key: "y" as const, label: "Y", vector: { x: 0, y: 1, z: 0 }, dash: [4, 3] },
  { key: "z" as const, label: "Z", vector: { x: 0, y: 0, z: 1 }, dash: [2, 2] },
];

type RotationGizmoProps = { rotation: Rotation; onChange: (rotation: Rotation) => void };

/** Drag to orbit like a 3D viewport; sliders give precise per-axis control. */
export function RotationGizmo({ rotation, onChange }: RotationGizmoProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);

    const center = { x: width / 2, y: height / 2 };
    const half = Math.min(width, height) * 0.22;
    const ink = readInk(canvas);

    const projected = CORNERS.map((corner) => {
      const r = rotateVec3(
        { x: corner.x * half, y: corner.y * half, z: corner.z * half },
        rotation.x,
        rotation.y,
        rotation.z,
      );
      return { x: center.x + r.x, y: center.y - r.y };
    });

    context.strokeStyle = `rgba(${ink}, 0.45)`;
    context.lineWidth = 1.5;
    for (const [a, b] of EDGES) {
      context.beginPath();
      context.moveTo(projected[a].x, projected[a].y);
      context.lineTo(projected[b].x, projected[b].y);
      context.stroke();
    }

    // Axes are distinguished by dash pattern, not colour, to stay monochrome.
    const axisLength = half * 1.7;
    for (const axis of AXES) {
      const r = rotateVec3(
        {
          x: axis.vector.x * axisLength,
          y: axis.vector.y * axisLength,
          z: axis.vector.z * axisLength,
        },
        rotation.x,
        rotation.y,
        rotation.z,
      );
      drawArrow(context, center, { x: r.x, y: -r.y }, `rgba(${ink}, 1)`, axis.dash, axis.label);
    }
  }, [rotation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = 200 * ratio;
    canvas.height = 200 * ratio;
    const context = canvas.getContext("2d");
    context?.scale(ratio, ratio);
    render();
  }, [render]);

  useEffect(() => render(), [render]);

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
        style={{ width: 200, height: 200 }}
        className="mx-auto touch-none cursor-grab select-none border bg-canvas active:cursor-grabbing"
        aria-label="Control de rotación. Arrastra para orbitar el producto."
      />
      <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        Arrastra para orbitar
      </p>

      <div className="mt-3 space-y-2">
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
  const headLength = Math.min(10, length * 0.3);
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

  context.font = "600 9px monospace";
  context.fillText(label, tip.x + dir.x * 7 - 3, tip.y + dir.y * 7 + 3);
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
