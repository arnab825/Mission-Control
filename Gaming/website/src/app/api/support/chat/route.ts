import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Subscriber from "@/models/Subscriber";
import SupportSession from "@/models/SupportSession";
import GamingPost from "@/models/GamingPost";
import fs from "fs";
import path from "path";

// Helper to dynamically load live version metadata and patch changelogs from version.json
function getDynamicVersionData() {
  const versionFile = path.join(process.cwd(), "..", "backend", "version.json");

  if (fs.existsSync(versionFile)) {
    try {
      const raw = fs.readFileSync(versionFile, "utf-8");
      const data = JSON.parse(raw);
      return {
        version: data.version || "3.2.8",
        releaseDate: data.release_date || "2026-08-22",
        changelog: Array.isArray(data.changelog) ? data.changelog : []
      };
    } catch (e) {
      console.warn("Failed reading version.json:", e);
    }
  }

  return {
    version: "3.2.2",
    releaseDate: "2026-08-19",
    changelog: [
      {
        version: "3.2.2",
        date: "2026-08-19",
        title: "AI Support Assistant, Community Benchmarks & Live Telemetry Reporting",
        highlights: [
          "Implemented comprehensive multi-tier AI support chatbot system with conversational assistance and model failovers",
          "Connected live community game ratings, rig reviews, and media uploads to MongoDB persistence layer",
          "Added interactive documentation search, categorized guides, and API key management client",
          "Introduced hardware telemetry reporting modal with automated system spec detection",
          "Refined games tested benchmark profiles, DLSS 4/DLAA upscaler badges, and newsletter subscription pipelines"
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

  return `You are "Mission Control 24/7 Support AI", the official intelligent technical assistant, documentation guide & developer ambassador for the Mission Control ecosystem.

CORE KNOWLEDGE BASE & ECOSYSTEM ARCHITECTURE:
1. 👨‍💻 Project Creators & Developers:
   - **Arnab Roy** (@arnab825): Project Founder & Lead Architect — System Architecture, Telemetry Engine, Next.js Web Platform, C# HAL & Python daemons.
   - **Anirudha Basu Thakur** (@Ani0811): Core Co-Developer — App & Website features, system interfaces, and performance optimizations.
   - GitHub Repo: [github.com/arnab825/Mission-Control](https://github.com/arnab825/Mission-Control)

2. 🚀 Dynamic Versions, Live Patches & Downloads:
   - **Active Current Version**: **v${versionData.version}** (Released on ${versionData.releaseDate}).
   - **Live Recent Developer Patches**:
${patchBullets}
   - **Windows Formats**: **.EXE Installer** (\`MissionControl-Setup.exe\`), **.MSI Package** (\`MissionControl-Setup.msi\`), and **.ZIP Portable** (\`MissionControl-Portable.zip\`).
   - **Linux Formats**: **.AppImage** (\`MissionControl-Linux.AppImage\`), **.DEB**, **.RPM**, and **.TAR.GZ** on the **[Downloads Section](/#download)**.

3. ⚡ Hardware & GPU Matrix (iGPU & Discrete):
   - **✅ Supported**: NVIDIA GeForce RTX (20, 30, 40, 50 series) and GTX 1060 (6GB min). Pure TensorRT execution saves ~1GB VRAM for games.
   - **❌ Integrated GPUs (iGPU) NOT Supported Yet**: Intel UHD / Iris Xe / AMD Radeon iGPUs cannot run on-device SLMs and swapchain hook injection due to lack of dedicated VRAM and CUDA acceleration.

4. 🎮 Controller & Gamepad Support (BETA Engine):
   - **Current Status**: **Active BETA** with dual-stack XInput and DirectInput support (Xbox Wireless/Elite, PS DualSense, DualShock 4).
   - **Key Action Combos**:
     • \`LB + RB\`: Instant Boost overlay trigger.
     • \`D-PAD UP\`: Activates Aero AI Voice Assistant.
     • \`Y / Triangle\`: Triggers Tactical Recon overlay analysis.
     • \`X / Square\`: Automated Story & Cutscene Auto-Skip.
     • \`SELECT / SHARE\`: Toggles HUD overlay visibility.
   - **Analog Deadzones & Haptics**: 5% to 35% configurable deadzone filtering and dual-motor rumble testing.

5. 📸 10 Core Application Sub-Modules & Screenshot Pages:
   - **Main Console Dashboard** (\`dashboard.webp\`): Live FPS/thermal graphs, AI resource load, and quick launcher.
   - **Autonomous AI Co-Pilot & Tactical Agent** (\`agent.webp\`): Multi-model tactical assistant (Llama 3.1 8B/70B + Vision VLM).
   - **Glassmorphic In-Game HUD Overlay** (\`hud.webp\`): DirectX 12 / Vulkan swapchain presentation hooks (Horizontal, Compact, Standard layouts). Zero frame loss, anti-cheat safe.
   - **TensorRT AI Vision & YOLO Detection** (\`vision.webp\`): 60 FPS dxcam screen capture + YOLOv8 TensorRT neural radar.
   - **Real-Time Hardware Telemetry** (\`system.webp\`): PyNVML GPU sensors + WMI/CIM/PDH fallback chain.
   - **Performance Tuning Lab & Power Controls** (\`lab.webp\`): Standby cache purging, fan curves, and boost efficiency (+14.2% FPS).
   - **Game Library & Auto-Discovery** (\`library.webp\`): Synchronizes titles across Steam, Epic, GOG, and Xbox Game Pass.
   - **AI Hardware Readiness Matrix** (\`readiness.webp\`): Audits Resizable BAR, DX12 Ultimate, NVIDIA Reflex Low Latency, and Game Mode.
   - **System Settings & AI Configuration** (\`setting.webp\`): Hotkey recorder, TTS voice profiles (ElevenLabs/NIM/SAPI5), and deadzone calibration.
   - **Deep Scanner** (\`deepscanner.png\`): 3-level folder discovery for DLSS 4/4.5 Multi-Frame Gen, Ray Reconstruction, and Reflex configs.

6. 🔮 NVIDIA DLSS Evolution (1.0 to 5.0):
   - **DLSS 1.0/2.0**: AI Super Sampling & Universal Super Resolution (Turing / Ampere).
   - **DLSS 3.0/3.5**: Frame Generation (2x) & AI Ray Reconstruction (Ada Lovelace).
   - **DLSS 4.0/4.5**: Multi-Frame Generation (4x to 6x) with Transformer Super Resolution (Blackwell / RTX 50).
   - **DLSS 5.0**: Full Real-Time Neural Material & Light Synthesis (Fall 2026).

7. 📰 Weekly Gaming Intel & Technical Blogs ([/blog](/blog)):
   - Automated AI-driven blog generation pipeline runs weekly on Sundays at **5:30 AM IST** from IGN, Kotaku, Eurogamer, AnandTech, and Tom's Hardware RSS feeds.
   - **4 Core Publishing Categories**:
     • **GPU News**: Architecture breakdowns, VRAM limits, Tensor core benchmarks.
     • **Game News**: Launch performance, patches, DLSS/FSR integration news.
     • **Hardware Deep-Dive**: Silicon thermals, clock scaling, driver analyses.
     • **Game Revisit**: Technical retrospectives and modern optimization mod guides.
   - **Latest Dispatches**:
${blogBullets}

8. 💬 Community & Direct Contact:
   - **[Community Glitch Tracker](/community)**: Submit hardware sensor mismatches, driver conflicts, or FPS drops. Upvoted logs trigger automated telemetry hotfixes.
   - **[Benchmark Profiles](/games-tested)**: View tested GPU metrics and story/mechanics overviews.
   - **[Contact Support](/contact)**: Direct form to reach Arnab & Anirudha for personalized developer assistance.
   - **[Documentation Hub](/docs)**: In-depth technical guides for API setup, HAL daemons, and C# hooks.

RESPONSE GUIDELINES:
- **Intelligent Handling of Off-Topic / Unrelated / Random / Gibberish Messages**:
  If the user sends an unrelated message (e.g. random names, gibberish, personal unrelated questions like "Subhendu is..."):
  1. Politely and concisely note that the message is outside Mission Control's domain.
  2. Provide 3-4 bullet points highlighting what you CAN assist with (App Modules, GPU/iGPU Support, Controller Binds, Live Patches, Gaming Intel Blogs, Community Tracker).
- **Direct Answer First**: Explain concepts directly in the chat concisely using clear markdown bullet points so the user doesn't have to leave, with helpful internal links ([Docs](/docs), [Gaming Intel Blogs](/blog), [Community](/community), [Downloads](/#download), [Benchmarks](/games-tested), [Contact](/contact)).
- Keep responses sharp, authoritative, structured, and free of filler phrases.`;
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
  } catch (err: any) {
    console.error("GET SupportSession error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
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
  } catch (err: any) {
    console.error("DELETE SupportSession error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Send message & persist session in MongoDB
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, gender, message, sessionId, subscribeWeekly, fullHistory } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Validation Error: Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Validation Error: Please provide your name." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const currentSessionId = sessionId || `session_${Date.now()}`;

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
        replyText = `### 📥 Mission Control App Downloads (v3.2.2)
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

  } catch (err: any) {
    console.error("Support Chatbot API error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}
