import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { ModelViewer } from "@/components/model-viewer";
import { Button } from "@/components/ui/button";

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

      <section className="technical-grid flex h-[calc(100svh-5rem)] flex-col items-center justify-center gap-6 bg-workspace px-6 py-10 text-center lg:grid lg:grid-cols-[minmax(0,0.83fr)_minmax(540px,1.17fr)] lg:items-stretch lg:justify-normal lg:gap-0 lg:px-0 lg:py-0 lg:text-left">
        <div className="order-2 flex flex-col items-center lg:order-1 lg:items-start lg:justify-center lg:p-12">
          <h1 className="max-w-3xl text-balance text-[clamp(3.3rem,7vw,7.6rem)] font-medium leading-[0.84] tracking-[-0.075em]">
            Just Scale It
          </h1>
          <p className="mt-8 max-w-lg text-base leading-7 text-muted-foreground md:text-lg">
            A visual workspace to transform backgrounds, orient products, and compose results with
            real depth.
          </p>
        </div>

        <div className="relative order-1 h-88 w-88 shrink-0 sm:h-104 sm:w-104 lg:order-2 lg:h-auto lg:w-auto lg:flex-1">
          <ModelViewer className="absolute inset-0" />
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
