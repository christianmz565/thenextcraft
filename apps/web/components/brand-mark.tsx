import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  href?: string;
  tone?: "surface" | "inverted";
};

export function BrandMark({ className, href = "/", tone = "surface" }: BrandMarkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      aria-label="The Next Craft, inicio"
    >
      <Image
        src="/logo-mark.png"
        alt=""
        width={480}
        height={569}
        priority
        className={cn("h-8 w-auto", tone === "surface" ? "invert dark:invert-0" : "dark:invert")}
      />
    </Link>
  );
}
