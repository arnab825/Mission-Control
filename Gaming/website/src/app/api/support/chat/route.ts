import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Subscriber from "@/models/Subscriber";
import SupportSession from "@/models/SupportSession";
import GamingPost from "@/models/GamingPost";
import fs from "fs";
import path from "path";
import { SupportChatSchema, validateRequestBody, handleApiError, checkAccountRateLimit } from "@/lib/api-validation";

// Helper to dynamically load live version metadata and patch changelogs from version.json
function getDynamicVersionData() {
  const localVersionFile = path.join(process.cwd(), "version.json");
  const parentVersionFile = path.join(process.cwd(), "..", "backend", "version.json");
  const versionFile = fs.existsSync(localVersionFile) ? localVersionFile : parentVersionFile;

  if (fs.existsSync(versionFile)) {
    try {
      const raw = fs.readFileSync(versionFile, "utf-8");
      const data = JSON.parse(raw);
      return {
        version: data.version || "3.6.1",
        releaseDate: data.release_date || "2026-09-08",
        changelog: Array.isArray(data.changelog) ? data.changelog : []
      };
    } catch (e) {
      console.warn("Failed reading version.json:", e);
    }
  }

  return {
    version: "3.6.1",
    releaseDate: "2026-09-08",
    changelog: [
      {
        version: "3.6.1",
        date: "2026-09-08",
        title: "Rockstar Games Launcher HUD Exclusion & Voice Agent DLSS Sanitization",
        highlights: [
          "Resolved Rockstar Games Launcher (Launcher.exe) falsely triggering the in-game HUD overlay and FPS readings",
          "Added Rockstar executables and window titles to process watcher, window detector, and pipeline exclusions",
          "Filtered out launcher entries and platforms from library scan caches and foreground heuristics",
          "Removed legacy mock optimize command regex handler that intercepted voice requests with hardcoded DLSS readings",
          "Expanded GameBrain telemetry exclusion keys to prevent internal DLSS tips and advisor diagnostics from leaking into prompt context",
          "Integrated AgentCommandProcessor into voice pipeline and enhanced speech sanitization in VoiceManager"
        ]
      }
    ]
  };
}

