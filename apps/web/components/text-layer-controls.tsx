"use client";

import { Plus, Trash2, Type } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { createTextLayer, TEXT_COLORS, type TextFont, type TextLayer } from "@/lib/text-layers";
import { cn } from "@/lib/utils";

/**
 * Sidebar for the optional text step: list of text sets plus a properties panel for
 * the selected one. Dragging happens directly on the canvas (see SceneCanvas); this
 * panel is for everything a drag can't express — content, font, color, exact values.
 */
export function TextLayerControls({
  layers,
  selectedId,
  onSelect,
  onAdd,
  onRemove,
  onChange,
}: {
  layers: TextLayer[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, patch: Partial<TextLayer>) => void;
}) {
  const selected = layers.find((layer) => layer.id === selectedId) ?? null;

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b p-4">
        <p className="text-xs leading-5 text-muted-foreground">
          Opcional: añade texto sobre la composición. Queda detrás del producto.
        </p>
        <Button variant="outline" size="xs" onClick={onAdd}>
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
                  onClick={() => onSelect(selectedId === layer.id ? null : layer.id)}
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
                  onClick={() => onRemove(layer.id)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
              {selectedId === layer.id ? (
                <LayerFields layer={layer} onChange={(patch) => onChange(layer.id, patch)} />
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
    </>
  );
}

export function newTextLayer(offset: number) {
  return createTextLayer({ y: 0.4 + offset * 0.12 });
}

function LayerFields({
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
