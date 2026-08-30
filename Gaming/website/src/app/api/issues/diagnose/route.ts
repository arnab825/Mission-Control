import { NextResponse } from "next/server";

interface DiagnosePayload {
  rawError?: string;
  game?: string;
  specs?: {
    os?: string;
    osVersion?: string;
    cpu?: string;
    gpu?: string;
    gpuDriver?: string;
    ramGB?: number;
    appVersion?: string;
  };
  metrics?: {
    fps?: number;
    vramUsed?: number;
    cpuPct?: number;
    gpuTemp?: number;
  };
}

export async function POST(request: Request) {
  try {
    const body: DiagnosePayload = await request.json();
    const rawError = (body.rawError || "").trim();
    const targetGame = (body.game || "General System").trim();
    const specs = body.specs || {};
    const metrics = body.metrics || {};

    const gpu = specs.gpu || "NVIDIA GeForce GPU";
    const cpu = specs.cpu || "Multi-Core Processor";
    const ram = specs.ramGB ? `${specs.ramGB} GB RAM` : "16 GB RAM";
    const os = specs.os || "Windows 11";
    const driver = specs.gpuDriver || "Latest Available";
    const appVer = specs.appVersion || "v3.3.6";

    const prompt = `You are the Lead Systems & Graphics Engine Diagnostic AI for Mission Control in 2026.
A PC gamer encountered a hardware/software problem and needs an authoritative, technical bug report draft for the developer triage board.

Gamer's Node Specs:
- GPU: ${gpu} (Driver: ${driver})
- CPU: ${cpu}
- Memory: ${ram}
- OS: ${os} (${specs.osVersion || "Modern Build"})
- Mission Control Version: ${appVer}
- Game Context: ${targetGame}
${metrics.fps ? `- Current FPS: ${metrics.fps}` : ""}
${metrics.vramUsed ? `- VRAM Allocation: ${metrics.vramUsed} MB` : ""}
${metrics.gpuTemp ? `- GPU Temperature: ${metrics.gpuTemp} °C` : ""}

Gamer's Reported Symptom or Error Message:
"${rawError || "Experiencing severe stuttering and driver crashes during gameplay"}"

Analyze the root cause based on modern 2026 PC gaming architectures (DirectX 12 Agility, Vulkan, DLSS 3.5/4 Frame Generation, Shader Compilation Stutter, VRAM saturation, TDR timeout, or OS scheduler anomalies).
Respond ONLY with valid JSON in this exact structure without markdown formatting or code blocks:
{
  "title": "A technical, concise issue title (max 15 words, e.g., 'DX12 Device Removal Crash with Ray Tracing on RTX 5050 Mobile')",
  "category": "hardware" | "glitch" | "performance" | "other",
  "game": "${targetGame}",
  "description": "A 2-3 paragraph authoritative technical summary explaining the failure mechanism, reproduction trigger, and exact telemetry context.",
  "technicalInsight": "A 1-2 sentence core diagnostic statement explaining the hardware/software conflict.",
  "suggestedFix": "Immediate mitigation advice for the gamer (e.g. lowering VRAM textures, driver clean reinstall, or disabling hardware accelerated GPU scheduling)."
}`;

    let parsedResult = null;

    // TIER 1: Google Gemini 2.0 Flash
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
            }),
          }
        );

        if (geminiRes.ok) {
          const gData = await geminiRes.json();
          const rawText = gData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (rawText) {
            parsedResult = JSON.parse(rawText.replace(/```json/g, "").replace(/```/g, "").trim());
          }
        }
      } catch (err) {
        console.warn("[DiagnoseAPI] Gemini Flash Tier failed:", err);
      }
    }

    // TIER 2: NVIDIA NIM (Llama 3.3 70B)
    if (!parsedResult && process.env.NVIDIA_API_KEY) {
      try {
        const nimRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
          },
          body: JSON.stringify({
            model: "meta/llama-3.3-70b-instruct",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
            response_format: { type: "json_object" },
          }),
        });

        if (nimRes.ok) {
          const nData = await nimRes.json();
          const content = nData.choices?.[0]?.message?.content;
          if (content) {
            parsedResult = JSON.parse(content.replace(/```json/g, "").replace(/```/g, "").trim());
          }
        }
      } catch (err) {
        console.warn("[DiagnoseAPI] NVIDIA NIM Tier failed:", err);
      }
    }

    // TIER 3: Intelligent Heuristic Fallback Engine (Offline-resilient 2026 Diagnostic)
    if (!parsedResult) {
      const lowerErr = rawError.toLowerCase();
      let category: "hardware" | "glitch" | "performance" | "other" = "glitch";
      let title = `System Instability on ${gpu}`;
      let technicalInsight = `Telemetry indicates GPU driver synchronization failure on Driver ${driver}.`;
      let suggestedFix = "Perform a clean driver reinstall and verify shader cache integrity.";

      if (lowerErr.includes("vram") || lowerErr.includes("memory") || lowerErr.includes("out of memory")) {
        category = "hardware";
        title = `VRAM Allocation Exhaustion on ${gpu} (${targetGame})`;
        technicalInsight = `DirectX 12 buffer allocation exceeded local VRAM buffer capacity on ${gpu}.`;
        suggestedFix = "Reduce texture resolution, shadow maps, or switch DLSS/FSR to Performance mode.";
      } else if (lowerErr.includes("fps") || lowerErr.includes("stutter") || lowerErr.includes("drop") || lowerErr.includes("lag")) {
        category = "performance";
        title = `Shader Compilation Frame Pacing Stutter in ${targetGame}`;
        technicalInsight = `Asynchronous compute bottlenecks observed on ${cpu} during runtime PSO caching.`;
        suggestedFix = "Enable Reflex Low Latency, lock framerate to display refresh, or toggle Frame Generation.";
      } else if (lowerErr.includes("dxgi") || lowerErr.includes("crash") || lowerErr.includes("black screen")) {
        category = "glitch";
        title = `TDR Crash / DXGI Device Removal on Driver ${driver}`;
        technicalInsight = `Windows Graphics Kernel TDR timeout triggered under high compute queue load.`;
        suggestedFix = "Disable aggressive GPU overclocks, verify system power limit, and update DirectX runtime.";
      }

      parsedResult = {
        title,
        category,
        game: targetGame,
        description: `Encountered critical anomaly on ${gpu} running Driver ${driver} under ${os}. Observed symptom: "${rawError || "System freeze or crash during intensive 3D rendering session"}". Local node hardware telemetry records ${ram} and ${cpu}.\n\nThe failure signature matches an unhandled execution stall in the DirectX/Vulkan pipeline, leading to render thread desynchronization in ${targetGame}.`,
        technicalInsight,
        suggestedFix,
      };
    }

    return NextResponse.json(parsedResult);
  } catch (error: any) {
    console.error("[DiagnoseAPI] Critical error:", error);
    return NextResponse.json(
      { error: "Diagnostic service error", details: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
