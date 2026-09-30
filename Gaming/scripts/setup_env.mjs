import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// __dirname is Gaming/scripts, so Gaming root is path.resolve(__dirname, "..")
const gamingDir = path.resolve(__dirname, "..");

const targets = [
  {
    name: "Frontend (Desktop App)",
    example: path.join(gamingDir, "frontend", ".env.example"),
    dest: path.join(gamingDir, "frontend", ".env"),
  },
  {
    name: "Website (Next.js)",
    example: path.join(gamingDir, "website", ".env.example"),
    dest: path.join(gamingDir, "website", ".env.local"),
  },
  {
    name: "Backend (Python)",
    example: path.join(gamingDir, "backend", ".env.example"),
    dest: path.join(gamingDir, "backend", ".env"),
  },
];

console.log("\n======================================================");
console.log("  Mission Control - Contributor Environment Initializer");
console.log("======================================================\n");

let createdCount = 0;

for (const target of targets) {
  if (!fs.existsSync(target.example)) {
    console.warn("⚠️  Template not found: " + target.example);
    continue;
  }

  if (fs.existsSync(target.dest)) {
    console.log("[OK] " + target.name + ": Local environment file exists.");
  } else {
    fs.copyFileSync(target.example, target.dest);
    console.log("[NEW] " + target.name + ": Initialized from template.");
    createdCount++;
  }
}

console.log("\n🔒 Security Notice: All .env and .env.local files are strictly gitignored.");
console.log("Production credentials are never committed and remain safe in deployment settings.\n");
