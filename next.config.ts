import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  turbopack: {
    // Turbopack configuration for Tailwind CSS
  },
};

export default nextConfig;

