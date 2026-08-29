import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { HeroReveal } from "@/components/hero-reveal";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="bg-background">
      <header className="snap-start flex h-20 items-center justify-between border-b bg-background px-4 md:px-8 lg:px-12">
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

      <HeroReveal />

      <footer className="snap-end flex flex-col gap-8 border-t bg-foreground px-4 py-12 text-background md:flex-row md:items-end md:justify-between md:px-8 lg:px-12">
        <div>
          <BrandMark className="text-background" />
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-background/55">
          Next.js · Convex · Self-hosted
        </p>
      </footer>
    </main>
  );
}
