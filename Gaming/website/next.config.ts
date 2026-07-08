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

const nextConfig: NextConfig = {
  turbopack: {
    root: "..",
  },
  env: {
    ...publicEnv,
  }
};

export default nextConfig;
