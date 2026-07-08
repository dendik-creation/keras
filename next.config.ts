import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle for Docker/self-hosting.
  output: "standalone",
};

export default nextConfig;
