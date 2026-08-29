import Link from "next/link";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  href?: string;
  compact?: boolean;
};

export function BrandMark({ className, href = "/", compact = false }: BrandMarkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center gap-3 font-mono text-xs font-semibold uppercase tracking-[0.16em] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      aria-label="The Next Craft, inicio"
    >
      <span className="grid size-7 grid-cols-2 border border-current" aria-hidden="true">
        <span className="border-r border-b border-current bg-current" />
        <span className="border-b border-current" />
        <span className="border-r border-current" />
        <span className="bg-current" />
      </span>
      {compact ? <span className="sr-only">The Next Craft</span> : <span>THE NEXT CRAFT</span>}
    </Link>
  );
}
