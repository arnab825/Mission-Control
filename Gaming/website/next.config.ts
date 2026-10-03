import type { NextConfig } from "next";
import fs from "fs";
import path from "path";
import events from "events";

// Increase defaultMaxListeners to prevent false-positive warnings during concurrent asset pipelining / HMR
if (events.EventEmitter && typeof events.EventEmitter.defaultMaxListeners === "number") {
  events.EventEmitter.defaultMaxListeners = 50;
}

// Load public env variables if env-public.json exists
let publicEnv = {};
try {
  const envPath = path.resolve(process.cwd(), "env-public.json");
  if (fs.existsSync(envPath)) {
    publicEnv = JSON.parse(fs.readFileSync(envPath, "utf8"));
  }
} catch (e) {
  console.warn("Failed to load env-public.json:", e);
}

const rootDir = process.cwd();
const isVercel = Boolean(process.env.VERCEL);
const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  ...(isVercel ? {} : { output: "standalone" as const }),
  outputFileTracingRoot: rootDir,
  outputFileTracingIncludes: {
    "/docs": ["./docs/**/*"],
    "/docs/[slug]": ["./docs/**/*"],
    "/api/**": ["./docs/**/*"],
  },
  outputFileTracingExcludes: {
    "*": [
      "public/games/**",
      "public/screenshots/**",
      "public/images/**",
      "generate.log",
      "*.log",
      "*.tsbuildinfo",
    ],
  },
  // Disable compression in local dev to eliminate Gzip stream listener exhaustion; Vercel CDN handles edge compression in production
  compress: !isDev,
  reactStrictMode: true,
  turbopack: {
    root: rootDir,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "@tanstack/react-query"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "blob.vercel-storage.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "pollinations.ai" },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400,
  },
  env: Object.fromEntries(
    Object.entries(publicEnv).filter(
      ([_, val]) => typeof val === "string" && !val.startsWith("your_")
    )
  ) as Record<string, string>,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
      {
        source: "/(fonts|images|screenshots|games|logo.png)/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Cache-Control",
            value:
              "public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable",
          },
          {
            key: "CDN-Cache-Control",
            value: "public, s-maxage=31536000, stale-while-revalidate=86400, immutable",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "public, s-maxage=31536000, stale-while-revalidate=86400, immutable",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/download",
        destination: "/#download",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
