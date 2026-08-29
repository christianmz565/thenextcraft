"use client";

import { ImageUp, Loader2, Upload } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";

type ImageDropzoneProps = {
  title: string;
  hint: string;
  busy?: boolean;
  busyLabel?: string;
  className?: string;
  onSelect: (file: File) => void;
};

export function ImageDropzone({
  title,
  hint,
  busy = false,
  busyLabel = "Subiendo…",
  className,
  onSelect,
}: ImageDropzoneProps) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  return (
    <label
      htmlFor={inputId}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (busy) return;
        const dropped = event.dataTransfer.files?.[0];
        if (dropped) onSelect(dropped);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-foreground/50 bg-background/80 p-8 text-center focus-within:ring-2 focus-within:ring-ring",
        dragging && "border-foreground bg-muted",
        busy && "pointer-events-none opacity-70",
        className,
      )}
    >
      {busy ? (
        <Loader2 className="size-7 animate-spin" aria-hidden="true" />
      ) : (
        <ImageUp className="size-7" aria-hidden="true" />
      )}
      <span className="text-xl font-medium tracking-tight">{busy ? busyLabel : title}</span>
      <span className="max-w-md text-sm leading-6 text-muted-foreground">{hint}</span>
      {!busy ? (
        <span className="inline-flex min-h-10 items-center gap-2 border px-4 text-sm font-medium">
          <Upload className="size-4" aria-hidden="true" /> Seleccionar imagen
        </span>
      ) : null}
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        JPEG · PNG · WebP · máx 25 MB
      </span>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected) onSelect(selected);
          event.target.value = "";
        }}
      />
    </label>
  );
}
