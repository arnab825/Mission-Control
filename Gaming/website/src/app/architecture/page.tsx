import React from "react";
import connectDB from "@/lib/mongodb";
import ArchitectureComponentModel from "@/models/ArchitectureComponent";
import ArchitectureClient from "./ArchitectureClient";

const DEFAULT_COMPONENTS = [
  {
    id: "parallel-hardware",
    num: "01",
    iconName: "Activity",
    title: "Parallel Hardware Telemetry Engine",
    subTitle: "60Hz Low-Level HAL & WMI Monitoring Daemon",
    desc: "A headless C++ daemon interfaces directly with the Operating System Hardware Abstraction Layer (HAL) and Windows Management Instrumentation (WMI). It queries sub-millisecond thermals, clock rates, and VRAM memory page faults, streaming JSON telemetry over local WebSockets directly to the React overlay thread at 60 FPS.",
    specs: [
      { label: "Polling Rate", val: "60 Hz Active" },
      { label: "CPU Overhead", val: "< 0.2%" },
      { label: "Protocol", val: "Local WebSocket IPC" }
    ],
    order: 1
  },
  {
    id: "nim-core",
    num: "02",
    iconName: "Cpu",
    title: "Local AI Inference Pipeline (TensorRT)",
    subTitle: "Quantized FP16 & INT8 Neural Model Execution",
    desc: "Mission Control compiles open-weights LLMs directly into optimized NVIDIA TensorRT execution engines. By leveraging physical Tensor Cores on GeForce GTX and RTX hardware, inference runs entirely inside localized VRAM sandboxes with zero cloud ping or external bandwidth consumption.",
    specs: [
      { label: "Inference Latency", val: "12.4 ms" },
      { label: "Precision Engine", val: "FP16 / INT8 Quantized" },
      { label: "Privacy Rating", val: "100% Local / Sandbox" }
    ],
    order: 2
  },
  {
    id: "directx-presentation",
    num: "03",
    iconName: "Layers",
    title: "DirectX 12 / Vulkan Present Overlay",
    subTitle: "Seamless Hardware Swapchain Composition",
    desc: "Using hardware-level swapchain hooking and transparent desktop window composition, Mission Control projects a non-intrusive heads-up display directly over active rendering pipelines without interrupting G-Sync, FreeSync, or HDR color spaces.",
    specs: [
      { label: "Render Overhead", val: "0 FPS Drop" },
      { label: "Hook Protocols", val: "DirectX 11/12, Vulkan" },
      { label: "Input Pass-Through", val: "Sub-millisecond" }
    ],
    order: 3
  },
  {
    id: "process-watcher",
    num: "04",
    iconName: "Terminal",
    title: "Process Watcher & Agentic Daemon",
    subTitle: "Autonomous Game State Reaction Engine",
    desc: "An asynchronous system event listener watches process handles across Windows and Linux system kernels. Upon detecting targeted game executables, it automatically invokes system tuning profiles, suspends background Electron apps, and clears PyTorch caches.",
    specs: [
      { label: "Detection Engine", val: "Kernel Event Hook" },
      { label: "Action Response", val: "< 5 ms" },
      { label: "Safety Verification", val: "Memory Read-Only" }
    ],
    order: 4
  }
];

export default async function ArchitecturePage() {
  let components = [];

  try {
    await connectDB();
    const docs = await ArchitectureComponentModel.find({}).sort({ order: 1 }).lean();

    if (docs.length === 0) {
      console.log("Architecture collection is empty. Seeding defaults...");
      await ArchitectureComponentModel.insertMany(DEFAULT_COMPONENTS);
      components = DEFAULT_COMPONENTS;
    } else {
      components = docs.map((doc: any) => ({
        id: doc.id,
        num: doc.num,
        iconName: doc.iconName,
        title: doc.title,
        subTitle: doc.subTitle,
        desc: doc.desc,
        specs: doc.specs.map((s: any) => ({
          label: s.label,
          val: s.val
        }))
      }));
    }
  } catch (error) {
    console.error("Failed to load architecture components from MongoDB:", error);
    // Fallback to static list if database connection fails entirely
    components = DEFAULT_COMPONENTS;
  }

  return <ArchitectureClient components={components} />;
}
