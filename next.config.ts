import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The workspace has a root package-lock.json in addition to the project's.
  // Point Turbopack at this project's lockfile to silence the "detected
  // multiple lockfiles" warning and avoid root ambiguity.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
