import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dev-shomadhanhobe-resources.sgp1.digitaloceanspaces.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.digitaloceanspaces.com",
        pathname: "/**",
      },
    ],
  },
  // Increase body size limit for file uploads (2GB max)
  experimental: {
    serverActions: {
      bodySizeLimit: "2gb",
    },
  },
  // Increase server response timeout for large file uploads (30 minutes)
  serverExternalPackages: [],
};

export default nextConfig;
