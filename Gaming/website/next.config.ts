import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

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

const nextConfig: NextConfig = {
  outputFileTracingRoot: rootDir,
  outputFileTracingExcludes: {
    "*": [
      "public/games/**",
      "public/screenshots/**",
      "public/images/**",
      "node_modules/@swc/**",
      "node_modules/@esbuild/**",
      "node_modules/typescript/**",
      "generate.log",
      "*.log",
      "*.tsbuildinfo"
    ],
  },
  compress: true,
  reactStrictMode: true,
  turbopack: {
    root: rootDir,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "blob.vercel-storage.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "pollinations.ai" }
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
  },
  env: Object.fromEntries(
    Object.entries(publicEnv).filter(([_, val]) => typeof val === "string" && !val.startsWith("your_"))
  ) as Record<string, string>,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" }
        ]
      },
      {
        source: "/(fonts|images|screenshots|games|logo.png)/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable" },
          { key: "CDN-Cache-Control", value: "public, s-maxage=31536000, stale-while-revalidate=86400, immutable" },
          { key: "Vercel-CDN-Cache-Control", value: "public, s-maxage=31536000, stale-while-revalidate=86400, immutable" }
        ]
      }
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
  async rewrites() {
    // If running on Vercel and RENDER_BACKEND_URL is configured,
    // proxy API routes directly to Render backend.
    // Note: /downloads is intentionally NOT proxied so it directly triggers
    // the local 302 redirect to GitHub Releases CDN without burning Vercel origin bandwidth.
    const renderBackend = process.env.RENDER_BACKEND_URL?.replace(/\/$/, "");
    if (renderBackend) {
      return [
        {
          source: "/api/:path*",
          destination: `${renderBackend}/api/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;

