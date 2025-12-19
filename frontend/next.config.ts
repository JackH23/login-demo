import type { NextConfig } from "next";

const normalizeBackendBaseUrl = (value: string) =>
  value.trim().replace(/\/+$/, "").replace(/\/api$/i, "");

const backendBaseUrl = normalizeBackendBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
);

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendBaseUrl}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backendBaseUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
