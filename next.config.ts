import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  experimental: {
    optimizePackageImports: ["lucide-react", "motion", "gsap", "date-fns"],
  },

  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  poweredByHeader: false,
};

export default nextConfig;
