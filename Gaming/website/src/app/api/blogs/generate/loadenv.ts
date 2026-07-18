import fs from "fs";
import path from "path";

try {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
    envConfig.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const firstEquals = trimmed.indexOf("=");
        if (firstEquals !== -1) {
          const key = trimmed.substring(0, firstEquals).trim();
          const value = trimmed.substring(firstEquals + 1).trim();
          process.env[key] = value;
        }
      }
    });
  }
} catch (err) {
  console.error("Failed to load .env:", err);
}

(process.env as any).NODE_ENV = "development";

