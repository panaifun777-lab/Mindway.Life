import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "localhost:81",
    "localhost:3000",
    "21.0.22.72:81",
    "*.space-z.ai",
  ],
};

export default nextConfig;
