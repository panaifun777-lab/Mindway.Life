import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "localhost:81",
    "localhost:3000",
    "21.0.22.72:81",
    "*.space-z.ai",
    "mindway.life",
    "www.mindway.life",
  ],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
