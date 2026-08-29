"use client";

import type { HydratedDepthMap } from "backend/convex/depth.js";
import { useState } from "react";

import { DepthStage } from "@/components/depth-stage";
import { PerspectivePanel } from "@/components/perspective-panel";
import { cn } from "@/lib/utils";

type View = "cube" | "perspective" | "scene" | "depth" | "color" | "product";

export function DepthResult({ job }: { job: HydratedDepthMap }) {
  const [view, setView] = useState<View>("cube");

  const views: { id: View; label: string; enabled: boolean }[] = [
    { id: "cube", label: "Escena + cubo", enabled: Boolean(job.sceneUrl && job.depthUrl) },
    {
      id: "perspective",
      label: "Perspectivas",
      enabled: Boolean(job.sceneUrl && job.depthUrl),
    },
    { id: "scene", label: "Fondo", enabled: Boolean(job.sceneUrl) },
    { id: "product", label: "Producto", enabled: Boolean(job.objectUrl) },
    { id: "depth", label: "Profundidad", enabled: Boolean(job.depthUrl) },
    { id: "color", label: "Coloreado", enabled: Boolean(job.colorDepthUrl) },
  ];

  return (
    <div className="w-full max-w-5xl">
      <div className="flex flex-wrap items-center gap-1 border border-foreground/50 border-b-0 bg-background px-2 py-2">
        {views.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={!item.enabled}
            aria-pressed={view === item.id}
            onClick={() => setView(item.id)}
            className={cn(
              "min-h-8 px-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
              view === item.id && "bg-foreground text-background hover:text-background",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {view === "perspective" ? (
        <PerspectivePanel job={job} />
      ) : view === "cube" && job.sceneUrl && job.depthUrl ? (
        <DepthStage
          sceneUrl={job.sceneUrl}
          depthUrl={job.depthUrl}
          colorDepthUrl={job.colorDepthUrl}
        />
      ) : (
        <SingleView
          url={
            view === "scene"
              ? job.sceneUrl
              : view === "product"
                ? job.objectUrl
                : view === "depth"
                  ? job.depthUrl
                  : job.colorDepthUrl
          }
          label={views.find((item) => item.id === view)?.label ?? ""}
          checkerboard={view === "product"}
        />
      )}
    </div>
  );
}

function SingleView({
  url,
  label,
  checkerboard,
}: {
  url: string | null;
  label: string;
  checkerboard: boolean;
}) {
  if (!url) {
    return (
      <p className="border border-foreground/50 bg-background p-8 text-center text-sm text-muted-foreground">
        Vista no disponible.
      </p>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={label}
      crossOrigin="anonymous"
      className={cn(
        "max-h-[70svh] w-full border border-foreground/50 object-contain p-2 shadow-[8px_8px_0_0_var(--foreground)]",
        checkerboard ? "checkerboard" : "bg-canvas",
      )}
    />
  );
}
