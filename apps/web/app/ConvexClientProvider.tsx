"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import { type ReactNode, useState } from "react";

function resolveConvexUrl(initialUrl?: string): string {
  if (initialUrl && !initialUrl.includes("thenextcraft-backend")) {
    return initialUrl;
  }

  const envUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (envUrl && !envUrl.includes("thenextcraft-backend")) {
    return envUrl;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/convex-api`;
  }

  return initialUrl || envUrl || "http://127.0.0.1:3210";
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
