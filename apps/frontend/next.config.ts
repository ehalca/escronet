import type { NextConfig } from "next";
import path from "path";

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:3010").replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Standalone mode bundles only the files needed to run the app.
  // outputFileTracingRoot must point to the monorepo root so Next.js
  // traces files across workspace packages.
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  transpilePackages: ["@escronet/shared", "@escronet/shared-ui", "@escronet/i18n"],
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
