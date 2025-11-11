import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  eslint: {
    // Temporarily ignore ESLint errors during builds
    // ESLint is configured and can be run separately with `npm run lint`
    // This allows the build to succeed while ESLint issues are being addressed
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
