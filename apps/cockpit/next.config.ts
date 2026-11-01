import path from "node:path";
import type { NextConfig } from "next";

const API_ORIGIN = process.env.DAEDALUS_API_ORIGIN ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Linting runs through oxlint (`npm run lint`); type checking through TypeScript 7 (`npm run typecheck`).
  eslint: { ignoreDuringBuilds: true },
  outputFileTracingRoot: path.join(__dirname),
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/:path*` }];
  },
};

export default nextConfig;
