"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import { type ReactNode, useState } from "react";

function isValidPublicUrl(url?: string): boolean {
  if (!url) return false;
  return (
    !url.includes("thenextcraft-backend") &&
    !url.includes("placeholder.local") &&
    !url.includes("127.0.0.1:3210")
  );
}

function resolveConvexUrl(initialUrl?: string): string {
  if (typeof window !== "undefined") {
    if (isValidPublicUrl(initialUrl)) {
      return initialUrl!;
    }
    const envUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (isValidPublicUrl(envUrl)) {
      return envUrl!;
    }
    return `${window.location.origin}/convex-api`;
  }

  if (isValidPublicUrl(initialUrl)) {
    return initialUrl!;
  }
  return "https://scale-ar.ynoacamino.tech/convex-api";
}

export function ConvexClientProvider({
  children,
  initialConvexUrl,
}: {
  children: ReactNode;
  initialConvexUrl?: string;
}) {
  const [convex] = useState(() => new ConvexReactClient(resolveConvexUrl(initialConvexUrl)));

  return <ConvexAuthNextjsProvider client={convex}>{children}</ConvexAuthNextjsProvider>;
}
