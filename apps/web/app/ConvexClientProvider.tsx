"use client";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

function getConvexUrl(): string {
  let url =
    process.env["NEXT_PUBLIC_CONVEX_URL"] ||
    process.env["CONVEX_SELF_HOSTED_URL"] ||
    process.env["CONVEX_URL"] ||
    "http://thenextcraft-backend:3210";

  if (typeof window !== "undefined" && url.includes("thenextcraft-backend")) {
    url = url.replace("thenextcraft-backend", window.location.hostname || "127.0.0.1");
  }

  return url;
}

const convexUrl = getConvexUrl();
const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexAuthNextjsProvider client={convex}>{children}</ConvexAuthNextjsProvider>;
}
