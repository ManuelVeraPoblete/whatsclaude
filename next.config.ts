import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@whiskeysockets/baileys", "better-sqlite3", "pino"],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