// Function to generate the dynamic 24/7 Support AI System Prompt
function buildSupportSystemPrompt(
  versionData: ReturnType<typeof getDynamicVersionData>,
  recentPosts: any[] = []
) {
  const latestChangelogs = versionData.changelog.slice(0, 4);
  const patchBullets = latestChangelogs.map((c: any) => 
    `• **v${c.version}** (${c.date}): *${c.title}*\n  ${(c.highlights || []).slice(0, 2).map((h: string) => `- ${h}`).join("\n  ")}`
  ).join("\n");

  const blogBullets = recentPosts.length > 0
    ? recentPosts.map((p: any) => `• [${p.title}](/blog/gaming/${p.slug}) — *${p.category}* (${new Date(p.publishedAt || p.createdAt).toLocaleDateString()})`).join("\n")
    : "• [GPU & Hardware Intel Articles](/blog/gaming)";

  return `You are "Mission Control 24/7 Support AI", the official intelligent technical assistant, architectural guide, policy advisor & developer ambassador for the Mission Control ecosystem.

You have deep, authoritative knowledge of the entire Mission Control platform across its Desktop App (Electron/React/Vite), Local Python/C++ AI Engine, Distributed Server Mesh, Next.js Web Platform, and Official Policies & Rules.

===================================================================
1. 👨‍💻 PROJECT CREATORS, MAINTAINERS & CONTRIBUTORS:
===================================================================
- **Arnab Roy** (@arnab825): Project Founder & Lead Architect — System Architecture, DirectX C++ present hooks, Telemetry Engine, Next.js 16 Web Platform, C# HAL & Python daemons.
- **Anirudha Basu Thakur** (@Ani0811): Core Co-Developer — App & Website features, system interfaces, and performance optimizations.
- GitHub Repo: [github.com/arnab825/Mission-Control](https://github.com/arnab825/Mission-Control)
- Contributor Guidelines: Anyone can contribute following [CONTRIBUTING.md](/docs). All .env files are strictly gitignored (Zero-Secrets Policy).

===================================================================
2. 🚀 VERSIONS, LIVE PATCHES & MULTI-PLATFORM DOWNLOADS:
===================================================================
- **Active Current Version**: **v${versionData.version}** (Released on ${versionData.releaseDate}).
- **Recent Production Patches**:
${patchBullets}
- **Windows Formats**:
  • **1-Line CLI**: \`winget install arnab825.MissionControl\`
  • **.EXE Setup**: \`MissionControl-Setup.exe\` (NSIS with autoUpdater)
  • **.MSI Enterprise**: \`MissionControl-Setup.msi\` (Silent domain deployments)
  • **.ZIP Portable**: Standalone zero-install archive
- **Linux Formats**:
  • **.AppImage**: Universal single-file executable for Ubuntu, Debian, Fedora, Arch
  • **Native Packages**: **.DEB**, **.RPM**, and **.TAR.GZ** on the **[Downloads Section](/#download)**.

===================================================================
3. ⚡ HARDWARE & GPU COMPATIBILITY MATRIX:
===================================================================
- **✅ Supported GPUs**: NVIDIA GeForce RTX (20, 30, 40, and 50 Series) & GTX 10-series (GTX 1060 6GB min).
- **Pure TensorRT Execution**: Compiles PyTorch models into TensorRT 10.x C++ engines, saving ~1 GB of VRAM strictly for games.
- **DirectX Zero-Copy Capture**: Captures game displays at up to 120 FPS with 0-1ms latency using DXGI Desktop Duplication (\`dxcam\`).
- **❌ Integrated GPUs (iGPU) NOT Supported**: Intel UHD, Intel Iris Xe, and AMD Radeon iGPUs lack dedicated CUDA tensor cores and swapchain memory bandwidth needed for on-device inference without freezing games.

===================================================================
4. 🌐 CLOUD SERVICES & DISTRIBUTED SERVER CLUSTER ARCHITECTURE:
===================================================================
- **Distributed Library Mesh (\`distributed_node\`)**:
  • Node daemons run with deterministic hardware IDs derived from MAC address + hostname.
  • Scans installations across Steam, Epic Games, GOG Galaxy, Xbox App, Battle.net, Riot Games, and Ubisoft Connect with byte-exact disk sizing.
  • Heartbeat & cloud sync features multi-tier failover: Primary Render -> Azure High Availability -> Secondary Render.
- **Web Platform & Server APIs**:
  • Next.js 16 App Router hosted with Vercel Serverless Functions and MongoDB Atlas.
  • Automated daily 5:30 AM IST cron blogs ingested across IGN, Kotaku, Eurogamer, Tom's Hardware, and AnandTech.
  • 3-tier LLM failover (Google Gemini Flash -> Hugging Face LLM -> NVIDIA NIM Cloud).
  • 4-tier image generation pipeline (Gemini Imagen 3 -> FLUX.1 -> Pollinations AI -> High-Res 3D Artwork) with persistent Vercel Blob CDN upload.

===================================================================
5. 🛡️ POLICIES, RULES & SECURITY STANDARDS:
===================================================================
- **Zero-Secrets Policy**: Maintainers and contributors NEVER commit or share .env files. Safe \`.env.example\` templates and \`npm run setup\` are used. Production secrets live strictly in deployment environments (Vercel, Render, Azure).
- **Anti-Cheat Safety & Overlay Rule**:
  • Mission Control uses transparent DXGI Desktop Duplication for screen telemetry and transparent glassmorphic overlays.
  • Unlike archaic tools (MSI Afterburner / RTSS), it does NOT inject unsafe code into third-party game rendering pipelines, minimizing anti-cheat flags.
  • *Competitive Multiplayer Rule*: Autonomous macros and simulated inputs in competitive multiplayer games (Valorant, CS2, Apex) are used strictly at user discretion.
- **Code of Conduct (Contributor Covenant 2.1)**: Respect, zero harassment, constructive feedback, and privacy protection.
- **Vulnerability Reporting**: Report security findings privately via GitHub Security Advisories or to **support@missioncontrol.app**. Never open public exploit issues.

===================================================================
6. 🔮 CURRENT CORE FEATURES & EXCITING FUTURE ROADMAP:
===================================================================
**Current Core Capabilities:**
1. **Glassmorphic In-Game HUD Overlay**: Real-time FPS, 1% lows, thermals, clock speeds, and wattage with customizable font scaling.
2. **Autonomous AI Co-Pilot & Tactical Agent**: Multi-model reasoning engine (NVIDIA NIM, Llama 3.1 8B/70B, Llama 3.2 Vision VLM) for real-time coaching.
3. **Pure TensorRT YOLOv8 Vision**: Sub-15ms real-time tactical radar and object detection.
4. **Multi-Source Web Intelligence**: Live RAG searches across Wikipedia, SteamSpy, DuckDuckGo, and RAWG.io.
5. **Controller & Gamepad Support (BETA)**: Native combos (LB+RB boost, D-PAD UP voice agent, Y/Triangle tactical recon).

**Exciting Future Roadmap & In-Development Features:**
- **Full DLSS 4 / 4.5 & DLSS 5.0 Neural Material Engine Support**: Deep Scanner 3-level directory traversal and preset switching.
- **Autonomous Game Clip Highlights & Voice VOD Analysis**: Local AI clip tagging and match review generation.
- **Dynamic Cross-Device Mobile HUD Companion**: View your PC's real-time telemetry and tactical advice on iOS/Android via local WebSocket bridge.
- **Expanded AMD & Intel Discrete GPU Support**: Planned ROCm / DirectML acceleration paths.
- **Team Voice Chat Co-Pilot**: Multi-player shared tactical voice channel with automated callouts.

===================================================================
7. 💬 USER DOUBTS, COMMUNITY & CONTACT ESCALATION:
===================================================================
- **If the user has ANY doubt, question, bug report, or needs direct assistance:**
  • Always direct them to our **[Community Glitch Tracker](/community)** to view driver fixes or submit hardware logs.
  • Direct them to our **[Contact Support](/contact)** form to reach Arnab Roy and Anirudha Basu Thakur directly.
  • Direct them to the **[Documentation Hub](/docs)** for in-depth technical guides, APIs, and architecture manuals.
  • Direct them to the **[Gaming Intel Blog](/blog)** for technical hardware retrospectives and benchmark guides.

===================================================================
RESPONSE GUIDELINES:
===================================================================
- **Direct, Structured & Authoritative**: Answer questions immediately using clear markdown headers, bold text, and bullet points.
- **Include Helpful Links**: Seamlessly provide relevant links to [Docs](/docs), [Community](/community), [Contact](/contact), [Downloads](/#download), [Gaming Intel Blogs](/blog), or [Benchmarks](/games-tested).
- **If Off-Topic / Unrelated**: Politely guide the user back to Mission Control's features, server architecture, policies, or future roadmap.`;
}

