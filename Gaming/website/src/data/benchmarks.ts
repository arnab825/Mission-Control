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
  coverImage: string;
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
        src: "/games/SpiderMan_SS1.webp",
        title: "High-Speed Manhattan Traversal & Ray Tracing",
        desc: "Full Ray-Traced city reflections and ultra draw distance at 80 FPS with DLSS 4 Multi-Frame Generation (94% GPU Load, 6.5 GB / 8.0 GB VRAM)."
      },
      {
        src: "/games/SpiderMan_SS2.webp",
        title: "Combat Telemetry & Input Responsiveness Audit",
        desc: "Fast-paced acrobatic combat with NVIDIA Reflex Low Latency active, maintaining 10.8 ms system response latency."
      },
      {
        src: "/games/SpiderMan_SS3.webp",
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
        src: "/games/GTA_V_SS1.webp",
        title: "Los Santos Highway High-Speed Telemetry",
        desc: "High-speed highway rendering at 193 FPS with DLSS 4 Multi-Frame Generation (88% GPU Load, 4.56 GB / 8.0 GB VRAM)."
      },
      {
        src: "/games/GTA_V_SS2.webp",
        title: "Urban Combat & Latency Audit",
        desc: "Street engagement telemetry verified with NVIDIA Reflex Low Latency maintaining 12.4 ms response time."
      },
      {
        src: "/games/GTA_V_SS3.webp",
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
        src: "/games/Tsushima_SS1.webp",
        title: "Tsushima Island Traversal & Hardware Telemetry",
        desc: "High-fidelity rendering across feudal Japan at 107 FPS with DLSS 4 Multi-Frame Generation (96% GPU Load, 5.3 GB / 8.0 GB VRAM)."
      },
      {
        src: "/games/Tsushima_SS2.webp",
        title: "Samurai Stance Combat & Latency Audit",
        desc: "Fast-paced katana combat telemetry verified with NVIDIA Reflex Low Latency maintaining 11.2 ms system response time."
      },
      {
        src: "/games/Tsushima_SS3.webp",
        title: "Cinematic Foliage & Memory Allocation",
        desc: "Dense particle and wind physics rendering audit demonstrating 5.3 GB / 8.0 GB VRAM memory footprint."
      }
    ]
  },
  nfsheat: {
    id: "nfsheat",
    name: "Need For Speed Heat",
    publisher: "Electronic Arts / Ghost Games",
    releaseYear: "2019 / Frostbite 3",
    genre: "Arcade Racing / Open World",
    api: "DirectX 12",
    score: 97,
    status: "VERIFIED BENCHMARK",
    preset: "Ultra Frostbite",
    testedSpecs: {
      gpu: "NVIDIA GeForce RTX Series / GTX Series",
      resolution: "1080p FHD / 1440p QHD",
      avgFps: "73 FPS",
      vramUsed: "2.76 GB / 8.0 GB",
      latency: "13.5 ms",
      gpuLoad: "100%"
    },
    presets: {
      rtx40: "Ultra Frostbite Preset + Reflex Low Latency",
      rtx30: "High / Ultra Preset + Frame Pacing Sync",
      gtx: "High Preset + Reflex Low Latency (100% GPU Efficiency)"
    },
    features: [
      { name: "Frostbite 3 Engine", desc: "Dynamic Wet Asphalt & Volumetric Rain", active: true },
      { name: "NVIDIA Reflex", desc: "Low Latency Input Pass-Through", active: true },
      { name: "VRAM Efficiency", desc: "Optimized 2.76 GB Memory Footprint", active: true },
      { name: "Dynamic Night Lighting", desc: "Neon Shader Simulation & Screen Space Reflections", active: true }
    ],
    screenshots: [
      {
        src: "/games/NFSHeat_SS1.webp",
        title: "Cape Castille Rain Race & Max-Load GPU Telemetry",
        desc: "Wet weather grid racing captured at 63 FPS with 100% GPU utilization (53W power draw, 2.76 GB / 8.0 GB VRAM, 90% CPU load)."
      },
      {
        src: "/games/NFSHeat_SS2.webp",
        title: "Eden Shores Neon City & Night Heat Telemetry",
        desc: "Night city cruising captured at 74 FPS with 100% GPU load (45W power draw, 2.56 GB / 8.0 GB VRAM, 90% Excellent stability rating)."
      },
      {
        src: "/games/NFSHeat_SS3.webp",
        title: "Grenada Wetlands High-Speed Sprint Telemetry",
        desc: "Open highway sprint captured at 81 FPS with 97% GPU load (54W power draw, 2.76 GB / 8.0 GB VRAM, 269 km/h telemetry)."
      }
    ]
  },
  thedivision: {
    id: "thedivision",
    name: "Tom Clancy's The Division",
    publisher: "Ubisoft / Massive Entertainment",
    releaseYear: "2016 / Snowdrop Engine",
    genre: "Tactical Shooter / Action RPG",
    api: "DirectX 12",
    score: 98,
    status: "VERIFIED BENCHMARK",
    preset: "Ultra Snowdrop Settings",
    testedSpecs: {
      gpu: "NVIDIA GeForce RTX Series / GTX Series",
      resolution: "1080p FHD / 1440p QHD",
      avgFps: "94 FPS",
      vramUsed: "3.26 GB / 8.0 GB",
      latency: "10.6 ms",
      gpuLoad: "100%"
    },
    presets: {
      rtx40: "Ultra Snowdrop Preset + Anisotropic 16x + Reflex",
      rtx30: "Ultra Preset + Sub-surface Scattering + Reflex",
      gtx: "High Preset + Low Latency Mode (90%+ GPU Efficiency)"
    },
    features: [
      { name: "Snowdrop Engine", desc: "Procedural Weather, Snow & Volumetric Lighting", active: true },
      { name: "DirectX 12 API", desc: "Multi-threaded Command Buffers & Async Compute", active: true },
      { name: "NVIDIA Reflex", desc: "Low Latency Input Optimization", active: true },
      { name: "Memory Optimization", desc: "3.26 GB Peak Allocation at Ultra Geometry Density", active: true }
    ],
    screenshots: [
      {
        src: "/games/TomClancyThe Division_SS1.webp",
        title: "JTF Post Base Exterior & Winter Lighting Telemetry",
        desc: "Government building exterior audit captured at 97 FPS with 100% GPU utilization (55W power draw, 2.2 GB / 8.0 GB VRAM, 90% Excellent stability)."
      },
      {
        src: "/games/TomClancyThe Division_SS2.webp",
        title: "Snowdrop Engine Urban Combat & Tactical Telemetry",
        desc: "Cover shooter combat engagement captured at 92 FPS with 100% GPU load (45W power draw, 3.26 GB / 8.0 GB VRAM allocation)."
      },
      {
        src: "/games/TomClancyThe Division_SS3.webp",
        title: "Midtown Street Cover & Volumetric Snow Telemetry",
        desc: "Tactical street corner reconnaissance captured at 93 FPS with 97% GPU load (45W power draw, 3.26 GB / 8.0 GB VRAM allocation)."
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
    api: "DX12 Ultimate",
    coverImage: "/games/SpiderMan_SS1.webp"
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
    api: "DX12 Ultimate",
    coverImage: "/games/GTA_V_SS1.webp"
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
    api: "DX12 Ultimate",
    coverImage: "/games/Tsushima_SS1.webp"
  },
  {
    id: "nfsheat",
    name: "Need For Speed Heat",
    publisher: "Electronic Arts",
    genre: "Arcade Racing / Open World",
    preset: "Ultra Frostbite",
    keyTech: ["Frostbite 3", "Reflex", "DX12", "Night Heat Shaders"],
    status: "VERIFIED BENCHMARK",
    fps: "73 FPS",
    vram: "2.76 GB / 8.0 GB",
    gpuLoad: "100%",
    latency: "13.5 ms",
    api: "DX12",
    coverImage: "/games/NFSHeat_SS1.webp"
  },
  {
    id: "thedivision",
    name: "Tom Clancy's The Division",
    publisher: "Ubisoft",
    genre: "Tactical Shooter / Action RPG",
    preset: "Ultra Snowdrop",
    keyTech: ["Snowdrop", "DX12", "Reflex", "Volumetric Snow"],
    status: "VERIFIED BENCHMARK",
    fps: "94 FPS",
    vram: "3.26 GB / 8.0 GB",
    gpuLoad: "100%",
    latency: "10.6 ms",
    api: "DX12",
    coverImage: "/games/TomClancyThe Division_SS1.webp"
  }
];

export function getAllBenchmarkProfiles(): BenchmarkProfile[] {
  return Object.values(BENCHMARK_PROFILES);
}

export function getBenchmarkProfileById(id: string): BenchmarkProfile {
  return BENCHMARK_PROFILES[id] || BENCHMARK_PROFILES["spiderman2"];
}
