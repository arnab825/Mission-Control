import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Subscriber from "@/models/Subscriber";
import SupportSession from "@/models/SupportSession";

// System prompt for 24/7 Mission Control Support AI Assistant
const SUPPORT_SYSTEM_PROMPT = `You are "Mission Control 24/7 Support AI", the official website guide & technical expert for Mission Control website & ecosystem.
Your tone is technical, friendly, authoritative, and helpful. You assist visitors with navigating the website, accessing documentation, joining the community glitch tracker, contacting the support team, inspecting system architecture, and downloading the Mission Control desktop app.

Key Website Modules & Knowledge Base:
- 📚 Documentation Hub (/docs): Complete API reference, environment setup, NVIDIA NIM integration guides, and system architecture docs.
- 💬 Community Glitch Tracker (/community): Submit hardware sensor mismatches, overlay glitches, or system driver conflicts. Upvoted logs trigger automated telemetry hotfixes.
- 📬 Contact Support Team (/contact): Direct contact form to reach the core Mission Control development and telemetry labs team.
- ⚡ System Architecture (/architecture): Low-level HAL daemons, quantized TensorRT compilers, and swapchain overlay presentation pipeline.
- 📥 Desktop App Download (/download): Download the Windows 10/11 stealth overlay executable and telemetry monitoring daemon.

Format your answer cleanly with bullet points where appropriate. Keep answers focused, precise, and beginner-friendly!`;

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
      const welcomeReply = `Welcome **${cleanName}**! I'm your 24/7 Mission Control Support Assistant. How can I assist you with our **Documentation**, **Community Glitch Tracker**, **System Architecture**, or **App Download** today?`;
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
      const q = userPrompt.toLowerCase();
      if (q.includes("doc") || q.includes("api") || q.includes("guide") || q.includes("help")) {
        replyText = `### 📚 Documentation & Technical Reference
1. **API Reference**: Check out our comprehensive **[Docs Hub](/docs)** for API keys, NVIDIA NIM setup, and environment config.
2. **Architecture**: Inspect our low-level telemetry HAL and swapchain overlay pipeline on the **[Architecture](/architecture)** page.
3. **Troubleshooting**: Search doc articles directly using the global search bar at the top of the site.`;
      } else if (q.includes("community") || q.includes("glitch") || q.includes("tracker") || q.includes("report")) {
        replyText = `### 💬 Community Glitch Tracker
1. **Telemetry Reports**: Visit the **[Community Glitch Tracker](/community)** to view upvoted hardware logs and driver conflict patches.
2. **Submit Issues**: Click **+ Log Telemetry Glitch** on the Community page to submit your rig specs and issue details.
3. **Hotfix Pipeline**: Top-voted logs trigger automated telemetry hotfixes in active build pipelines.`;
      } else if (q.includes("contact") || q.includes("support") || q.includes("team") || q.includes("email")) {
        replyText = `### 📬 Contact Support Team
1. **Direct Form**: Reach our core engineering team directly via the **[Contact Us](/contact)** page.
2. **Weekly Intel**: Since you're opted in, you'll receive weekly conversation digests and system telemetry updates directly in your inbox.`;
      } else if (q.includes("download") || q.includes("app") || q.includes("exe") || q.includes("install")) {
        replyText = `### 📥 Mission Control App Download
1. **Latest Build**: Download \`MissionControl-Setup.exe\` directly from the **[Downloads](/download)** page.
2. **OS Support**: Built for 64-bit Windows 10 & Windows 11 rigs with DirectX 12 graphics cards.`;
      } else {
        replyText = `Hello **${cleanName}**! I'm here 24/7 to guide you through the Mission Control website.

Feel free to ask about:
1. **📚 Documentation & API Reference (/docs)**
2. **💬 Community Glitch Tracker (/community)**
3. **⚡ System Architecture (/architecture)**
4. **📬 Contact Support Team (/contact)**
5. **📥 Desktop App Download (/download)**`;
      }
    }

    // Prepare updated message list
    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgObj = { id: Date.now().toString(), sender: "user" as const, text: userPrompt, timestamp: timestampStr };
    const assistantMsgObj = { id: (Date.now() + 1).toString(), sender: "assistant" as const, text: replyText, timestamp: timestampStr };

    let updatedMessages = fullHistory || [];
    if (!updatedMessages.some((m: any) => m.id === userMsgObj.id)) {
      updatedMessages = [...updatedMessages, userMsgObj, assistantMsgObj];
    }

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
