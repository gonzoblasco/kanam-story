import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The workspace has a root package-lock.json in addition to the project's.
  // Point Turbopack at this project's lockfile so it resolves the app root
  // (and API routes) correctly instead of inferring the workspace root.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
