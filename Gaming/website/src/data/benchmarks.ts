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

export interface GameplayMechanic {
  name: string;
  desc: string;
}

export interface DetailedOverview {
  story: string;
  gameplayLoop: string;
  keyMechanics: GameplayMechanic[];
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
  overview: string;
  detailedOverview: DetailedOverview;
  testedSpecs: TestedSpecs;
  presets: PresetRecommendations;
  features: VerifiedFeature[];
  screenshots: BenchmarkScreenshot[];
  gameplayGif?: string;
  storeRating?: string;
  dlssVersion?: string;
  aiVisionStatus?: string;
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
  gameplayGif?: string;
  storeRating?: string;
  dlssVersion?: string;
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
    overview: "Set nine months after Spider-Man: Miles Morales, Peter Parker and Miles Morales balance their personal lives while defending New York City from Kraven the Hunter and a corruption caused by the alien Venom Symbiote.",
    detailedOverview: {
      story: "Set nine months after the events of Spider-Man: Miles Morales, Peter Parker and Miles Morales struggle to balance their personal lives while defending New York City. The return of Peter's childhood friend Harry Osborn and the arrival of Kraven the Hunter's murderous mercenary faction turns Marvel's New York into a hunting ground. When the alien Venom Symbiote bonds with Peter, it grants him terrifying Symbiote abilities but corrupts his moral compass, forcing Miles to confront his mentor and save the city from an impending Symbiote takeover.",
      gameplayLoop: "Seamless dual-character swapping across an expanded NYC (Manhattan, Brooklyn, Queens) with Web Wings traversal, high-speed catapults, dynamic crime events, Symbiote combat abilities, and tactical gadget combos.",
      keyMechanics: [
        { name: "Dual-Protagonist Swapping", desc: "Switch dynamically between Peter and Miles in the open world, each featuring unique skill trees, suit abilities, and combat animations." },
        { name: "Web Wings Traversal", desc: "Glide through wind tunnels and skyscraper slipstreams at twice the speed of web-swinging, seamlessly linking traversal mechanics across massive distances." },
        { name: "Symbiote & Bio-Electric Combat", desc: "Peter utilizes heavy Symbiote tendrils for devastating crowd-control attacks, while Miles wields Venom shockwaves and chain lightning abilities." },
        { name: "Parry & Precision Combat", desc: "Execute timed parries against heavy boss strikes and brute enemies, expanding the traditional dodge-heavy combat system." }
      ]
    },
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
    overview: "Set in the sun-drenched metropolis of Los Santos and Blaine County, GTA V follows retired bank robber Michael, unhinged dealer Trevor, and street hustler Franklin as they execute high-stakes heists while dodging corrupt federal agents.",
    detailedOverview: {
      story: "Set in the expansive metropolis of Los Santos and Blaine County, Grand Theft Auto V weaves the intertwined lives of three distinct criminals: Michael De Santa, a former bank robber living in witness protection; Trevor Philips, a chaotic and volatile arms runner; and Franklin Clinton, a young street hustler aiming for high-end score opportunities. Dragged back into the criminal underworld by corrupted federal agents and dangerous cartels, the trio must pull off a series of complex, high-stakes heists to secure their freedom and fortune.",
      gameplayLoop: "Freely explore a massive open-world sandbox, engage in multi-stage heist missions, customize vehicles and weaponry, run criminal enterprises, and switch dynamically between three protagonists during missions and free-roam.",
      keyMechanics: [
        { name: "Three-Protagonist Dynamic Switching", desc: "Seamlessly switch between Michael, Franklin, and Trevor during heists to manage snipers, getaway drivers, and assault teams in real time." },
        { name: "Multi-Stage Heist Planning", desc: "Plan major robberies by selecting approach vectors (Smart vs. Loud), hiring crew members with distinct skill/cut ratios, and setting up prep missions." },
        { name: "Special Character Abilities", desc: "Michael triggers bullet-time precision marksmanship; Franklin slows time while driving for high-speed maneuvers; Trevor enters a berserk rage with reduced damage and boosted firepower." },
        { name: "Enhanced Graphics & Dynamic Sandbox", desc: "Features upgraded ray-traced shadows, enhanced foliage density, high-resolution textures, and a living open-world AI simulation." }
      ]
    },
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
    overview: "Set in 13th-century feudal Japan during the Mongol invasion, honorable samurai Jin Sakai survives a devastating assault on Tsushima Island and must abandon his code of honor to become 'The Ghost' to liberate his homeland.",
    detailedOverview: {
      story: "In late 13th century Japan, the Mongol Empire invades Tsushima Island, wiping out the samurai defense in a brutal slaughter. Lord Jin Sakai, one of the last surviving samurai, is saved from death and vows to liberate his home from the tyrannical General Khotun Khan. Realizing that traditional, honorable samurai combat tactics are ineffective against the ruthless invaders, Jin must break his sacred samurai code and forge the identity of 'The Ghost' — a feared stealth assassin who uses fear, explosive weapons, and dishonorable tactics to save Tsushima.",
      gameplayLoop: "Explore feudal Tsushima guided by wind and wildlife, master four distinct combat stances, execute stealth assassinations from rooftops, liberate occupied Mongol outposts, and duel master swordsmen in cinematic 1v1 encounters.",
      keyMechanics: [
        { name: "Four Combat Stances", desc: "Switch between Stone, Water, Wind, and Moon stances in real-time to stagger specific enemy weapon types (Swords, Shields, Spears, Brutes)." },
        { name: "The Ghost Stealth & Tools", desc: "Utilize kunai throwing daggers, smoke bombs, sticky bombs, blowdarts, and grappling hooks to strike fear into enemies and trigger terror flee mechanics." },
        { name: "Guiding Wind Exploration", desc: "Clean, immersive UI with no mini-map — swiping the touchpad or summoning the wind visually guides players toward objectives and secrets." },
        { name: "Standoff & Mythic Duels", desc: "Initiate high-stakes 1v1 Standoffs at camp entrances to instantly execute approaching foes with single-frame katana strikes." }
      ]
    },
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
    overview: "Set in Palm City, a neon-lit street racing paradise inspired by Miami, players race by day in sanctioned Speedhunters Showdown events to earn Bank, and risk it all in illegal night races to build Rep while evading a rogue police taskforce.",
    detailedOverview: {
      story: "Set in Palm City, a neon-infused street racing destination inspired by Miami, players step into the shoes of an up-and-coming street racer. By day, the city hosts the Speedhunters Showdown — a sanctioned, legal competition where drivers earn cash to purchase and upgrade performance parts. But as night falls, the city transforms into an illegal underground street racing arena where racers risk everything for Rep. Tensions escalate when a corrupt High-Speed Task Force led by Mercer exploits the law to extort and impound street racers' cars.",
      gameplayLoop: "Engage in a dual Day/Night gameplay loop: race legal events during the day to earn Bank, then swap to night racing to accumulate Rep and Heat levels. Return safely to a safehouse without getting busted by aggressive police to bank your rewards.",
      keyMechanics: [
        { name: "Day & Night Dual Progression", desc: "Day events earn Bank (money for cars/parts); Night events earn Rep (unlocks new cars/parts) and raise Heat level multipliers up to 5x." },
        { name: "High-Risk Cop Chases", desc: "Night cops deploy PIT maneuvers, spike strips, kill switches, and armored Rhinos. Getting busted loses your Heat multiplier and a chunk of Bank." },
        { name: "Deep Performance & Visual Tuning", desc: "Exchange engines, adjust exhaust notes, fine-tune stance, customize liveries, and balance drift vs. grip handling dynamics." },
        { name: "Manual Drift Tap & Gas Control", desc: "Tap or release/re-engage the throttle while steering to initiate smooth, high-speed drifts around tight city corners." }
      ]
    },
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
    overview: "Set in a frozen, post-apocalyptic New York City following the collapse of society from the 'Dollar Flu' pandemic, tactical operatives of The Division are deployed to restore order, investigate the virus's origin, and reclaim Manhattan.",
    detailedOverview: {
      story: "On Black Friday, a deadly, smallpox-based bio-weapon known as 'The Dollar Flu' is released via paper currency in New York City. Within weeks, the pandemic devastates the city's infrastructure, leading to a complete societal breakdown. Government agencies collapse, and violent rogue factions (Rioters, Cleaners, Rikers, Last Man Battalion) seize control of Manhattan. You are an agent of the Strategic Homeland Division — an elite unit of tactical sleeper agents activated as the last line of defense to restore order, assist survivors, and discover the source of the virus.",
      gameplayLoop: "Deploy into a snowy midtown Manhattan, fight through tactical cover-based combat encounters, loot high-tier gear and weapons, upgrade your Base of Operations, and enter the high-risk Dark Zone PvPvE area for contaminated loot extractions.",
      keyMechanics: [
        { name: "Tactical Cover-Based Combat", desc: "Utilize dynamic cover-to-cover transitions, suppression mechanics, and tactical positioning to outflank heavily armed enemy factions." },
        { name: "Base of Operations Upgrade Wings", desc: "Rebuild Medical, Tech, and Security wings to unlock active skills (Seeker Mines, Turrets, Pulse Scanners, First Aid) and passive perks." },
        { name: "Loot & RPG Build Customization", desc: "Collect High-End gear sets, calibrate weapon talents (DPS, Armor, Skill Power), and optimize weapon attachments for recoil and critical hits." },
        { name: "The Dark Zone (PvPvE Zone)", desc: "Enter a lawless walled-off zone to collect high-tier contaminated loot, call in helicopter extractions, and decide whether to team up or go Rogue against other players." }
      ]
    },
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
    publisher: "Insomniac Games / PlayStation",
    genre: "Open World / Action",
    preset: "Ultra Ray Tracing",
    keyTech: ["DLSS 4", "Frame Gen", "Reflex", "Ray Tracing"],
    status: "VERIFIED BENCHMARK",
    fps: "80 FPS",
    vram: "6.5 GB / 8.0 GB",
    gpuLoad: "94%",
    latency: "10.8 ms",
    api: "DX12 Ultimate",
    coverImage: "/games/SpiderMan_SS1.webp",
    gameplayGif: "/games/SpiderMan_SS1.webp",
    storeRating: "4.9 ★★★★★",
    dlssVersion: "DLSS 4.0 + FG"
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
    coverImage: "/games/GTA_V_SS1.webp",
    gameplayGif: "/games/GTA_V_SS1.webp",
    storeRating: "4.8 ★★★★★",
    dlssVersion: "DLSS 4.0 + FG"
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
    coverImage: "/games/Tsushima_SS1.webp",
    gameplayGif: "/games/Tsushima_SS1.webp",
    storeRating: "4.9 ★★★★★",
    dlssVersion: "DLSS 4.0 + FG"
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
    coverImage: "/games/NFSHeat_SS1.webp",
    gameplayGif: "/games/NFSHeat_SS1.webp",
    storeRating: "4.7 ★★★★★",
    dlssVersion: "DLSS 2.4"
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
    coverImage: "/games/TomClancyThe Division_SS1.webp",
    gameplayGif: "/games/TomClancyThe Division_SS1.webp",
    storeRating: "4.6 ★★★★☆",
    dlssVersion: "DirectX 12"
  }
];

export function getAllBenchmarkProfiles(): BenchmarkProfile[] {
  return Object.values(BENCHMARK_PROFILES);
}

export function getBenchmarkProfileById(id: string): BenchmarkProfile {
  return BENCHMARK_PROFILES[id] || BENCHMARK_PROFILES.spiderman2;
}
