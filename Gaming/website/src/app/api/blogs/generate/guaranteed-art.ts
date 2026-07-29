import "./loadenv";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import fs from "fs";
import path from "path";

function generateHighTechSVG(title: string, category: string, slug: string): string {
  const isHardware = category === "GPU News" || category === "Hardware Deep-Dive";
  
  // Custom color themes
  const primaryColor = isHardware ? "#76b900" : "#fbbf24";  // Neon Green vs Amber
  const secondaryColor = isHardware ? "#a855f7" : "#ec4899"; // Purple vs Pink
  const accentColor = isHardware ? "#38bdf8" : "#10b981";    // Cyan vs Emerald
  const bgGradStart = isHardware ? "#090d14" : "#120914";
  const bgGradEnd = isHardware ? "#040609" : "#080409";

  // Sanitize title for SVG text rendering
  const safeTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 576" width="1024" height="576">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgGradStart}" />
      <stop offset="100%" stop-color="${bgGradEnd}" />
    </linearGradient>

    <linearGradient id="coreGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.8" />
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0.2" />
    </linearGradient>

    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1024" height="576" fill="url(#bgGrad)" />

  <!-- Cyber Grid Lines -->
  <g opacity="0.15" stroke="${primaryColor}" stroke-width="1">
    ${Array.from({ length: 24 }).map((_, i) => `<line x1="0" y1="${i * 24}" x2="1024" y2="${i * 24}" />`).join("")}
    ${Array.from({ length: 42 }).map((_, i) => `<line x1="${i * 24}" y1="0" x2="${i * 24}" y2="576" />`).join("")}
  </g>

  <!-- Abstract Tech Circuits & Nodes -->
  <g opacity="0.4" stroke="${accentColor}" stroke-width="2" fill="none">
    <path d="M 100 100 L 250 100 L 320 170 L 500 170" />
    <path d="M 924 476 L 774 476 L 704 406 L 524 406" />
    <path d="M 800 120 L 700 120 L 640 180 L 400 180" />
    <circle cx="320" cy="170" r="6" fill="${accentColor}" />
    <circle cx="704" cy="406" r="6" fill="${accentColor}" />
    <circle cx="640" cy="180" r="6" fill="${accentColor}" />
  </g>

  <!-- Glowing Central Core Geometry -->
  <g transform="translate(512, 288)" filter="url(#glow)">
    ${isHardware ? `
      <!-- Hardware Chip Matrix -->
      <rect x="-140" y="-140" width="280" height="280" rx="20" fill="#0b0d13" stroke="${primaryColor}" stroke-width="4" opacity="0.9" />
      <rect x="-100" y="-100" width="200" height="200" rx="12" fill="url(#coreGlow)" stroke="${secondaryColor}" stroke-width="2" />
      <circle cx="0" cy="0" r="45" fill="none" stroke="${primaryColor}" stroke-width="4" />
      <path d="M -30 0 L 30 0 M 0 -30 L 0 30" stroke="${primaryColor}" stroke-width="3" />
    ` : `
      <!-- Gaming Emblem Geometry -->
      <polygon points="0,-130 115,-65 115,65 0,130 -115,65 -115,-65" fill="#0b0d13" stroke="${primaryColor}" stroke-width="4" opacity="0.9" />
      <polygon points="0,-90 80,-45 80,45 0,90 -80,45 -80,-45" fill="url(#coreGlow)" stroke="${secondaryColor}" stroke-width="2" />
      <circle cx="-35" cy="0" r="18" fill="none" stroke="${primaryColor}" stroke-width="3" />
      <circle cx="35" cy="-15" r="10" fill="${accentColor}" />
      <circle cx="35" cy="15" r="10" fill="${primaryColor}" />
    `}
  </g>

  <!-- Bottom Gradient Overlay for Text Readability -->
  <rect x="0" y="360" width="1024" height="216" fill="url(#bgGrad)" opacity="0.85" />

  <!-- Badge Tag -->
  <rect x="48" y="440" width="140" height="28" rx="6" fill="${primaryColor}" opacity="0.2" stroke="${primaryColor}" stroke-width="1.5" />
  <text x="58" y="459" font-family="monospace" font-size="12" font-weight="bold" fill="${primaryColor}" letter-spacing="2">${category.toUpperCase()}</text>

  <!-- Title Text -->
  <text x="48" y="505" font-family="sans-serif" font-size="22" font-weight="900" fill="#ffffff" letter-spacing="-0.5">${safeTitle.slice(0, 55)}${safeTitle.length > 55 ? "..." : ""}</text>
</svg>`;

  return svgContent;
}

async function run() {
  await connectDB();

  const posts = await GamingPost.find({
    $or: [
      { coverImage: "/images/gpu-placeholder.png" },
      { coverImage: "/images/game-placeholder.png" },
      { coverImage: { $exists: false } },
      { coverImage: null },
      { coverImage: "" }
    ]
  });

  console.log(`[GuaranteedArt] Found ${posts.length} posts needing guaranteed custom cover images.`);

  const publicBlogDir = path.join(process.cwd(), "public/images/blog");
  if (!fs.existsSync(publicBlogDir)) {
    fs.mkdirSync(publicBlogDir, { recursive: true });
  }

  for (const post of posts) {
    const svgCode = generateHighTechSVG(post.title, post.category, post.slug);
    const svgFileName = `${post.slug}.svg`;
    const svgFilePath = path.join(publicBlogDir, svgFileName);

    fs.writeFileSync(svgFilePath, svgCode, "utf8");
    const coverPath = `/images/blog/${svgFileName}`;

    post.coverImage = coverPath;
    await post.save();

    console.log(`[GuaranteedArt] Generated custom high-tech SVG cover for: '${post.title}' -> '${coverPath}'`);
  }

  console.log("\n[GuaranteedArt] All fallback posts updated with unique custom high-tech cover art!");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
