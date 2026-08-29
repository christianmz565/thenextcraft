"use client";

import type { Id } from "backend/convex/_generated/dataModel.js";
import type { HydratedDepthMap } from "backend/convex/depth.js";
import { AlertTriangle, Box, Download, Link2, Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { RotationEngine } from "@/components/rotation-engine";
import { type Placement, SceneCanvas } from "@/components/scene-canvas";
import { newTextLayer, TextLayerControls } from "@/components/text-layer-controls";
import { Button } from "@/components/ui/button";
import { useProductAngles } from "@/hooks/use-product-angles";
import {
  cameraFromRotation,
  type Rotation,
  radToDeg,
  SCALE_MAX,
  SCALE_MIN,
} from "@/lib/depth-scene";
import type { TextLayer } from "@/lib/text-layers";
import { cn } from "@/lib/utils";

type RightTab = "angle" | "text";

type StorageId = Id<"_storage">;
type Selection = { url: string; storageId: StorageId } | null;

export function PerspectiveWorkspace({ job }: { job: HydratedDepthMap }) {
  const angles = useProductAngles();
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [rotation, setRotation] = useState<Rotation>({ x: 0, y: 0, z: 0 });
  const [selected, setSelected] = useState<Selection>(null);
  const [scale, setScale] = useState(1);
  const [showDepth, setShowDepth] = useState(false);
  const [showVanishingPoint, setShowVanishingPoint] = useState(true);
  const [showProduct, setShowProduct] = useState(true);
  const [chain, setChain] = useState(false);
  const [exportRequestId, setExportRequestId] = useState(0);
  // Text is a sequential, optional step: it stays available throughout, but the
  // right panel defaults to perspective so it is placed and rotated first.
  const [rightTab, setRightTab] = useState<RightTab>("angle");
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  const onPlacementChange = useCallback((next: Placement | null) => setPlacement(next), []);

  const onExported = useCallback((dataUrl: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `composicion-${Date.now()}.png`;
    link.click();
  }, []);

  // Keyboard shortcuts from the prototype: D toggles depth, V the vanishing point.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        if (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
          return;
        }
      }
      const key = event.key.toLowerCase();
      if (key === "d") setShowDepth((value) => !value);
      if (key === "v") setShowVanishingPoint((value) => !value);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const camera = cameraFromRotation(rotation);

  function addTextLayer() {
    const layer = newTextLayer(textLayers.length);
    setTextLayers((current) => [...current, layer]);
    setSelectedTextId(layer.id);
  }

  function removeTextLayer(id: string) {
    setTextLayers((current) => current.filter((layer) => layer.id !== id));
    setSelectedTextId((current) => (current === id ? null : current));
  }

  function updateTextLayer(id: string, patch: Partial<TextLayer>) {
    setTextLayers((current) =>
      current.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)),
    );
  }

  async function generate() {
    const source = chain && selected ? selected.storageId : job.objectStorageId;
    const id = await angles.generate({
      sourceStorageId: source,
      rotateDegrees: camera.rotateDegrees,
      verticalTilt: camera.verticalTilt,
    });
    // The generated image already is that perspective; keeping the spin would double it.
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

  return (
    <div className="grid w-full gap-px bg-border xl:grid-cols-[248px_minmax(0,1fr)_296px]">
      <aside className="bg-background">
        <PanelTitle index="A" title="Escena" />
        <div className="space-y-1 border-b p-4">
          <CheckRow
            checked={showDepth}
            onChange={setShowDepth}
            label="Ver mapa de profundidad"
            hint="D"
          />
          <CheckRow
            checked={showVanishingPoint}
            onChange={setShowVanishingPoint}
            label="Ver punto de fuga"
            hint="V"
          />
          <CheckRow
            checked={showProduct}
            onChange={setShowProduct}
            label="Ver producto"
            hint={selected ? undefined : "sin generar"}
            disabled={!selected}
          />
        </div>

        <div className="border-b p-4">
          <label className="block font-mono text-[10px] uppercase tracking-wider">
            <span className="flex items-center justify-between">
              Escala
              <span className="tabular-nums">{scale.toFixed(2)}×</span>
            </span>
            <input
              type="range"
              min={SCALE_MIN}
              max={SCALE_MAX}
              step={0.05}
              value={scale}
              onChange={(event) => setScale(Number(event.target.value))}
              className="mt-2 h-4 w-full accent-foreground"
            />
          </label>
        </div>

        <dl className="space-y-1 p-4 font-mono text-[10px] uppercase tracking-wider">
          <Readout
            label="Profundidad"
            value={placement ? `${Math.round(placement.cube.depth)}` : "—"}
          />
          <Readout
            label="Lado"
            value={placement ? `${Math.round(placement.cube.size * placement.scale)} px` : "—"}
          />
          <Readout
            label="Posición"
            value={
              placement ? `${Math.round(placement.cube.x)}, ${Math.round(placement.cube.y)}` : "—"
            }
          />
          <Readout label="Giro" value={`${Math.round(radToDeg(rotation.y))}°`} />
          <Readout label="Inclinación" value={`${Math.round(radToDeg(rotation.x))}°`} />
        </dl>
        {!hasPlacement ? (
          <p className="border-t p-4 text-xs leading-5 text-muted-foreground">
            Haz clic en la escena para colocar la referencia.
          </p>
        ) : null}
      </aside>

      <div className="min-w-0 bg-background p-2">
        <SceneCanvas
          sceneUrl={job.sceneUrl}
          depthUrl={job.depthUrl}
          colorDepthUrl={job.colorDepthUrl}
          overlayUrl={selected?.url ?? null}
          rotation={rotation}
          scale={scale}
          showDepth={showDepth}
          showVanishingPoint={showVanishingPoint}
          showProduct={showProduct}
          onPlacementChange={onPlacementChange}
          exportRequestId={exportRequestId}
          onExported={onExported}
          textLayers={textLayers}
          selectedTextId={selectedTextId}
          interactionMode={rightTab === "text" ? "text" : "place"}
          onSelectText={setSelectedTextId}
          onMoveText={(id, x, y) => updateTextLayer(id, { x, y })}
        />
        <AngleTray
          angles={angles}
          selected={selected}
          onSelect={setSelected}
          canExport={hasPlacement}
          onExport={() => setExportRequestId((value) => value + 1)}
        />
      </div>

      <aside className="bg-background">
        <div className="flex items-center border-b">
          <RightTabButton
            index="B"
            label="Perspectiva"
            active={rightTab === "angle"}
            onClick={() => setRightTab("angle")}
          />
          <RightTabButton
            index="C"
            label="Texto"
            active={rightTab === "text"}
            onClick={() => setRightTab("text")}
            badge={textLayers.length || undefined}
          />
        </div>

        {rightTab === "angle" ? (
          <>
            <div className="border-b p-4">
              <RotationEngine rotation={rotation} onChange={setRotation} />
            </div>

            <div className="border-b p-4">
              <dl className="space-y-1 font-mono text-[10px] uppercase tracking-wider">
                <Readout label="Giro enviado" value={`${camera.rotateDegrees}°`} />
                <Readout label="Inclinación" value={tiltLabel(camera.verticalTilt)} />
                <Readout label="Eje Z" value="solo vista" />
              </dl>
              {Math.abs(radToDeg(rotation.y)) > 90 ? (
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  El servicio admite hasta 90°; el giro se recortará.
                </p>
              ) : null}
            </div>

            <div className="p-4">
              {selected ? (
                <label className="mb-3 flex min-h-8 items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={chain}
                    onChange={(event) => setChain(event.target.checked)}
                    className="size-3.5 accent-foreground"
                  />
                  <Link2 className="size-3.5" aria-hidden="true" />
                  Encadenar desde la actual
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
            </div>
          </>
        ) : (
          <TextLayerControls
            layers={textLayers}
            selectedId={selectedTextId}
            onSelect={setSelectedTextId}
            onAdd={addTextLayer}
            onRemove={removeTextLayer}
            onChange={updateTextLayer}
          />
        )}
      </aside>
    </div>
  );
}

function RightTabButton({
  index,
  label,
  active,
  onClick,
  badge,
}: {
  index: string;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-h-11 flex-1 items-center justify-center gap-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "bg-foreground text-background hover:text-background",
      )}
    >
      <span className="grid size-4 place-items-center border text-[8px]">{index}</span>
      {label}
      {badge ? (
        <span className="rounded-full bg-current px-1.5 text-[8px] leading-4 opacity-70">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function AngleTray({
  angles,
  selected,
  onSelect,
  canExport,
  onExport,
}: {
  angles: ReturnType<typeof useProductAngles>;
  selected: Selection;
  onSelect: (selection: Selection) => void;
  canExport: boolean;
  onExport: () => void;
}) {
  return (
    <div className="mt-2 border">
      <div className="flex min-h-10 items-center justify-between gap-2 border-b px-3">
        <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          Perspectivas · {angles.completed.length}
        </p>
        <Button variant="ghost" size="xs" disabled={!canExport} onClick={onExport}>
          <Download aria-hidden="true" /> Exportar PNG
        </Button>
      </div>
      <div className="flex items-stretch gap-2 overflow-x-auto p-2">
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-pressed={selected === null}
          className={cn(
            "flex size-20 shrink-0 flex-col items-center justify-center gap-1 border font-mono text-[8px] uppercase",
            selected === null && "border-foreground bg-foreground text-background",
          )}
        >
          <Box className="size-4" aria-hidden="true" />
          Cubo
        </button>
        {angles.isRestoring ? (
          <p className="self-center px-3 text-xs text-muted-foreground">Cargando…</p>
        ) : angles.completed.length === 0 ? (
          <p className="self-center px-3 text-xs text-muted-foreground">
            Genera una perspectiva para sustituir el cubo.
          </p>
        ) : (
          angles.completed.map((angle) =>
            angle.resultUrl && angle.resultStorageId ? (
              <button
                key={angle._id}
                type="button"
                onClick={() =>
                  onSelect({
                    url: angle.resultUrl as string,
                    storageId: angle.resultStorageId as StorageId,
                  })
                }
                aria-pressed={selected?.url === angle.resultUrl}
                className={cn(
                  "checkerboard size-20 shrink-0 border p-0.5",
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
          )
        )}
      </div>
    </div>
  );
}

function PanelTitle({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b p-4">
      <span className="grid size-5 place-items-center border font-mono text-[9px]">{index}</span>
      <h3 className="text-sm font-medium tracking-tight">{title}</h3>
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
  hint,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className={cn("flex min-h-9 items-center gap-2 text-xs", disabled && "opacity-50")}>
      <input
        type="checkbox"
        checked={checked && !disabled}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-3.5 accent-foreground"
      />
      <span className="flex-1">{label}</span>
      {hint ? (
        <kbd className="border px-1 font-mono text-[9px] uppercase text-muted-foreground">
          {hint}
        </kbd>
      ) : null}
    </label>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
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