// GET: Fetch all saved chat sessions for user email
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    await connectDB();
    const sessions = await SupportSession.find({ userEmail: email.trim().toLowerCase() })
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ success: true, sessions });
  } catch (err: unknown) {
    return handleApiError("GET /api/support/chat", err, 500, "Failed to fetch support sessions.");
  }
}

// DELETE: Clear a specific chat session or all history for a user
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const email = searchParams.get("email");

    await connectDB();

    if (sessionId) {
      await SupportSession.deleteOne({ sessionId });
      return NextResponse.json({ success: true, message: "Session deleted" });
    } else if (email) {
      await SupportSession.deleteMany({ userEmail: email.trim().toLowerCase() });
      return NextResponse.json({ success: true, message: "All sessions deleted" });
    }

    return NextResponse.json({ error: "sessionId or email query parameter required" }, { status: 400 });
  } catch (err: unknown) {
    return handleApiError("DELETE /api/support/chat", err, 500, "Failed to delete support session.");
  }
}

// POST: Send message & persist session in MongoDB
export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const validation = validateRequestBody(SupportChatSchema, rawBody);
    if (!validation.success) {
      return validation.response;
    }

    const { name, email, gender, message, sessionId, subscribeWeekly } = validation.data;
    const fullHistory = Array.isArray(rawBody.fullHistory) ? rawBody.fullHistory : [];

    const cleanEmail = email.toLowerCase();
    const cleanName = name;
    const currentSessionId = sessionId || `session_${Date.now()}`;

    // Enforce per-account exponential backoff rate limiting
    const accountCheck = checkAccountRateLimit(`chat:${cleanEmail}`);
    if (!accountCheck.allowed && accountCheck.response) {
      return accountCheck.response;
    }

    // 1. Subscribe user to weekly conversation & gaming intel updates if opted-in or new
    if (subscribeWeekly !== false) {
      try {
        await connectDB();
        await Subscriber.findOneAndUpdate(
          { email: cleanEmail },
          {
            email: cleanEmail,
            name: cleanName,
            status: "active",
            source: "support_chatbot_weekly",
            subscribedAt: new Date(),
            metadata: { gender: gender || "unspecified" }
          },
          { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
        );
      } catch (dbErr: any) {
        console.warn("Subscriber save notice:", dbErr.message);
      }
    }

    // If message is empty (onboarding register trigger), initialize session in MongoDB
    if (!message || !message.trim()) {
      const welcomeReply = `Welcome **${cleanName}**! I'm your 24/7 Mission Control Support Assistant.

> ⚠️ **BETA NOTICE & GUIDELINES**: This AI Assistant is currently in **Active BETA**. It may occasionally generate minor mistakes or incomplete details. If you notice any inaccuracies or require direct developer assistance, please submit your feedback via our **[Contact Us](/contact)** form or report bugs on our **[Community Glitch Tracker](/community)**!

How can I assist you with our **Documentation**, **System Architecture**, **App Download**, **Contributors**, or hardware performance benchmarks today?`;
      const initialMsgs = [
        {
          id: "welcome-1",
          sender: "assistant",
          text: welcomeReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];

      try {
        await connectDB();
        await SupportSession.findOneAndUpdate(
          { sessionId: currentSessionId },
          {
            sessionId: currentSessionId,
            userEmail: cleanEmail,
            userName: cleanName,
            gender: gender || "male",
            title: "New Support Session",
            messages: initialMsgs
          },
          { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
        );
      } catch (sErr: any) {
        console.warn("SupportSession init notice:", sErr.message);
      }

      return NextResponse.json({
        success: true,
        sessionId: currentSessionId,
        reply: welcomeReply,
        messages: initialMsgs,
        enrolledWeekly: subscribeWeekly !== false
      });
    }

    // 2. Call LLM for 24/7 support query
    const userPrompt = message.trim();
    let replyText = "";

    // Load live version metadata and patch changelogs dynamically
    const versionData = getDynamicVersionData();

    // Fetch recent live gaming intel blogs from MongoDB if connected
    let recentPosts: any[] = [];
    try {
      await connectDB();
      recentPosts = await GamingPost.find({})
        .sort({ publishedAt: -1 })
        .limit(4)
        .select("title slug category publishedAt createdAt")
        .lean();
    } catch (postErr) {
      console.warn("Recent posts fetch notice:", postErr);
    }

    const dynamicSystemPrompt = buildSupportSystemPrompt(versionData, recentPosts);

    // Build multi-turn context for Gemini if history exists
    const recentHistory = Array.isArray(fullHistory)
      ? fullHistory.slice(-4).map((m: any) => ({
          role: m.sender === "user" ? "user" : "model",
          parts: [{ text: m.text }]
        }))
      : [];

    // Try Google Gemini API first if available
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const contents = [
          { role: "user", parts: [{ text: `${dynamicSystemPrompt}\n\nYou are chatting with operator: ${cleanName}. Provide concise, authoritative technical assistance.` }] },
          { role: "model", parts: [{ text: `Understood. I am Mission Control 24/7 Support AI running with active v${versionData.version} intelligence, ready to assist ${cleanName} with concise, technical, and accurate guidance.` }] },
          ...recentHistory,
          { role: "user", parts: [{ text: userPrompt }] }
        ];

        const geminiModels = [process.env.GEMINI_MODEL, "gemini-3.8-flash", "gemini-3.7-flash", "gemini-2.0-flash"].filter(Boolean) as string[];
        for (const modelId of geminiModels) {
          try {
            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${geminiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents })
              }
            );
            if (geminiRes.ok) {
              const gData = await geminiRes.json();
              replyText = gData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (replyText) break;
            }
          } catch {
            // try next model
          }
        }
      } catch (gErr) {
        console.warn("Gemini support fallback notice:", gErr);
      }
    }

    // Fallback rule-based smart responder if AI API key is omitted or busy
    if (!replyText) {
      const q = userPrompt.toLowerCase().trim();

      // Check single number choices
      const numMatch = q.match(/^(option\s*|#\s*)?([1-6])$/i);
      const selectedNum = numMatch ? numMatch[2] : null;

      // 1. Developer / Author / Creator
      const devRegex = /(who|whos|who's)\s*(is|was|has)?\s*(the)?\s*(dveloped|devloped|developed|created|built|made|engineered|designed|author|creator|developer|owner|founder|contributor|contributors)/i;
      const devKeywords = ["who developed", "who devloped", "who dveloped", "who created", "who built", "who made", "developer of", "creator of", "built by", "developed by", "arnab", "arnab roy", "arnab825", "anirudha", "anirudha basu thakur", "ani0811", "contributors", "github"];

      if (selectedNum === "3" || devRegex.test(q) || devKeywords.some(k => q.includes(k))) {
        replyText = `### 👨‍💻 Project Developers & GitHub Contributors
**Mission Control** is architected and maintained by **Arnab Roy** and **Anirudha Basu Thakur**:

- 👑 **Arnab Roy** ([@arnab825](https://github.com/arnab825)): Project Founder & Lead Architect — System Architecture, Telemetry Engine, Next.js Web Platform, C# HAL & Python daemons.
- ⚡ **Anirudha Basu Thakur** ([@Ani0811](https://github.com/Ani0811)): Core Co-Developer — App & Website features, system interfaces, and performance optimizations.

🐙 Repository: **[github.com/arnab825/Mission-Control](https://github.com/arnab825/Mission-Control)**`;

      // 2. Hardware / GPU / iGPU Compatibility
      } else if (
        q.includes("igpu") ||
        q.includes("integrated") ||
        q.includes("intel hd") ||
        q.includes("intel uhd") ||
        q.includes("iris") ||
        q.includes("gpu") ||
        q.includes("graphics card") ||
        q.includes("hardware requirement") ||
        q.includes("specs") ||
        q.includes("nvidia") ||
        q.includes("amd")
      ) {
        replyText = `### ⚡ Hardware & GPU Compatibility Matrix

- **✅ Supported Discrete GPUs**:
  - **NVIDIA GTX 1060 (6GB VRAM)** minimum.
  - **NVIDIA RTX 2060 / 30 / 40 / 50 Series** recommended for TensorRT sub-15ms on-device inference.
- **❌ Integrated GPUs (iGPU) NOT Supported Yet**:
  - Intel UHD, Intel Iris Xe, and AMD Radeon Vega/RDNA iGPUs are **not supported at this time**. Local AI SLM models and swapchain hook injection strictly require dedicated VRAM and CUDA acceleration.
- **📊 Benchmarks & Tested Titles**:
  - Check tested FPS performance across GPU rigs on our **[Games Tested Benchmarks](/games-tested)** page.`;

      // 3. Controller Support Status (Beta)
      } else if (
        q.includes("controller") ||
        q.includes("gamepad") ||
        q.includes("joystick") ||
        q.includes("xbox") ||
        q.includes("dualsense") ||
        q.includes("ps5") ||
        q.includes("ps4")
      ) {
        replyText = `### 🎮 Controller Support Status (Active BETA)

- **Current Status**: Controller support is currently in **Active BETA**.
- **Supported Gamepads**: Xbox Wireless/USB Controllers and PlayStation DualSense/DualShock 4.
- **Current Capabilities**: In-game HUD navigation and quick menu toggle.
- **Key Action Combos**:
  - \`LB + RB\`: Instant Boost overlay
  - \`D-PAD UP\`: Voice assistant trigger
  - \`Y / Triangle\`: Tactical Recon overlay
  - \`X / Square\`: Story Auto-Skip
  - \`SELECT / SHARE\`: HUD Visibility toggle
- Have suggestions or encountered gamepad glitches? Let us know on the **[Community Glitch Tracker](/community)**!`;

      // 4. Dynamic Versions & Live Developer Patches
      } else if (
        q.includes("version") ||
        q.includes("patch") ||
        q.includes("changelog") ||
        q.includes("release") ||
        q.includes("what is new") ||
        q.includes("whats new") ||
        q.includes("update") ||
        q.includes("v3") ||
        q.includes("v2")
      ) {
        const topPatches = versionData.changelog.slice(0, 3);
        const patchList = topPatches.map((p: any) => 
          `#### 🚀 v${p.version} (${p.date}) — ${p.title}\n${(p.highlights || []).slice(0, 3).map((h: string) => `• ${h}`).join("\n")}`
        ).join("\n\n");

        replyText = `### 🚀 Mission Control Dynamic Versions & Live Patches

- **🌟 Current Active Release**: **v${versionData.version}** (Released on ${versionData.releaseDate})
- **📦 Total Recorded Builds**: ${versionData.changelog.length} releases with automated rollback protection.

${patchList}

📥 Download the latest build on our **[Downloads Section](/#download)** or explore full release notes in the **[Docs Hub](/docs)**!`;

      // 5. Gaming Intel & Technical Blogs
      } else if (
        q.includes("blog") ||
        q.includes("article") ||
        q.includes("news") ||
        q.includes("gaming intel") ||
        q.includes("gpu news") ||
        q.includes("deep dive") ||
        q.includes("revisit")
      ) {
        const blogList = recentPosts.length > 0
          ? recentPosts.map((p: any) => `• **[${p.title}](/blog/gaming/${p.slug})**\n  *Category: ${p.category}* • Published: ${new Date(p.publishedAt || p.createdAt).toLocaleDateString()}`).join("\n\n")
          : "• **[Explore Weekly Gaming Intel Articles](/blog)**";

        replyText = `### 📰 Weekly Gaming Intel & Technical Dispatches

Mission Control automatically posts technical gaming insights across **4 weekly categories**:
- **⚡ GPU News**: Next-gen GPU architectures, VRAM optimizations, and driver benchmarks.
- **🎮 Game News**: Launch performance, DLSS/FSR integration notes, and game updates.
- **🔬 Hardware Deep-Dive**: Silicon architecture, thermals, and overclocking analysis.
- **🕹️ Game Revisit**: Technical retrospectives and modern optimization mod guides.

**Latest Published Dispatches:**
${blogList}

📖 Browse all weekly articles on the **[Gaming Intel Blog](/blog)**!`;

      // 6. App Downloads / Option 1
      } else if (
        selectedNum === "1" ||
        q.includes("download") ||
        q.includes("exe") ||
        q.includes("msi") ||
        q.includes("zip") ||
        q.includes("appimage") ||
        q.includes("deb") ||
        q.includes("rpm") ||
        q.includes("install")
      ) {
        replyText = `### 📥 Mission Control App Downloads (v3.6.1)
Download the latest binaries on our **[Downloads](/#download)** page:

**🪟 Windows Packages**:
- **⚙️ .EXE Installer**: Auto-updating setup (\`MissionControl-Setup.exe\`).
- **📦 .MSI Package**: Enterprise domain/silent install (\`MissionControl-Setup.msi\`).
- **📁 .ZIP Portable**: Standalone zero-installation package (\`MissionControl-Portable.zip\`).

**🐧 Linux Packages**:
- **🚀 .AppImage**: Universal standalone binary for Ubuntu, Debian, Fedora, Arch.
- **📦 Native Packages**: **.DEB**, **.RPM**, and **.TAR.GZ** archives.`;

      // 7. Features, HUD Overlay, YOLO Vision, AI Personalities & Docs / Option 4
      } else if (
        selectedNum === "4" ||
        q.includes("doc") ||
        q.includes("feature") ||
        q.includes("overlay") ||
        q.includes("hud") ||
        q.includes("yolo") ||
        q.includes("vision") ||
        q.includes("personality") ||
        q.includes("personalities") ||
        q.includes("anticheat") ||
        q.includes("anti-cheat") ||
        q.includes("api") ||
        q.includes("guide") ||
        q.includes("how to")
      ) {
        replyText = `### 📚 Feature Overview & Documentation

Here is how Mission Control works directly on your rig:
- **🖥️ In-Game HUD Overlay**: Transparent DirectX 12 & Vulkan Present swapchain hooks. Zero frame drop, read-only telemetry, and anti-cheat safe.
- **🤖 5 AI Personalities**: Tactical, Immersive, Friendly, Sarcastic, and Aggressive — executed locally on your GPU Tensor cores.
- **👁️ Real-time YOLO Vision**: Local computer vision model for on-screen tactical radar and object detection.
- **🔍 Deep Game Scanner**: Scans game folders up to 3 subdirectories deep to auto-configure DLSS 4 frame gen and Reflex low latency.

📖 Read comprehensive setup guides and API architecture on the **[Documentation Hub](/docs)**.`;

      // 8. Technical Issues / Bugs / Glitches / Community Support
      } else if (
        q.includes("issue") ||
        q.includes("bug") ||
        q.includes("glitch") ||
        q.includes("problem") ||
        q.includes("error") ||
        q.includes("crash") ||
        q.includes("not working") ||
        q.includes("trouble") ||
        q.includes("fix") ||
        q.includes("community")
      ) {
        replyText = `### 🛠️ Problem Resolution & Community Glitch Tracker

Facing a technical issue or crash? Here is how to resolve it:
1. **Community Glitch Tracker**: Check community-upvoted driver patches or log your crash dump on the **[Community Glitch Tracker](/community)**.
2. **Direct Developer Support**: Message Arnab and Anirudha directly using our **[Contact Support](/contact)** form.
3. **GPU Driver Check**: Ensure latest NVIDIA Game Ready drivers are installed and run the application as Administrator.`;

      // 9. Contact Support / Option 2
      } else if (
        selectedNum === "2" ||
        q.includes("contact") ||
        q.includes("doubt") ||
        q.includes("reach") ||
        q.includes("message") ||
        q.includes("email") ||
        q.includes("ask")
      ) {
        replyText = `### 📬 Contact Support & Direct Assistance
Have questions, doubts, or custom setup inquiries?
- **Contact Form**: Message the engineering team directly at **[Contact Support](/contact)**.
- **Community Glitch Tracker**: View driver fixes and user logs at **[Community](/community)**.
- **Docs Hub**: Explore APIs and architecture at **[Documentation](/docs)**.`;

      // 10. Intelligent Handling for Off-Topic / Unrelated / Random / Gibberish Messages
      } else {
        replyText = `Hello **${cleanName}**! I specialize in **Mission Control** technical support, documentation, hardware compatibility, app downloads, and gaming intel blogs.

Your message doesn't appear related to Mission Control. Here are the core topics I can assist you with:

1. **⚡ GPU & Hardware Compatibility** (Discrete NVIDIA supported; iGPUs not supported yet)
2. **🎮 Controller Support Status** (Active BETA for Xbox & DualSense)
3. **🚀 App Versions & Live Patches** (Active **v${versionData.version}** with changelogs)
4. **📰 Weekly Gaming Intel & Technical Blogs** ([Gaming Blogs](/blog/gaming))
5. **📚 Feature Docs & In-Game Overlay** ([Documentation](/docs))
6. **🛠️ Bug Reporting & Community** ([Community Glitch Tracker](/community) • [Contact Support](/contact))`;
      }
    }

    // Prepare updated message list safely without duplication
    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgObj = { id: `u_${Date.now()}`, sender: "user" as const, text: userPrompt, timestamp: timestampStr };
    const assistantMsgObj = { id: `a_${Date.now() + 1}`, sender: "assistant" as const, text: replyText, timestamp: timestampStr };

    let updatedMessages = Array.isArray(fullHistory) && fullHistory.length > 0 ? [...fullHistory] : [];
    
    // Check if the last message in fullHistory is already the user's current message
    const lastMsg = updatedMessages[updatedMessages.length - 1];
    const userMsgAlreadyPresent = lastMsg && lastMsg.sender === "user" && lastMsg.text === userPrompt;

    if (!userMsgAlreadyPresent) {
      updatedMessages.push(userMsgObj);
    }
    updatedMessages.push(assistantMsgObj);

    // Auto session title based on query
    const sessionTitle = userPrompt.length > 25 ? `${userPrompt.substring(0, 25)}...` : userPrompt;

    // 3. Persist session in MongoDB
    try {
      await connectDB();
      await SupportSession.findOneAndUpdate(
        { sessionId: currentSessionId },
        {
          sessionId: currentSessionId,
          userEmail: cleanEmail,
          userName: cleanName,
          gender: gender || "male",
          title: sessionTitle,
          messages: updatedMessages
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
    } catch (dbErr: any) {
      console.warn("SupportSession save notice:", dbErr.message);
    }

    return NextResponse.json({
      success: true,
      sessionId: currentSessionId,
      reply: replyText,
      messages: updatedMessages,
      enrolledWeekly: subscribeWeekly !== false
    });

  } catch (err: unknown) {
    return handleApiError("POST /api/support/chat", err, 500, "Support AI service encountered an error. Please try again later.");
  }
}
