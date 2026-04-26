import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  turbopack: {
    // Turbopack configuration for Tailwind CSS
  },
  allowedDevOrigins: ['192.168.1.132'],
};

export default nextConfig;

