import { ArrowRight, Box, Layers3, ScanLine } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { ModelViewer } from "@/components/model-viewer";
import { Button } from "@/components/ui/button";

const capabilities = [
  {
    number: "01",
    title: "Understand the space",
    text: "Turn an image into a depth surface ready to compose.",
    icon: ScanLine,
  },
  {
    number: "02",
    title: "Direct the object",
    text: "Define scale, perspective, and vanishing point with precise spatial guidance.",
    icon: Box,
  },
  {
    number: "03",
    title: "Build the scene",
    text: "Integrate product and typography into one coherent visual direction.",
    icon: Layers3,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-svh overflow-hidden bg-background">
      <header className="flex h-20 items-center justify-between border-b px-4 md:px-8 lg:px-12">
        <BrandMark />
        <nav className="flex items-center gap-2" aria-label="Main navigation">
          <Button variant="ghost" render={<Link href="/signin" />}>
            Sign in
          </Button>
          <Button render={<Link href="/app" />}>
            Open studio <ArrowRight aria-hidden="true" />
          </Button>
        </nav>
      </header>

      <section className="grid min-h-[calc(100svh-5rem)] lg:grid-cols-[minmax(0,0.83fr)_minmax(540px,1.17fr)]">
        <div className="flex flex-col justify-center p-6 md:p-10 lg:p-12">
          <h1 className="max-w-3xl text-balance text-[clamp(3.3rem,7vw,7.6rem)] font-medium leading-[0.84] tracking-[-0.075em]">
            Just Scale It
          </h1>
          <p className="mt-8 max-w-lg text-base leading-7 text-muted-foreground md:text-lg">
            A visual workspace to transform backgrounds, orient products, and compose results
            with real depth.
          </p>
        </div>

        <div className="relative flex min-h-155 items-center justify-center p-4 md:p-10 lg:p-12">
          <ModelViewer className="h-110 w-full max-w-4xl md:h-130" />
        </div>
      </section>

      <section id="sistema" className="border-t px-4 py-20 md:px-8 lg:px-12 lg:py-28">
        <div className="mb-16 grid gap-6 lg:grid-cols-2">
          <p className="font-mono text-xs uppercase tracking-[0.18em]">One flow. Three layers.</p>
          <h2 className="max-w-2xl text-4xl font-medium leading-tight tracking-[-0.04em] md:text-6xl">
            Less interface. More control over the image.
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
            Visual product direction for teams that work with intention.
          </p>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-background/55">
          Next.js · Convex · Self-hosted
        </p>
      </footer>
    </main>
  );
}
