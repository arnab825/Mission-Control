export interface TestedSpecs {
  gpu: string;
  resolution: string;
  avgFps: string;
  vramUsed: string;
  latency: string;
  gpuLoad: string;
}

export interface PresetRecommendations {
  rtx40: string;
  rtx30: string;
  gtx: string;
}

export interface VerifiedFeature {
  name: string;
  desc: string;
  active: boolean;
}

export interface BenchmarkScreenshot {
  src: string;
  title: string;
  desc: string;
}

export interface BenchmarkProfile {
  id: string;
  name: string;
  publisher: string;
  releaseYear: string;
  genre: string;
  api: string;
  score: number;
  status: string;
  preset: string;
  testedSpecs: TestedSpecs;
  presets: PresetRecommendations;
  features: VerifiedFeature[];
  screenshots: BenchmarkScreenshot[];
}

export interface TestedGameSummary {
  id: string;
  name: string;
  publisher: string;
  genre: string;
  preset: string;
  keyTech: string[];
  status: string;
  fps: string;
  vram: string;
  gpuLoad: string;
  latency: string;
  api: string;
}

export const BENCHMARK_PROFILES: Record<string, BenchmarkProfile> = {
  spiderman2: {
    id: "spiderman2",
    name: "Marvel's Spider-Man 2",
    publisher: "Insomniac Games / PlayStation",
    releaseYear: "2026 PC Edition",
    genre: "Open World / Action",
    api: "DirectX 12 Ultimate",
    score: 99,
    status: "VERIFIED & OPTIMAL",
    preset: "Ultra Ray Tracing",
    testedSpecs: {
      gpu: "NVIDIA GeForce RTX Series / GTX Series",
      resolution: "4K UHD (3840 x 2160) & 1440p QHD",
      avgFps: "80 FPS",
      vramUsed: "6.5 GB / 8.0 GB",
      latency: "10.8 ms",
      gpuLoad: "94%"
    },
    presets: {
      rtx40: "Ultra Ray Tracing + DLSS Quality + Frame Generation",
      rtx30: "High Ray Tracing + DLSS Balanced + Reflex",
      gtx: "Esports Latency (NVIDIA Reflex Low Latency)"
    },
    features: [
      { name: "NVIDIA DLSS 4", desc: "Multi-Frame Generation & Ray Reconstruction", active: true },
      { name: "DLSS Frame Generation", desc: "2x Frame Interpolation", active: true },
      { name: "NVIDIA Reflex", desc: "Low Latency Input Pass-Through", active: true },
      { name: "Full Ray Tracing", desc: "Ray-Traced Reflections & Ambient Occlusion", active: true }
    ],
    screenshots: [
      {
        src: "/games/SpiderMan_SS1.png",
        title: "High-Speed Manhattan Traversal & Ray Tracing",
        desc: "Full Ray-Traced city reflections and ultra draw distance at 80 FPS with DLSS 4 Multi-Frame Generation (94% GPU Load, 6.5 GB / 8.0 GB VRAM)."
      },
      {
        src: "/games/SpiderMan_SS2.png",
        title: "Combat Telemetry & Input Responsiveness Audit",
        desc: "Fast-paced acrobatic combat with NVIDIA Reflex Low Latency active, maintaining 10.8 ms system response latency."
      },
      {
        src: "/games/SpiderMan_SS3.png",
        title: "New York City Skyline & VRAM Footprint",
        desc: "Panoramic cityscape audit demonstrating high-density geometry rendering and verified 6.5 GB / 8.0 GB VRAM memory footprint."
      }
    ]
  },
  gtav: {
    id: "gtav",
    name: "Grand Theft Auto V Enhanced",
    publisher: "Rockstar Games",
    releaseYear: "Enhanced Edition",
    genre: "Open World / Action",
    api: "DirectX 12 Ultimate",
    score: 98,
    status: "VERIFIED BENCHMARK",
    preset: "RTX High FPS",
    testedSpecs: {
      gpu: "NVIDIA GeForce RTX Series / GTX Series",
      resolution: "4K UHD (3840 x 2160) & 1440p QHD",
      avgFps: "193 FPS",
      vramUsed: "4.56 GB / 8.0 GB",
      latency: "12.4 ms",
      gpuLoad: "88%"
    },
    presets: {
      rtx40: "RTX High FPS + DLSS Quality + Frame Generation",
      rtx30: "High Preset + DLSS Quality + Reflex",
      gtx: "Maxed Standard + NVIDIA Reflex Low Latency"
    },
    features: [
      { name: "NVIDIA DLSS 4", desc: "Multi-Frame Generation & Super Resolution", active: true },
      { name: "DLSS Frame Generation", desc: "High Frame Rate Boost", active: true },
      { name: "NVIDIA Reflex", desc: "Low Latency Optimization", active: true },
      { name: "Ray Tracing Shadows", desc: "Enhanced Ray-Traced Shadows & Reflections", active: true }
    ],
    screenshots: [
      {
        src: "/games/GTA_V_SS1.png",
        title: "Los Santos Highway High-Speed Telemetry",
        desc: "High-speed highway rendering at 193 FPS with DLSS 4 Multi-Frame Generation (88% GPU Load, 4.56 GB / 8.0 GB VRAM)."
      },
      {
        src: "/games/GTA_V_SS2.png",
        title: "Urban Combat & Latency Audit",
        desc: "Street engagement telemetry verified with NVIDIA Reflex Low Latency maintaining 12.4 ms response time."
      },
      {
        src: "/games/GTA_V_SS3.png",
        title: "Sunset Cityscape VRAM Footprint",
        desc: "Volumetric lighting and shadow rendering audit demonstrating 4.56 GB / 8.0 GB VRAM allocation."
      }
    ]
  },
  tsushima: {
    id: "tsushima",
    name: "Ghost of Tsushima Director's Cut",
    publisher: "Sucker Punch / PlayStation Publishing",
    releaseYear: "2024 PC Edition",
    genre: "Open World / Action RPG",
    api: "DirectX 12 Ultimate",
    score: 99,
    status: "VERIFIED & OPTIMAL",
    preset: "Very High / DLSS Quality",
    testedSpecs: {
      gpu: "NVIDIA GeForce RTX Series / GTX Series",
      resolution: "4K UHD (3840 x 2160) & 1440p QHD",
      avgFps: "107 FPS",
      vramUsed: "5.3 GB / 8.0 GB",
      latency: "11.2 ms",
      gpuLoad: "96%"
    },
    presets: {
      rtx40: "Very High Preset + DLSS Quality + Frame Generation",
      rtx30: "High Preset + DLSS Quality + Reflex Low Latency",
      gtx: "Medium Preset + FSR 3 / XeSS + Reflex Low Latency"
    },
    features: [
      { name: "NVIDIA DLSS 4", desc: "Multi-Frame Generation & Super Resolution", active: true },
      { name: "DLSS Frame Generation", desc: "2x Frame Rate Boost", active: true },
      { name: "NVIDIA Reflex", desc: "Low Latency Input Pass-Through", active: true },
      { name: "Exclusive Fullscreen ETW", desc: "Hardware ETW Hook & Direct DXGI Telemetry", active: true }
    ],
    screenshots: [
      {
        src: "/games/Tsushima_SS1.png",
        title: "Tsushima Island Traversal & Hardware Telemetry",
        desc: "High-fidelity rendering across feudal Japan at 107 FPS with DLSS 4 Multi-Frame Generation (96% GPU Load, 5.3 GB / 8.0 GB VRAM)."
      },
      {
        src: "/games/Tsushima_SS2.png",
        title: "Samurai Stance Combat & Latency Audit",
        desc: "Fast-paced katana combat telemetry verified with NVIDIA Reflex Low Latency maintaining 11.2 ms system response time."
      },
      {
        src: "/games/Tsushima_SS3.png",
        title: "Cinematic Foliage & Memory Allocation",
        desc: "Dense particle and wind physics rendering audit demonstrating 5.3 GB / 8.0 GB VRAM memory footprint."
      }
    ]
  }
};

