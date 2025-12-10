import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    // Set the root directory to silence the multiple lockfiles warning
    root: __dirname,
  },
  // Ensure the correct working directory for the frontend
  experimental: {
    // Add any experimental features here if needed
  },
};

export default nextConfig;
