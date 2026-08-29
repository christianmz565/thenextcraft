// biome-ignore lint/style/noRestrictedImports: next.config.ts runs before tsconfig path resolution
import "./env";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["backend"],
};

export default nextConfig;
