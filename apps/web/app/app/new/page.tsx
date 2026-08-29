import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { NewProjectBackgroundStep } from "@/components/new-project-background-step";

export default function NewProjectPage() {
  return (
    <AppShell active="new" eyebrow="Proyectos / Nuevo" title="Cargar fondo">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard"
          className="mb-10 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Volver a vista general
        </Link>
        <NewProjectBackgroundStep />
      </div>
    </AppShell>
  );
}
