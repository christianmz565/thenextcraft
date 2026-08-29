"use client";

import { ArrowRight, ImageUp, RefreshCw, Upload } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { EditorScene } from "@/components/editor-scene";
import { Button } from "@/components/ui/button";

export function NewProjectBackgroundStep() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const nameId = useId();
  const fileId = useId();
  const hasBackground = fileName !== null;

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.58fr)] lg:items-start">
      <section>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Paso 1 de 1 · Requerido
        </p>
        <h2 className="mt-4 max-w-xl text-5xl font-medium leading-[0.95] tracking-[-0.055em] md:text-7xl">
          Empieza por el fondo.
        </h2>
        <p className="mt-6 max-w-lg leading-7 text-muted-foreground">
          El espacio define la escena. Sube la imagen base y el proyecto se abrirá listo para
          trabajar la profundidad.
        </p>

        {hasBackground ? (
          <div className="mt-10 border">
            <EditorScene compact className="min-h-72" />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{fileName}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Fondo listo
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setFileName(null)}>
                <RefreshCw aria-hidden="true" /> Cambiar imagen
              </Button>
            </div>
          </div>
        ) : (
          <label
            htmlFor={fileId}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const dropped = event.dataTransfer.files?.[0];
              if (dropped) {
                setFileName(dropped.name);
              }
            }}
            className={`technical-grid mt-10 flex min-h-80 cursor-pointer flex-col items-center justify-center gap-4 border border-dashed p-8 text-center transition-colors focus-within:ring-2 focus-within:ring-ring ${
              dragging ? "border-foreground bg-muted" : "hover:bg-muted/60"
            }`}
          >
            <ImageUp className="size-8" aria-hidden="true" />
            <span className="text-lg font-medium">Arrastra la imagen del fondo</span>
            <span className="max-w-sm text-sm text-muted-foreground">
              JPEG, PNG o WebP. Usa la resolución más alta disponible para conservar detalle.
            </span>
            <span className="inline-flex min-h-10 items-center gap-2 border px-4 text-sm font-medium">
              <Upload className="size-4" aria-hidden="true" /> Seleccionar archivo
            </span>
            <input
              id={fileId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (selected) {
                  setFileName(selected.name);
                }
              }}
            />
          </label>
        )}

        <div className="mt-10 border-t pt-8">
          <label
            htmlFor={nameId}
            className="mb-3 block font-mono text-[10px] uppercase tracking-[0.16em]"
          >
            Nombre del proyecto <span className="text-muted-foreground">(opcional)</span>
          </label>
          <input
            id={nameId}
            name="name"
            placeholder="Se nombrará con la imagen si lo dejas vacío"
            className="h-14 w-full border-b border-input bg-transparent px-0 text-xl outline-none transition-colors placeholder:text-base placeholder:text-muted-foreground focus:border-foreground"
          />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {hasBackground ? (
            <Button
              size="lg"
              className="justify-between sm:min-w-64"
              render={<Link href="/app/proyecto-atlas/sessions/sesion-04" />}
            >
              Abrir editor <ArrowRight aria-hidden="true" />
            </Button>
          ) : (
            <Button size="lg" className="justify-between sm:min-w-64" disabled>
              Abrir editor <ArrowRight aria-hidden="true" />
            </Button>
          )}
          <Button size="lg" variant="ghost" render={<Link href="/dashboard" />}>
            Cancelar
          </Button>
        </div>
        {!hasBackground ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Necesitas un fondo para continuar. El producto y el texto se añaden dentro del editor.
          </p>
        ) : null}
      </section>

      <aside className="border-t pt-5 lg:mt-24">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Después del fondo
        </p>
        <ol className="mt-6 divide-y border-y">
          <Step index="02" title="Profundidad y cubo" text="Ajusta perspectiva y punto de fuga." />
          <Step index="03" title="Producto" text="Sube la imagen y genera sus vistas." />
          <Step index="04" title="Texto y resultado" text="Compón y exporta la imagen final." />
        </ol>
        <p className="mt-6 text-xs leading-5 text-muted-foreground">
          Esta pantalla es una demostración visual. La carga real se conectará con Convex en la fase
          funcional.
        </p>
      </aside>
    </div>
  );
}

function Step({ index, title, text }: { index: string; title: string; text: string }) {
  return (
    <li className="grid grid-cols-[36px_1fr] items-start gap-3 py-5">
      <span className="font-mono text-xs text-muted-foreground">{index}</span>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
    </li>
  );
}
