"use client";

import {
  ArrowLeft,
  Box,
  ChevronDown,
  Download,
  Eye,
  Image as ImageIcon,
  Maximize2,
  Plus,
  Redo2,
  RotateCw,
  ScanLine,
  SlidersHorizontal,
  Sparkles,
  Type,
  Undo2,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { EditorScene } from "@/components/editor-scene";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Section = "background" | "product" | "text";
type Preview = "scene" | "depth" | "overlay";

const sections = [
  { id: "background" as const, index: "01", label: "Fondo", icon: ImageIcon, state: "Listo" },
  { id: "product" as const, index: "02", label: "Producto", icon: Box, state: "3 vistas" },
  { id: "text" as const, index: "03", label: "Texto", icon: Type, state: "Opcional" },
];

export function EditorWorkspace() {
  const [section, setSection] = useState<Section>("product");
  const [preview, setPreview] = useState<Preview>("scene");
  const [showProduct, setShowProduct] = useState(true);
  const [tray, setTray] = useState<"views" | "results">("views");
  return (
    <main className="flex min-h-svh flex-col overflow-x-hidden bg-workspace text-foreground">
      <header className="z-30 flex min-h-16 items-center border-b bg-background">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center border-r lg:w-64 lg:justify-start lg:px-5">
          <BrandMark href="/dashboard" compact className="lg:hidden" />
          <div className="hidden lg:block">
            <BrandMark href="/dashboard" />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2 px-2 md:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Volver al proyecto"
              render={<Link href="/app/proyecto-atlas" />}
            >
              <ArrowLeft />
            </Button>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-medium">Monolith — Dirección frontal</p>
              <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                Guardado hace unos segundos
              </p>
            </div>
          </div>
          <div className="hidden items-center border md:flex">
            <ToolbarButton label="Deshacer">
              <Undo2 />
            </ToolbarButton>
            <ToolbarButton label="Rehacer">
              <Redo2 />
            </ToolbarButton>
            <span className="h-7 border-l" />
            <ToolbarButton label="Alejar">
              <ZoomOut />
            </ToolbarButton>
            <span className="w-12 text-center font-mono text-[10px]">82%</span>
            <ToolbarButton label="Acercar">
              <ZoomIn />
            </ToolbarButton>
          </div>
          <Button className="shrink-0">
            <Sparkles aria-hidden="true" />
            <span className="hidden sm:inline">Generar resultado</span>
            <span className="sm:hidden">Generar</span>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[256px_minmax(0,1fr)_288px]">
        <aside className="border-b bg-background lg:border-r lg:border-b-0">
          <div className="grid grid-cols-3 lg:block">
            {sections.map(({ id, index, label, icon: Icon, state }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                aria-pressed={section === id}
                className={cn(
                  "flex min-h-18 items-center gap-3 border-r px-3 text-left last:border-r-0 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:w-full lg:border-r-0 lg:border-b lg:px-5",
                  section === id && "bg-foreground text-background hover:bg-foreground",
                )}
              >
                <span className="hidden font-mono text-[10px] opacity-60 lg:block">{index}</span>
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  <strong className="block text-xs font-medium lg:text-sm">{label}</strong>
                  <span className="hidden text-[10px] opacity-60 lg:block">{state}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="hidden p-5 lg:block">
            <PanelContent section={section} />
          </div>
          <div className="border-t p-4 lg:hidden">
            <PanelContent section={section} />
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col">
          <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b bg-background px-3">
            <fieldset className="flex items-center gap-1" aria-label="Modo de vista">
              <ViewButton active={preview === "scene"} onClick={() => setPreview("scene")}>
                Escena
              </ViewButton>
              <ViewButton active={preview === "depth"} onClick={() => setPreview("depth")}>
                Profundidad
              </ViewButton>
              <ViewButton active={preview === "overlay"} onClick={() => setPreview("overlay")}>
                Superposición
              </ViewButton>
            </fieldset>
            <div className="flex items-center gap-1">
              <ToolbarButton label="Ajustar a vista">
                <Maximize2 />
              </ToolbarButton>
              <ToolbarButton
                label={showProduct ? "Ocultar producto" : "Mostrar producto"}
                onClick={() => setShowProduct((value) => !value)}
              >
                <Eye />
              </ToolbarButton>
            </div>
          </div>
          <div className="technical-grid flex min-h-120 flex-1 items-center justify-center p-3 md:p-8">
            <div
              className={cn(
                "relative w-full max-w-5xl border border-foreground/50 bg-background p-2 shadow-[8px_8px_0_0_var(--foreground)] md:p-3",
                preview === "depth" && "grayscale contrast-200",
                preview === "overlay" && "grayscale contrast-125",
              )}
            >
              <div className="mb-2 flex items-center justify-between border-b px-1 pb-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                <span>Artboard 01 · 4:5</span>
                <span>1080 × 1350</span>
              </div>
              <EditorScene
                className={cn(
                  "min-h-130 lg:min-h-150",
                  !showProduct && "[&_.scene-product]:opacity-0 [&_.scene-selection]:opacity-0",
                )}
              />
              {preview === "depth" ? (
                <div className="pointer-events-none absolute inset-x-3 bottom-3 top-11 bg-[repeating-linear-gradient(90deg,transparent_0,transparent_5%,color-mix(in_oklch,var(--foreground)_12%,transparent)_5.2%)] mix-blend-multiply" />
              ) : null}
            </div>
          </div>
          <div className="border-t bg-background">
            <div className="flex h-11 items-center justify-between border-b px-3">
              <div className="flex h-full">
                <TrayTab active={tray === "views"} onClick={() => setTray("views")}>
                  Vistas del producto · 03
                </TrayTab>
                <TrayTab active={tray === "results"} onClick={() => setTray("results")}>
                  Resultados · 12
                </TrayTab>
              </div>
              <Button size="xs" variant="ghost">
                <Plus aria-hidden="true" /> Nueva vista
              </Button>
            </div>
            <div className="flex gap-2 overflow-x-auto p-3">
              {tray === "views" ? (
                <>
                  <Thumbnail label="Base" active />
                  <Thumbnail label="3/4 izquierda" />
                  <Thumbnail label="Lateral" processing />
                </>
              ) : (
                <>
                  <ResultThumb number="012" />
                  <ResultThumb number="011" />
                  <ResultThumb number="010" />
                </>
              )}
            </div>
          </div>
        </section>

        <aside className="border-t bg-background lg:border-t-0 lg:border-l">
          <div className="flex h-14 items-center justify-between border-b px-5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              <h2 className="text-sm font-medium">Inspector</h2>
            </div>
            <span className="font-mono text-[9px] uppercase text-muted-foreground">Producto</span>
          </div>
          <div className="divide-y">
            <InspectorSection title="Transformación">
              <FieldGrid title="Posición" values={["X  0.42", "Y  1.18", "Z  -0.12"]} />
              <FieldGrid title="Rotación" values={["X  0°", "Y  -18°", "Z  1°"]} />
              <FieldGrid title="Escala" values={["X  1.00", "Y  1.00", "Z  1.00"]} />
            </InspectorSection>
            <InspectorSection title="Perspectiva">
              <RangeField label="Distancia focal" value="35 mm" />
              <RangeField label="Punto de fuga" value="68 / 43" />
              <label className="mt-4 flex min-h-11 items-center justify-between border-t pt-3 text-xs">
                <span>Mostrar ejes</span>
                <input type="checkbox" defaultChecked className="size-4 accent-foreground" />
              </label>
            </InspectorSection>
            <InspectorSection title="Apariencia">
              <RangeField label="Opacidad" value="100%" />
              <RangeField label="Sombra" value="24%" />
            </InspectorSection>
          </div>
          <div className="p-4">
            <Button variant="outline" className="w-full" disabled>
              <Download aria-hidden="true" /> Exportar vista
            </Button>
          </div>
        </aside>
      </div>
    </main>
  );
}

function ToolbarButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-10 place-items-center hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&_svg]:size-4"
    >
      {children}
    </button>
  );
}
function ViewButton({
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
        "min-h-8 px-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "bg-foreground text-background hover:text-background",
      )}
    >
      {children}
    </button>
  );
}
function TrayTab({
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
      className={cn(
        "h-full border-r px-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground",
        active && "bg-muted text-foreground",
      )}
    >
      {children}
    </button>
  );
}
function PanelContent({ section }: { section: Section }) {
  if (section === "background")
    return (
      <>
        <PanelHeading index="01" title="Fondo" text="Imagen espacial y mapa de profundidad." />
        <AssetLine icon={ImageIcon} name="interior-brutalist-01.webp" meta="3840 × 2160" />
        <Button variant="outline" className="mt-4 w-full">
          <ScanLine aria-hidden="true" /> Ver profundidad
        </Button>
      </>
    );
  if (section === "text")
    return (
      <>
        <PanelHeading index="03" title="Texto" text="Capas tipográficas opcionales." />
        <button
          type="button"
          className="flex min-h-14 w-full items-center justify-between border-y text-sm"
        >
          <span>STILL FORM.</span>
          <Eye className="size-4" />
        </button>
        <Button variant="outline" className="mt-4 w-full">
          <Plus aria-hidden="true" /> Añadir capa
        </Button>
      </>
    );
  return (
    <>
      <PanelHeading index="02" title="Producto" text="Vista limpia y orientaciones generadas." />
      <div className="checkerboard grid aspect-square place-items-center border">
        <div className="relative h-32 w-24">
          <div className="absolute inset-x-2 top-0 h-20 border bg-foreground" />
          <div className="absolute inset-x-0 top-18 h-7 border bg-foreground" />
          <div className="absolute bottom-0 left-3 h-16 w-3 bg-foreground" />
          <div className="absolute bottom-0 right-3 h-16 w-3 bg-foreground" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span>monolith-clean.png</span>
        <span className="font-mono text-[9px] text-muted-foreground">LISTO</span>
      </div>
      <Button className="mt-5 w-full">
        <RotateCw aria-hidden="true" /> Generar nueva vista
      </Button>
      <Button variant="ghost" className="mt-2 w-full">
        <Upload aria-hidden="true" /> Reemplazar producto
      </Button>
    </>
  );
}
function PanelHeading({ index, title, text }: { index: string; title: string; text: string }) {
  return (
    <div className="mb-6">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {index} / Recurso
      </p>
      <h2 className="mt-2 text-2xl font-medium tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}
function AssetLine({
  icon: Icon,
  name,
  meta,
}: {
  icon: typeof ImageIcon;
  name: string;
  meta: string;
}) {
  return (
    <div className="border-y py-4">
      <Icon className="mb-5 size-5" />
      <p className="truncate text-xs font-medium">{name}</p>
      <p className="mt-1 font-mono text-[9px] text-muted-foreground">{meta}</p>
    </div>
  );
}
function Thumbnail({
  label,
  active = false,
  processing = false,
}: {
  label: string;
  active?: boolean;
  processing?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "w-28 shrink-0 border p-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "border-foreground",
      )}
    >
      <div className="checkerboard grid aspect-square place-items-center">
        <Box className={cn("size-9", processing && "opacity-30")} />
        {processing ? <span className="absolute font-mono text-[8px]">PROCESANDO</span> : null}
      </div>
      <span className="mt-1 block truncate px-1 text-[10px]">{label}</span>
    </button>
  );
}
function ResultThumb({ number }: { number: string }) {
  return (
    <button
      type="button"
      className="w-28 shrink-0 border p-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="aspect-square bg-foreground p-3 text-background">
        <span className="font-mono text-[8px]">RESULTADO</span>
        <p className="mt-5 text-lg font-medium leading-none">
          STILL
          <br />
          FORM.
        </p>
      </div>
      <span className="mt-1 block px-1 font-mono text-[9px]">#{number}</span>
    </button>
  );
}
function InspectorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="p-5">
      <button
        type="button"
        className="mb-5 flex min-h-8 w-full items-center justify-between text-left text-xs font-medium"
      >
        <span>{title}</span>
        <ChevronDown className="size-3" />
      </button>
      {children}
    </section>
  );
}
function FieldGrid({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="mb-4">
      <p className="mb-2 font-mono text-[9px] uppercase text-muted-foreground">{title}</p>
      <div className="grid grid-cols-3 gap-px bg-border">
        {values.map((value) => (
          <input
            key={value}
            aria-label={`${title} ${value.charAt(0)}`}
            defaultValue={value}
            className="h-9 min-w-0 bg-muted px-2 font-mono text-[9px] outline-none focus:bg-background focus:ring-1 focus:ring-inset focus:ring-ring"
          />
        ))}
      </div>
    </div>
  );
}
function RangeField({ label, value }: { label: string; value: string }) {
  return (
    <label className="mb-4 block">
      <span className="mb-2 flex justify-between text-[10px]">
        <span>{label}</span>
        <span className="font-mono text-muted-foreground">{value}</span>
      </span>
      <input
        type="range"
        className="h-4 w-full accent-foreground"
        defaultValue="62"
        aria-label={label}
      />
    </label>
  );
}
