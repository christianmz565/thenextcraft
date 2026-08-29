import "@/env";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["backend"],
};

export default nextConfig;
