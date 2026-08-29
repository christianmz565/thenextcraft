"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { ModelViewer } from "@/components/model-viewer";

export function HeroReveal() {
  const imageLayerRef = useRef<HTMLDivElement>(null);
  const [imageRevealed, setImageRevealed] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("snap-y", "snap-mandatory");
    return () => root.classList.remove("snap-y", "snap-mandatory");
  }, []);

  useEffect(() => {
    const node = imageLayerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setImageRevealed(entry.intersectionRatio >= 0.5),
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative h-[calc(200svh-5rem)]">
      <div className="technical-grid absolute inset-x-0 top-0 h-[calc(100svh-5rem)] bg-workspace" />
      <div
        ref={imageLayerRef}
        className="absolute inset-x-0 top-[calc(100svh-5rem)] h-svh snap-start snap-always overflow-hidden"
      >
        <Image src="/background.jpg" alt="" fill sizes="100vw" className="object-cover" />
      </div>

      <section className="sticky top-0 z-10 flex h-[calc(100svh-5rem)] flex-col items-center justify-center gap-6 px-6 py-10 text-center lg:grid lg:grid-cols-[minmax(0,0.83fr)_minmax(540px,1.17fr)] lg:items-stretch lg:justify-normal lg:gap-0 lg:px-0 lg:py-0 lg:text-left">
        <div className="relative order-2 flex flex-col items-center lg:order-1 lg:items-start lg:justify-center lg:p-12">
          <div
            aria-hidden="true"
            className={`technical-grid pointer-events-none absolute -inset-6 bg-workspace/60 backdrop-blur-xl transition-opacity duration-700 ease-out md:-inset-10 ${
              imageRevealed ? "opacity-100" : "opacity-0"
            }`}
            style={{
              maskImage: "radial-gradient(ellipse at center, black 50%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 50%, transparent 100%)",
            }}
          />
          <h1 className="relative max-w-3xl text-balance text-[clamp(3.3rem,7vw,7.6rem)] font-medium leading-[0.84] tracking-[-0.075em]">
            Just Scale It
          </h1>
          <p className="relative mt-8 max-w-lg text-base leading-7 text-muted-foreground md:text-lg">
            A web platform that lets any business create high-impact visual advertising without
            needing design skills.
          </p>
        </div>

        <div className="relative order-1 h-88 w-88 shrink-0 sm:h-104 sm:w-104 lg:order-2 lg:h-auto lg:w-auto lg:flex-1">
          <ModelViewer className="absolute inset-0" paused={imageRevealed} />
        </div>
      </section>
    </div>
  );
}
