import { ArrowRight, Box, Layers3, ScanLine } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { EditorScene } from "@/components/editor-scene";
import { Button } from "@/components/ui/button";

const capabilities = [
  {
    number: "01",
    title: "Entender el espacio",
    text: "Convierte una imagen en una superficie de profundidad preparada para componer.",
    icon: ScanLine,
  },
  {
    number: "02",
    title: "Dirigir el objeto",
    text: "Define escala, perspectiva y punto de fuga con una guía espacial precisa.",
    icon: Box,
  },
  {
    number: "03",
    title: "Construir la escena",
    text: "Integra producto y tipografía en una sola dirección visual coherente.",
    icon: Layers3,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-svh overflow-hidden bg-background">
      <header className="flex h-20 items-center justify-between border-b px-4 md:px-8 lg:px-12">
        <BrandMark />
        <nav className="flex items-center gap-2" aria-label="Navegación principal">
          <Button variant="ghost" render={<Link href="/signin" />}>
            Acceder
          </Button>
          <Button render={<Link href="/dashboard" />}>
            Abrir estudio <ArrowRight aria-hidden="true" />
          </Button>
        </nav>
      </header>

      <section className="grid min-h-[calc(100svh-5rem)] lg:grid-cols-[minmax(0,0.83fr)_minmax(540px,1.17fr)]">
        <div className="flex flex-col justify-between border-b p-6 md:p-10 lg:border-b-0 lg:border-r lg:p-12">
          <div className="flex items-start justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <span>Estudio de composición</span>
            <span>V.01 / 2026</span>
          </div>
          <div className="py-16 lg:py-10">
            <p className="mb-6 font-mono text-xs uppercase tracking-[0.18em]">
              Del plano al espacio
            </p>
            <h1 className="max-w-3xl text-balance text-[clamp(3.3rem,7vw,7.6rem)] font-medium leading-[0.84] tracking-[-0.075em]">
              Construye imágenes que ocupan su lugar.
            </h1>
            <p className="mt-8 max-w-lg text-base leading-7 text-muted-foreground md:text-lg">
              Una mesa de trabajo visual para transformar fondos, orientar productos y componer
              resultados con profundidad real.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button size="lg" render={<Link href="/dashboard" />}>
                Empezar composición <ArrowRight aria-hidden="true" />
              </Button>
              <Button size="lg" variant="outline" render={<Link href="#sistema" />}>
                Ver el sistema
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 border-t pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <span>Fondo</span>
            <span>Producto</span>
            <span className="text-right">Resultado</span>
          </div>
        </div>

        <div className="technical-grid relative flex min-h-155 items-center justify-center bg-workspace p-4 md:p-10 lg:p-12">
          <div className="absolute left-4 top-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground md:left-10 md:top-8">
            Vista de trabajo / 01
          </div>
          <div className="w-full max-w-4xl border border-foreground/60 bg-background p-2 shadow-[12px_12px_0_0_var(--foreground)] md:p-3">
            <div className="mb-2 flex items-center justify-between border-b px-2 pb-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              <span>Escena editorial · Monolith 01</span>
              <span>1920 × 1080</span>
            </div>
            <EditorScene className="min-h-110 md:min-h-130" compact />
          </div>
        </div>
      </section>

      <section id="sistema" className="border-t px-4 py-20 md:px-8 lg:px-12 lg:py-28">
        <div className="mb-16 grid gap-6 lg:grid-cols-2">
          <p className="font-mono text-xs uppercase tracking-[0.18em]">Un flujo. Tres capas.</p>
          <h2 className="max-w-2xl text-4xl font-medium leading-tight tracking-[-0.04em] md:text-6xl">
            Menos interfaz. Más control sobre la imagen.
          </h2>
        </div>
        <div className="grid border-t lg:grid-cols-3">
          {capabilities.map(({ number, title, text, icon: Icon }) => (
            <article
              key={number}
              className="group border-b py-8 lg:border-r lg:px-8 lg:first:pl-0 lg:last:border-r-0"
            >
              <div className="mb-16 flex items-center justify-between font-mono text-xs text-muted-foreground">
                <span>{number}</span>
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <h3 className="text-2xl font-medium tracking-tight">{title}</h3>
              <p className="mt-3 max-w-sm leading-6 text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="flex flex-col gap-8 border-t bg-foreground px-4 py-12 text-background md:flex-row md:items-end md:justify-between md:px-8 lg:px-12">
        <div>
          <BrandMark className="text-background" />
          <p className="mt-8 max-w-sm text-sm leading-6 text-background/65">
            Dirección visual de producto para equipos que trabajan con intención.
          </p>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-background/55">
          Next.js · Convex · Self-hosted
        </p>
      </footer>
    </main>
  );
}
