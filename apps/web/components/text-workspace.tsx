"use client";

import type { HydratedDepthMap } from "backend/convex/depth.js";
import { AlertTriangle, Download, Loader2, Plus, Scissors, Trash2, Type } from "lucide-react";
import { useCallback, useId, useState } from "react";

import { TextCanvas } from "@/components/text-canvas";
import { Button } from "@/components/ui/button";
import { useSubjectCutout } from "@/hooks/use-subject-cutout";
import { createTextLayer, TEXT_COLORS, type TextFont, type TextLayer } from "@/lib/text-layers";
import { cn } from "@/lib/utils";

/**
 * "Text behind subject" editor: the scene at the back, editable text sets in the
 * middle and the extracted subject on top. The cutout comes from `api.cutouts`;
 * everything else is canvas work in the client.
 */
export function TextWorkspace({ job }: { job: HydratedDepthMap }) {
  const cutout = useSubjectCutout(job.sceneStorageId);
  const [layers, setLayers] = useState<TextLayer[]>(() => [createTextLayer()]);
  const [selectedId, setSelectedId] = useState<string | null>(() => layers[0]?.id ?? null);
  const [exportRequestId, setExportRequestId] = useState(0);

  const selected = layers.find((layer) => layer.id === selectedId) ?? null;

  const updateLayer = useCallback((id: string, patch: Partial<TextLayer>) => {
    setLayers((current) =>
      current.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)),
    );
  }, []);

  const onMove = useCallback(
    (id: string, x: number, y: number) => updateLayer(id, { x, y }),
    [updateLayer],
  );

  const onExported = useCallback((dataUrl: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `texto-${Date.now()}.png`;
    link.click();
  }, []);

  function addLayer() {
    const layer = createTextLayer({ y: 0.4 + layers.length * 0.12 });
    setLayers((current) => [...current, layer]);
    setSelectedId(layer.id);
  }

  function removeLayer(id: string) {
    setLayers((current) => current.filter((layer) => layer.id !== id));
    setSelectedId((current) => (current === id ? null : current));
  }

  if (!job.sceneUrl) {
    return (
      <p className="border border-foreground/50 bg-background p-8 text-center text-sm text-muted-foreground">
        Necesitas un fondo para componer texto.
      </p>
    );
  }

  return (
    <div className="grid w-full gap-px bg-border xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 bg-background p-2">
        <TextCanvas
          sceneUrl={job.sceneUrl}
          cutoutUrl={cutout.cutoutUrl}
          layers={layers}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMove={onMove}
          exportRequestId={exportRequestId}
          onExported={onExported}
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border px-3 py-2">
          <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            {cutout.cutoutUrl
              ? "Sujeto extraído · el texto queda detrás"
              : "Sin sujeto · el texto queda delante del fondo"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              disabled={cutout.isRunning || Boolean(cutout.cutoutUrl)}
              onClick={() => void cutout.extract()}
            >
              {cutout.isRunning ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Scissors aria-hidden="true" />
              )}
              {cutout.cutoutUrl
                ? "Sujeto listo"
                : cutout.isRunning
                  ? "Extrayendo…"
                  : "Extraer sujeto (IA)"}
            </Button>
            <Button variant="ghost" size="xs" onClick={() => setExportRequestId((n) => n + 1)}>
              <Download aria-hidden="true" /> Exportar PNG
            </Button>
          </div>
        </div>
        {cutout.error ? (
          <p className="mt-2 flex items-start gap-2 border border-destructive p-2 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {cutout.error}
          </p>
        ) : null}
      </div>

      <aside className="bg-background">
        <div className="flex items-center justify-between gap-2 border-b p-4">
          <div className="flex items-center gap-2">
            <span className="grid size-5 place-items-center border font-mono text-[9px]">T</span>
            <h3 className="text-sm font-medium tracking-tight">Textos</h3>
          </div>
          <Button variant="outline" size="xs" onClick={addLayer}>
            <Plus aria-hidden="true" /> Añadir
          </Button>
        </div>

        {layers.length === 0 ? (
          <p className="p-4 text-sm leading-5 text-muted-foreground">
            Añade un texto para empezar. Podrás arrastrarlo sobre la escena.
          </p>
        ) : (
          <ul>
            {layers.map((layer) => (
              <li key={layer.id} className="border-b">
                <div className="flex items-center gap-2 p-3">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedId((current) => (current === layer.id ? null : layer.id))
                    }
                    aria-pressed={selectedId === layer.id}
                    className={cn(
                      "flex min-h-8 min-w-0 flex-1 items-center gap-2 border px-2 text-left text-xs",
                      selectedId === layer.id && "border-foreground bg-foreground text-background",
                    )}
                  >
                    <Type className="size-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{layer.content || "(vacío)"}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Eliminar texto"
                    onClick={() => removeLayer(layer.id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
                {selectedId === layer.id ? (
                  <LayerControls layer={layer} onChange={(patch) => updateLayer(layer.id, patch)} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {selected === null && layers.length > 0 ? (
          <p className="p-4 text-xs leading-5 text-muted-foreground">
            Selecciona un texto para editar sus propiedades, o arrástralo sobre la escena.
          </p>
        ) : null}
      </aside>
    </div>
  );
}

function LayerControls({
  layer,
  onChange,
}: {
  layer: TextLayer;
  onChange: (patch: Partial<TextLayer>) => void;
}) {
  const contentId = useId();

  return (
    <div className="space-y-3 border-t bg-canvas/40 p-3">
      <label htmlFor={contentId} className="block font-mono text-[10px] uppercase tracking-wider">
        Contenido
        <textarea
          id={contentId}
          value={layer.content}
          onChange={(event) => onChange({ content: event.target.value })}
          rows={2}
          className="mt-1 w-full resize-y border bg-background p-2 font-sans text-sm normal-case tracking-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider">Fuente</span>
        <div className="flex gap-1">
          {(["sans", "serif", "mono"] as TextFont[]).map((font) => (
            <button
              key={font}
              type="button"
              onClick={() => onChange({ font })}
              aria-pressed={layer.font === font}
              className={cn(
                "min-h-7 border px-2 text-[10px] uppercase",
                layer.font === font && "border-foreground bg-foreground text-background",
              )}
            >
              {font}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider">Color</span>
        <div className="flex items-center gap-1">
          {TEXT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Color ${color}`}
              aria-pressed={layer.color === color}
              onClick={() => onChange({ color })}
              className={cn(
                "size-6 border",
                layer.color === color
                  ? "border-foreground ring-1 ring-foreground"
                  : "border-border",
              )}
              style={{ backgroundColor: color }}
            />
          ))}
          <input
            type="color"
            value={layer.color}
            onChange={(event) => onChange({ color: event.target.value })}
            aria-label="Color personalizado"
            className="size-6 cursor-pointer border bg-background p-0"
          />
        </div>
      </div>

      <SliderRow
        label="Posición X"
        value={layer.x}
        min={0}
        max={1}
        step={0.005}
        format={(value) => `${Math.round(value * 100)}%`}
        onChange={(x) => onChange({ x })}
      />
      <SliderRow
        label="Posición Y"
        value={layer.y}
        min={0}
        max={1}
        step={0.005}
        format={(value) => `${Math.round(value * 100)}%`}
        onChange={(y) => onChange({ y })}
      />
      <SliderRow
        label="Tamaño"
        value={layer.size}
        min={0.02}
        max={0.6}
        step={0.005}
        format={(value) => `${Math.round(value * 100)}%`}
        onChange={(size) => onChange({ size })}
      />
      <SliderRow
        label="Peso"
        value={layer.weight}
        min={100}
        max={900}
        step={100}
        format={(value) => `${value}`}
        onChange={(weight) => onChange({ weight })}
      />
      <SliderRow
        label="Espaciado"
        value={layer.letterSpacing}
        min={-0.1}
        max={0.5}
        step={0.01}
        format={(value) => `${value.toFixed(2)}em`}
        onChange={(letterSpacing) => onChange({ letterSpacing })}
      />
      <SliderRow
        label="Opacidad"
        value={layer.opacity}
        min={0.05}
        max={1}
        step={0.05}
        format={(value) => `${Math.round(value * 100)}%`}
        onChange={(opacity) => onChange({ opacity })}
      />
      <SliderRow
        label="Rotación"
        value={layer.rotation}
        min={-180}
        max={180}
        step={1}
        format={(value) => `${value}°`}
        onChange={(rotation) => onChange({ rotation })}
      />
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block font-mono text-[10px] uppercase tracking-wider">
      <span className="flex items-center justify-between">
        {label}
        <span className="tabular-nums">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 h-4 w-full accent-foreground"
      />
    </label>
  );
}
