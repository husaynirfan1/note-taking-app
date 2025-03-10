import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "child_process": false, // Disable child_process
      "fs": false, // Disable filesystem module (if needed)
    };
    return config;
  },
};

export default nextConfig;
