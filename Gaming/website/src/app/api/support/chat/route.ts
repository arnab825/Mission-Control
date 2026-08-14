import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Subscriber from "@/models/Subscriber";
import SupportSession from "@/models/SupportSession";

// System prompt for 24/7 Mission Control Support AI Assistant
const SUPPORT_SYSTEM_PROMPT = `You are "Mission Control 24/7 Support AI", the official website guide, developer ambassador & technical support expert for the Mission Control ecosystem.

Key Information & Knowledge Base:
- 👨‍💻 Developers & Project Creators: Mission Control is developed and engineered by **Arnab Roy** (@arnab825) as Project Founder & Lead Architect and **Anirudha Basu Thakur** (@Ani0811) as Core Co-Developer across Apps & Website.
- 👥 GitHub Contributors & Profiles:
  • **Arnab Roy** ([@arnab825](https://github.com/arnab825)): Project Founder & Lead Architect — System Architecture, Telemetry Engine, Next.js Web App, C# HAL & Python daemons.
  • **Anirudha Basu Thakur** ([@Ani0811](https://github.com/Ani0811)): Core Co-Developer — App & Website features, system interfaces & frontend optimization.
  • 🐙 GitHub Repository: [github.com/arnab825/Mission-Control](https://github.com/arnab825/Mission-Control)
- 📥 Desktop App Downloads & Formats:
  • **Windows Packages**: **.EXE Installer** (\`MissionControl-Setup.exe\`), **.MSI Package** (\`MissionControl-Setup.msi\`), and **.ZIP Portable** (\`MissionControl-Portable.zip\`).
  • **Linux Packages**: **AppImage** (\`MissionControl-Linux.AppImage\`), **.DEB Package** (\`MissionControl-Linux.deb\`), **.RPM Package** (\`MissionControl-Linux.rpm\`), and **.TAR.GZ Archive** (\`MissionControl-Linux.tar.gz\`).
- 📬 Support & Contact Hub (/contact): Direct contact form for user queries, technical doubts, feature feedback, and engineering support.
- 📚 Documentation Hub (/docs): Complete API reference, environment setup, NVIDIA NIM integration guides, and low-level system architecture docs.
- 📊 Benchmark Profiles (/benchmarks): Detailed game overview, story, gameplay loop, mechanics, and hardware performance metrics across RTX GPUs.
- 💬 Community Glitch Tracker (/community): Submit hardware sensor mismatches, overlay glitches, FPS drops, or driver conflicts. Upvoted logs trigger automated telemetry hotfixes.
- ⚡ System Architecture (/architecture): Low-level HAL daemons, quantized TensorRT compilers, and swapchain overlay presentation pipeline.

Instructions for Responding:
1. Always be polite, concise, helpful, and technical.
2. If asked about downloads, concisely explain Windows formats (**.EXE**, **.MSI**, **.ZIP portable**) and Linux formats (**AppImage**, **.DEB**, **.RPM**, **.TAR.GZ**), with internal link to **[Downloads](/#download)**.
3. If asked about doubts, help, feedback, or contacting the team, guide users directly to the **[Contact Us](/contact)** page or **[Community Glitch Tracker](/community)**.
4. If asked "who developed/made/built this app/website" or about contributors, list **Arnab Roy** (@arnab825) and **Anirudha Basu Thakur** (@Ani0811) along with the [GitHub Repo](https://github.com/arnab825/Mission-Control).
5. Provide structured, clean Markdown responses with bullet points or numbered lists. Include internal markdown links to guide users effectively.`;

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

    // Try Google Gemini API first if available
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                { role: "user", parts: [{ text: `${SUPPORT_SYSTEM_PROMPT}\n\nUser (${cleanName}): ${userPrompt}` }] }
              ]
            })
          }
        );
        if (geminiRes.ok) {
          const gData = await geminiRes.json();
          replyText = gData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        }
      } catch (gErr) {
        console.warn("Gemini support fallback notice:", gErr);
      }
    }

    // Fallback rule-based smart responder if AI API key is omitted or busy
    if (!replyText) {
      const q = userPrompt.toLowerCase().trim();

      // Check if user replied with a single number option (e.g. "1", "2", "3", "4", "option 1", "#3")
      const numMatch = q.match(/^(option\s*|#\s*)?([1-4])$/i);
      const selectedNum = numMatch ? numMatch[2] : null;

      // 1. Developer / Author / Creator / Option 3
      const devRegex = /(who|whos|who's)\s*(is|was|has)?\s*(the)?\s*(dveloped|devloped|developed|created|built|made|engineered|designed|author|creator|developer|owner|founder|contributor|contributors)/i;
      const devKeywords = ["who developed", "who devloped", "who dveloped", "who created", "who built", "who made", "developer of", "creator of", "built by", "developed by", "arnab", "arnab roy", "arnab825", "anirudha", "anirudha basu thakur", "ani0811", "contributors", "github"];

      if (selectedNum === "3" || devRegex.test(q) || devKeywords.some(k => q.includes(k))) {
        replyText = `### 👨‍💻 Project Developers & GitHub Contributors
**Mission Control** is developed by **Arnab Roy** and **Anirudha Basu Thakur** on GitHub.

**Core Contributors:**
- 👑 **Arnab Roy** ([@arnab825](https://github.com/arnab825)): Project Founder & Lead Architect — System Architecture, Telemetry Engine, Next.js Web Platform, C# HAL & Python daemons.
- ⚡ **Anirudha Basu Thakur** ([@Ani0811](https://github.com/Ani0811)): Core Co-Developer — App & Website features, system interfaces, and performance optimizations.

🐙 View repository & code on **[GitHub Repo (arnab825/Mission-Control)](https://github.com/arnab825/Mission-Control)**!`;

      // 2. Desktop App Download (Windows & Linux) / Option 1
      } else if (selectedNum === "1" || q.includes("download") || q.includes("exe") || q.includes("msi") || q.includes("zip") || q.includes("linux") || q.includes("appimage") || q.includes("deb") || q.includes("rpm") || q.includes("install") || (q.includes("app") && !q.includes("who"))) {
        replyText = `### 📥 Mission Control App Downloads
Download the latest releases for Windows and Linux on our **[Downloads](/#download)** section:

**🪟 Windows (64-bit):**
1. **⚙️ Executable (.EXE)**: Standard installer (\`MissionControl-Setup.exe\`) with auto-updates.
2. **📦 MSI Package (.MSI)**: Enterprise installer (\`MissionControl-Setup.msi\`) for domain & silent deployments.
3. **📁 Portable Archive (.ZIP)**: Standalone portable package (\`MissionControl-Portable.zip\`) — run instantly without installation.

**🐧 Linux (x86_64):**
1. **🚀 AppImage (.AppImage)**: Universal Linux standalone binary — run directly on Ubuntu, Debian, Fedora, Arch, etc.
2. **📦 DEB Package (.deb)**: Native installer for Ubuntu / Debian-based systems.
3. **📦 RPM Package (.rpm)**: Native package for Fedora / RHEL / openSUSE systems.
4. **📁 TAR.GZ Archive (.tar.gz)**: Standalone portable Linux archive.`;

      // 3. Contact Support & General Doubts / Option 2
      } else if (
        selectedNum === "2" ||
        q.includes("contact") ||
        q.includes("doubt") ||
        q.includes("doubts") ||
        q.includes("reach") ||
        q.includes("message") ||
        q.includes("email support") ||
        q.includes("ask")
      ) {
        replyText = `### 📬 Contact Support & Direct Assistance
Have questions, doubts, or feedback? Our core team is here to assist:

1. **Direct Contact Form**: Submit your questions directly to our engineers on the **[Contact Us](/contact)** page.
2. **Community Hub**: Browse upvoted telemetry logs and driver hotfixes on the **[Community Glitch Tracker](/community)**.
3. **Documentation**: Find API guides, NIM setups, and environment configs in our **[Docs Hub](/docs)**.`;

      // 4. Documentation & API Reference / Option 4
      } else if (
        selectedNum === "4" ||
        q.includes("doc") ||
        q.includes("api") ||
        q.includes("guide") ||
        q.includes("how to")
      ) {
        replyText = `### 📚 Support & Documentation Reference
1. **Docs Hub**: Visit our **[Documentation Hub](/docs)** for API references, NVIDIA NIM integration guides, and setup steps.
2. **System Benchmarks**: View live GPU metrics and game hardware breakdowns on our **[Benchmark Profiles](/benchmarks)** page.
3. **Architecture Overview**: Dive into our high-performance HAL and telemetry daemons on the **[Architecture](/architecture)** page.`;

      // 5. Technical Issues / Bugs / Glitches / Troubleshooting
      } else if (
        q.includes("issue") ||
        q.includes("bug") ||
        q.includes("glitch") ||
        q.includes("problem") ||
        q.includes("error") ||
        q.includes("crash") ||
        q.includes("not working") ||
        q.includes("trouble") ||
        q.includes("fix")
      ) {
        replyText = `### 🛠️ Technical Issue & Troubleshooting Guide
Sorry to hear you're experiencing an issue! Here is how we can solve it:

1. **Submit Telemetry Log**: Head to the **[Community Glitch Tracker](/community)** to view existing hardware patches or log your crash details.
2. **Contact Support Team**: Send a message directly to our core engineers on the **[Contact Support](/contact)** page.
3. **App Setup & Overlay Fix**: Ensure DirectX 12 graphics drivers are updated and run \`MissionControl-Setup.exe\` or \`MissionControl-Setup.msi\` as Administrator.`;

      // 6. Frequently Asked Questions (FAQ) & General Guidance
      } else if (
        q.includes("faq") ||
        q.includes("frequently asked") ||
        q.includes("question") ||
        q.includes("questions") ||
        q.includes("what is mission control") ||
        q.includes("how does it work")
      ) {
        replyText = `### ❓ Frequently Asked Questions (FAQ) & System Guidance
Here are common answers & guidelines for Mission Control:

- **Q: What is Mission Control?**
  *A: Mission Control is an open-source hardware monitoring, AI inference, and telemetry platform for modern PCs.*
- **Q: Which download format should I use?**
  *A: On Windows, use **.EXE** for standard setups, **.MSI** for enterprise domain installs, or **.ZIP** for portable use. On Linux, use **.AppImage** for universal plug-and-play, or native **.DEB** / **.RPM** packages on the **[Downloads](/#download)** section.*
- **Q: Who created Mission Control?**
  *A: Created by **Arnab Roy** (@arnab825) & **Anirudha Basu Thakur** (@Ani0811) on [GitHub](https://github.com/arnab825/Mission-Control).*
- **Q: Where can I submit doubts or questions?**
  *A: Submit direct questions to our team on the **[Contact Support](/contact)** page or report bugs on the **[Community Glitch Tracker](/community)**.*`;

      // 7. General Fallback
      } else {
        replyText = `Hello **${cleanName}**! I'm here 24/7 to answer your queries and assist you with Mission Control.

You can ask me about:
1. **📥 App Downloads (Windows: .EXE, .MSI, .ZIP | Linux: AppImage, .DEB, .RPM, .TAR.GZ)**
2. **📬 Contact Support & Guidance ([Contact Us](/contact))**
3. **👨‍💻 Developer & Team Credits**
4. **📚 FAQ & Documentation Reference**`;
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