export const TESTED_GAMES_LIST: TestedGameSummary[] = [
  {
    id: "spiderman2",
    name: "Marvel's Spider-Man 2",
    publisher: "Insomniac Games",
    genre: "Open World / Action",
    preset: "Ultra Ray Tracing",
    keyTech: ["DLSS 4", "Frame Gen", "Reflex", "Ray Tracing"],
    status: "VERIFIED BENCHMARK",
    fps: "80 FPS",
    vram: "6.5 GB / 8.0 GB",
    gpuLoad: "94%",
    latency: "10.8 ms",
    api: "DX12 Ultimate"
  },
  {
    id: "gtav",
    name: "Grand Theft Auto V Enhanced",
    publisher: "Rockstar Games",
    genre: "Open World / Action",
    preset: "RTX High FPS",
    keyTech: ["DLSS 4", "Frame Gen", "Reflex", "Ray Tracing"],
    status: "VERIFIED BENCHMARK",
    fps: "193 FPS",
    vram: "4.56 GB / 8.0 GB",
    gpuLoad: "88%",
    latency: "12.4 ms",
    api: "DX12 Ultimate"
  },
  {
    id: "tsushima",
    name: "Ghost of Tsushima Director's Cut",
    publisher: "Sucker Punch / PlayStation",
    genre: "Open World / Action RPG",
    preset: "Very High / DLSS",
    keyTech: ["DLSS 4", "Frame Gen", "Reflex", "Exclusive Fullscreen ETW"],
    status: "VERIFIED BENCHMARK",
    fps: "107 FPS",
    vram: "5.3 GB / 8.0 GB",
    gpuLoad: "96%",
    latency: "11.2 ms",
    api: "DX12 Ultimate"
  }
];

export function getAllBenchmarkProfiles(): BenchmarkProfile[] {
  return Object.values(BENCHMARK_PROFILES);
}

export function getBenchmarkProfileById(id: string): BenchmarkProfile {
  return BENCHMARK_PROFILES[id] || BENCHMARK_PROFILES["spiderman2"];
}
