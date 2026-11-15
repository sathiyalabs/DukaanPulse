import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isNext =
  process.argv.some((arg) => arg.includes("next")) ||
  Boolean(process.env.VERCEL) ||
  Boolean(process.env.NEXT_PHASE);

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: isNext
    ? {
        resolveAlias: {
          "cloudflare:workers": "./lib/cloudflare-shim.ts",
        },
      }
    : {},
  webpack: isNext
    ? (config) => {
        config.resolve.alias = {
          ...config.resolve.alias,
          "cloudflare:workers": path.resolve(__dirname, "lib/cloudflare-shim.ts"),
        };
        return config;
      }
    : undefined,
};

export default nextConfig;
