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
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
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
