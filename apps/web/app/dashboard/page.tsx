import { ArrowRight, Clock3, Image, Plus, ScanLine } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { EditorScene } from "@/components/editor-scene";
import { Button } from "@/components/ui/button";

const projects = [
  {
    id: "proyecto-atlas",
    index: "01",
    name: "Atlas / Monolith",
    status: "En edición",
    sessions: 4,
    outputs: 12,
    updated: "Hace 18 min",
  },
  {
    id: "proyecto-intervalo",
    index: "02",
    name: "Intervalo / Lámpara",
    status: "Preparando fondo",
    sessions: 2,
    outputs: 5,
    updated: "Ayer",
  },
  {
    id: "proyecto-objeto",
    index: "03",
    name: "Objeto / Serie 04",
    status: "Finalizado",
    sessions: 6,
    outputs: 24,
    updated: "22 ago",
  },
];

export default function DashboardPage() {
  return (
    <AppShell
      active="dashboard"
      title="Vista general"
      actions={
        <Button render={<Link href="/app/new" />}>
          <Plus aria-hidden="true" /> Nuevo fondo
        </Button>
      }
    >
      <section className="grid gap-10 border-b pb-12 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Sábado, 29 de agosto
          </p>
          <h2 className="mt-4 max-w-2xl text-5xl font-medium leading-[0.94] tracking-[-0.055em] md:text-7xl">
            Continúa donde la imagen tomó forma.
          </h2>
          <div className="mt-10 flex flex-wrap gap-8 border-t pt-5">
            <Metric value="03" label="Proyectos activos" />
            <Metric value="12" label="Sesiones" />
            <Metric value="41" label="Resultados" />
          </div>
        </div>
        <Link
          href="/app/proyecto-atlas/sessions/sesion-04"
          className="group self-end border border-foreground bg-workspace p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <EditorScene compact className="min-h-64" />
          <div className="flex items-end justify-between gap-4 border-t border-foreground p-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Sesión reciente / 04
              </p>
              <h3 className="mt-1 text-lg font-medium">Monolith — Dirección frontal</h3>
            </div>
            <ArrowRight
              className="size-5 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </div>
        </Link>
      </section>

      <section className="py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Archivo activo
            </p>
            <h2 className="mt-1 text-2xl font-medium tracking-tight">Proyectos recientes</h2>
          </div>
          <Button variant="ghost" render={<Link href="/app/proyecto-atlas" />}>
            Ver todos <ArrowRight aria-hidden="true" />
          </Button>
        </div>
        <div className="border-t">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/app/${project.id}`}
              className="group grid min-h-24 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-4 border-b py-4 outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:grid-cols-[64px_minmax(220px,1fr)_160px_130px_120px]"
            >
              <span className="font-mono text-xs text-muted-foreground">{project.index}</span>
              <div>
                <h3 className="text-lg font-medium tracking-tight">{project.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground md:hidden">{project.status}</p>
              </div>
              <span className="hidden text-sm md:block">{project.status}</span>
              <span className="hidden font-mono text-xs text-muted-foreground md:block">
                {project.sessions} sesiones · {project.outputs} salidas
              </span>
              <span className="flex items-center justify-end gap-2 font-mono text-[10px] text-muted-foreground">
                <Clock3 className="size-3" aria-hidden="true" /> {project.updated}
                <ArrowRight
                  className="ml-2 size-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid border-t md:grid-cols-3">
        <Status icon={Image} value="08" label="Fondos procesados" />
        <Status icon={ScanLine} value="06" label="Mapas de profundidad" />
        <Status icon={ArrowRight} value="41" label="Resultados exportables" />
      </section>
    </AppShell>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <strong className="font-mono text-2xl font-medium">{value}</strong>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
function Status({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Image;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-5 border-b py-6 md:border-r md:px-6 md:first:pl-0 md:last:border-r-0">
      <Icon className="size-5" aria-hidden="true" />
      <span className="font-mono text-2xl">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
