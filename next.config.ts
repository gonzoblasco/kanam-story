import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El workspace tiene un package-lock.json raíz además del del proyecto.
  // Apuntamos Turbopack al lockfile de este proyecto para silenciar el warning
  // "detected multiple lockfiles" y evitar ambigüedad de root.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
