import { ArrowRight, Download, Image, MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { EditorScene } from "@/components/editor-scene";
import { Button } from "@/components/ui/button";

const sessions = [
  {
    id: "sesion-04",
    index: "04",
    name: "Dirección frontal",
    status: "En edición",
    updated: "Hace 18 min",
    format: "4:5",
  },
  {
    id: "sesion-03",
    index: "03",
    name: "Perspectiva lateral",
    status: "Resultado listo",
    updated: "Ayer",
    format: "16:9",
  },
  {
    id: "sesion-02",
    index: "02",
    name: "Ensayo de escala",
    status: "Resultado listo",
    updated: "27 ago",
    format: "1:1",
  },
];

export default function ProjectPage() {
  return (
    <AppShell
      active="projects"
      eyebrow="Proyectos / Atlas"
      title="Atlas / Monolith"
      actions={
        <Button render={<Link href="/app/proyecto-atlas/sessions/sesion-04" />}>
          <Plus aria-hidden="true" /> Nueva sesión
        </Button>
      }
    >
      <section className="grid gap-8 border-b pb-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Proyecto 0017 / Activo
          </p>
          <h2 className="mt-4 text-6xl font-medium leading-none tracking-[-0.06em] md:text-8xl">
            Atlas
            <br />
            Monolith.
          </h2>
        </div>
        <dl className="grid grid-cols-2 gap-x-12 gap-y-6 border-t pt-5 font-mono text-xs lg:min-w-80">
          <div>
            <dt className="text-muted-foreground">Sesiones</dt>
            <dd className="mt-1 text-xl text-foreground">04</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Resultados</dt>
            <dd className="mt-1 text-xl text-foreground">12</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Formato activo</dt>
            <dd className="mt-1 text-foreground">4:5 vertical</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Actualizado</dt>
            <dd className="mt-1 text-foreground">29 ago 2026</dd>
          </div>
        </dl>
      </section>

      <section className="py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Mesa de trabajo
            </p>
            <h2 className="mt-1 text-2xl font-medium">Sesiones</h2>
          </div>
          <Button variant="outline" render={<Link href="/app/proyecto-atlas/sessions/sesion-04" />}>
            Abrir sesión activa <ArrowRight aria-hidden="true" />
          </Button>
        </div>
        <div className="grid gap-px bg-border lg:grid-cols-3">
          {sessions.map((session, index) => (
            <Link
              key={session.id}
              href={`/app/proyecto-atlas/sessions/${session.id}`}
              className="group bg-background p-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <EditorScene
                compact
                className={`min-h-56 ${index === 1 ? "grayscale contrast-125" : index === 2 ? "grayscale brightness-75" : ""}`}
              />
              <div className="flex justify-between gap-4 p-4">
                <div>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    SESIÓN {session.index} · {session.format}
                  </span>
                  <h3 className="mt-1 text-lg font-medium">{session.name}</h3>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {session.status} · {session.updated}
                  </p>
                </div>
                <ArrowRight
                  className="mt-1 size-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-10 border-t py-12 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-medium">Recursos del proyecto</h2>
            <button
              type="button"
              aria-label="Más opciones"
              className="grid size-11 place-items-center hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MoreHorizontal className="size-5" />
            </button>
          </div>
          <div className="border-t">
            <Resource
              icon={Image}
              name="interior-brutalist-01.webp"
              kind="Fondo"
              meta="3840 × 2160 · 4.8 MB"
            />
            <Resource
              icon={Image}
              name="monolith-chair-clean.png"
              kind="Producto"
              meta="2048 × 2048 · 2.1 MB"
            />
            <Resource
              icon={Image}
              name="depth-map-v03.png"
              kind="Profundidad"
              meta="1920 × 1080 · 1.4 MB"
            />
          </div>
        </div>
        <aside className="border-t pt-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Último resultado
          </p>
          <div className="technical-grid mt-5 aspect-4/5 border p-4">
            <div className="h-full border bg-foreground p-6 text-background">
              <p className="font-mono text-[10px] uppercase tracking-wider text-background/60">
                Monolith / 012
              </p>
              <p className="mt-16 text-5xl font-medium leading-[0.85] tracking-[-0.06em]">
                STILL
                <br />
                FORM.
              </p>
            </div>
          </div>
          <Button variant="outline" className="mt-3 w-full" disabled>
            <Download aria-hidden="true" /> Descargar PNG
          </Button>
        </aside>
      </section>
    </AppShell>
  );
}

function Resource({
  icon: Icon,
  name,
  kind,
  meta,
}: {
  icon: typeof Image;
  name: string;
  kind: string;
  meta: string;
}) {
  return (
    <div className="grid min-h-20 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-4 border-b">
      <Icon className="size-4" aria-hidden="true" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">{meta}</p>
      </div>
      <span className="font-mono text-[10px] uppercase text-muted-foreground">{kind}</span>
    </div>
  );
}
