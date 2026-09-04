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

/**
 * Offline / Seed Fallback Profiles.
 * Note: Data fetched from MongoDB database (via /api/benchmarks or MongoDB query) is ALWAYS
 * the first priority. These definitions serve strictly as initial seed data and offline fallbacks.
 */
export const FALLBACK_BENCHMARK_PROFILES: Record<string, BenchmarkProfile> = {
  spiderman2: {
    id: "spiderman2",
    name: "Marvel's Spider-Man 2",
    publisher: "Insomniac Games / PlayStation",
    releaseYear: "2024 PC Edition",
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
      { name: "NVIDIA DLSS 4", desc: "Super Resolution & Ray Reconstruction", active: true },
      { name: "DLSS Frame Generation", desc: "2x Frame Interpolation", active: true },
      { name: "NVIDIA Reflex", desc: "Low Latency Input Pass-Through", active: true },
      { name: "Full Ray Tracing", desc: "Ray-Traced Reflections & Ambient Occlusion", active: true }
    ],
    screenshots: [
      {
        src: "/games/SpiderMan_SS1.webp",
        title: "High-Speed Manhattan Traversal & Ray Tracing",
        desc: "Full Ray-Traced city reflections and ultra draw distance at 80 FPS with DLSS 4 Frame Generation (94% GPU Load, 6.5 GB / 8.0 GB VRAM)."
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
    api: "DirectX 11",
    score: 98,
    status: "VERIFIED BENCHMARK",
    preset: "Ultra Settings",
    overview: "Set in the sun-drenched metropolis of Los Santos and Blaine County, GTA V follows retired bank robber Michael, unhinged dealer Trevor, and street hustler Franklin as they execute high-stakes heists while dodging corrupt federal agents.",
    detailedOverview: {
      story: "Set in the expansive metropolis of Los Santos and Blaine County, Grand Theft Auto V weaves the intertwined lives of three distinct criminals: Michael De Santa, a former bank robber living in witness protection; Trevor Philips, a chaotic and volatile arms runner; and Franklin Clinton, a young street hustler aiming for high-end score opportunities. Dragged back into the criminal underworld by corrupted federal agents and dangerous cartels, the trio must pull off a series of complex, high-stakes heists to secure their freedom and fortune.",
      gameplayLoop: "Freely explore a massive open-world sandbox, engage in multi-stage heist missions, customize vehicles and weaponry, run criminal enterprises, and switch dynamically between three protagonists during missions and free-roam.",
      keyMechanics: [
        { name: "Three-Protagonist Dynamic Switching", desc: "Seamlessly switch between Michael, Franklin, and Trevor during heists to manage snipers, getaway drivers, and assault teams in real time." },
        { name: "Multi-Stage Heist Planning", desc: "Plan major robberies by selecting approach vectors (Smart vs. Loud), hiring crew members with distinct skill/cut ratios, and setting up prep missions." },
        { name: "Special Character Abilities", desc: "Michael triggers bullet-time precision marksmanship; Franklin slows time while driving for high-speed maneuvers; Trevor enters a berserk rage with reduced damage and boosted firepower." },
        { name: "Enhanced Graphics & Dynamic Sandbox", desc: "Features Percentage Closer Soft Shadows (PCSS), enhanced foliage density, high-resolution textures, and a living open-world AI simulation." }
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
      rtx40: "Ultra Preset + Ultra Textures + Extended Draw Distance",
      rtx30: "High Preset + Soft Shadows + Reflex",
      gtx: "Maxed Standard + NVIDIA Reflex Low Latency"
    },
    features: [
      { name: "DirectX 11 / Native API", desc: "High-Resolution Geometry & Volumetric Shading", active: true },
      { name: "NVIDIA DLSS 4", desc: "Deep Learning Super Sampling Super Resolution", active: true },
      { name: "NVIDIA Reflex", desc: "Low Latency Input Optimization", active: true },
      { name: "High-FPS Engine", desc: "Optimized Multi-Core Threading (190+ FPS)", active: true }
    ],
    screenshots: [
      {
        src: "/games/GTA_V_SS1.webp",
        title: "Los Santos Highway High-Speed Telemetry",
        desc: "High-speed highway rendering at 193 FPS with enhanced volumetric lighting and DLSS 4 (88% GPU Load, 4.56 GB / 8.0 GB VRAM)."
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
      { name: "NVIDIA DLSS 4", desc: "Super Resolution & Anti-Aliasing", active: true },
      { name: "DLSS Frame Generation", desc: "2x Frame Rate Boost", active: true },
      { name: "NVIDIA Reflex", desc: "Low Latency Input Pass-Through", active: true },
      { name: "Exclusive Fullscreen ETW", desc: "Hardware ETW Hook & Direct DXGI Telemetry", active: true }
    ],
    screenshots: [
      {
        src: "/games/Tsushima_SS1.webp",
        title: "Tsushima Island Traversal & Hardware Telemetry",
        desc: "High-fidelity rendering across feudal Japan at 107 FPS with DLSS 4 Frame Generation (96% GPU Load, 5.3 GB / 8.0 GB VRAM)."
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
    api: "DirectX 11",
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
      { name: "Temporal Anti-Aliasing (TAA)", desc: "Temporal Anti-Aliasing for smooth edge gradients", active: true },
      { name: "NVIDIA Reflex", desc: "Low Latency Input Pass-Through", active: true },
      { name: "Dynamic Night Lighting", desc: "Neon Shader Simulation & Screen Space Reflections", active: true }
    ],
    screenshots: [
      {
        src: "/games/NFSHeat_SS1.webp",
        title: "Cape Castille Rain Race & Max-Load GPU Telemetry",
        desc: "Wet weather grid racing captured at 63 FPS with TAA active (100% GPU utilization, 53W power draw, 2.76 GB / 8.0 GB VRAM)."
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
      { name: "Temporal Anti-Aliasing (TAA)", desc: "Temporal Anti-Aliasing for smooth image scaling", active: true },
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
  },
  thelastofus: {
    id: "thelastofus",
    name: "The Last of Us™ Part I",
    publisher: "PlayStation / Naughty Dog",
    releaseYear: "2023 PC Edition",
    genre: "Action-Adventure / Survival Horror",
    api: "DirectX 12",
    score: 99,
    status: "VERIFIED & OPTIMAL",
    preset: "Ultra / DLSS Quality",
    overview: "Set in a post-apocalyptic America ravaged by the Cordyceps fungal outbreak, hardened smuggler Joel is tasked with escorting 14-year-old Ellie across quarantine zones and brutal survivor factions in an emotional quest for a vaccine.",
    detailedOverview: {
      story: "Twenty years after a fungal pandemic transforms infected humans into aggressive, mutated creatures and destroys civilization, hardened black-market smuggler Joel is tasked with escorting 14-year-old Ellie out of an authoritarian military Quarantine Zone in Boston. Discovering that Ellie harbors an unprecedented immunity to the Cordyceps brain infection, Joel embarks on a perilous cross-country journey to reach the Fireflies' research lab, confronting infected monstrosities, ruthless bandit hunters, and the heavy moral weight of survival.",
      gameplayLoop: "Explore atmospheric post-pandemic ruins, scavenge crafting materials and ammunition, utilize dynamic stealth and Listen Mode to track enemy patrols, execute brutal melee takedowns or gunfights, and solve traversal puzzles alongside Ellie.",
      keyMechanics: [
        { name: "Dynamic Stealth & Listen Mode", desc: "Crouch-walk through hostile territory utilizing acoustic perception to locate Clickers and human hunters through walls and dense cover." },
        { name: "Real-Time Backpack Crafting", desc: "Scavenge alcohol, cloth, blades, and explosive powder in real time to assemble shivs, medkits, smoke bombs, and nail bombs under pressure." },
        { name: "Cordyceps Mutation AI Behaviors", desc: "Adapt tactical combat against distinct infected tiers — blind sound-sensitive Clickers, aggressive Runners, ambush Stalkers, and armored Bloaters." },
        { name: "Workbench Upgrades & Ballistics", desc: "Customize firearms with salvaged parts and tools to improve weapon sway, reload speed, fire rate, and holster capacity." }
      ]
    },
    testedSpecs: {
      gpu: "NVIDIA GeForce RTX Series / GTX Series",
      resolution: "1080p FHD / 1440p QHD",
      avgFps: "131 FPS",
      vramUsed: "6.16 GB / 8.0 GB",
      latency: "11.8 ms",
      gpuLoad: "85%"
    },
    presets: {
      rtx40: "Ultra Preset + DLSS Quality + Reflex Low Latency",
      rtx30: "High Preset + DLSS Balanced + Reflex",
      gtx: "Medium / High Preset + FSR 3 / XeSS (6.1 GB VRAM Opt)"
    },
    features: [
      { name: "NVIDIA DLSS 4", desc: "Super Resolution & Ray Reconstruction", active: true },
      { name: "NVIDIA Reflex", desc: "Low Latency Input Pass-Through", active: true },
      { name: "DirectX 12 Engine", desc: "High-Poly Geometric Shading & Volumetric Lighting", active: true },
      { name: "VRAM Memory Management", desc: "Optimized 6.16 GB Memory Footprint at Ultra Settings", active: true }
    ],
    screenshots: [
      {
        src: "/games/TheLastOfUs_SS1.webp",
        title: "Suburban Dawn Traversal & Hardware Telemetry",
        desc: "Open-world overgrown suburb exploration captured at 131 FPS with 6.16 GB VRAM allocation (96% CPU Load, 59°C GPU temperature, 98% Excellent stability rating)."
      },
      {
        src: "/games/TheLastOfUs_SS2.webp",
        title: "Cinematic Dialogue & GPU Load Verification",
        desc: "In-engine cinematic truck dialogue captured at 72 FPS with 71% GPU utilization (54W GPU power draw, 6.26 GB VRAM footprint, 98% Excellent system health)."
      },
      {
        src: "/games/TheLastOfUs_SS3.webp",
        title: "Lincoln Escape Push & Hardware Telemetry",
        desc: "Joel and Bill collaborative vehicle push sequence captured at 84 FPS under 85% GPU load (60W power draw, 6.16 GB VRAM allocation, 98% stability)."
      },
      {
        src: "/games/TheLastOfUs_SS4.webp",
        title: "High-Intensity Combat & Motion Blur Telemetry",
        desc: "Fast-paced Infected encounter captured at 76 FPS with 65% GPU load (52W power draw, 6.26 GB VRAM allocation, 94% CPU threading)."
      }
    ]
  },
  firstlight: {
    id: "firstlight",
    name: "007 First Light",
    publisher: "IO Interactive / MGM",
    releaseYear: "2025 Edition",
    genre: "Espionage Action / Tactical Stealth",
    api: "DirectX 12 Ultimate",
    score: 99,
    status: "VERIFIED & OPTIMAL",
    preset: "Ultra / DLSS 4.5",
    overview: "Step into the early career of MI6 recruit James Bond in a cinematic origin story combining tactical stealth, high-speed Aston Martin pursuits, and lethal espionage operations across the Mediterranean.",
    detailedOverview: {
      story: "Step into the early clandestine career of James Bond as an ambitious MI6 recruit fighting to earn his 00 status. Under the rigorous tactical tutelage of senior instructor Monroe and elite operative driver Cressida, Bond is deployed on high-stakes covert operations across the Mediterranean. When a global intelligence network is compromised from within, Bond must navigate treacherous international espionage, covert syndicate alliances, and deadly enforcers to prevent a geopolitical catastrophe.",
      gameplayLoop: "Execute high-stakes espionage operations combining social stealth, adaptive disguise protocols, tactical Q-branch gadget reconnaissance, visceral close-quarters combat, and high-speed Aston Martin DBS pursuit sequences across open Mediterranean environments.",
      keyMechanics: [
        { name: "Social Stealth & Disguise Protocol", desc: "Blend seamlessly into hostile high-society galas and covert security checkpoints utilizing adaptive disguises, deceptive dialogue options, and social engineering." },
        { name: "Aston Martin DBS High-Pursuit Driving", desc: "Engage in high-speed tactical vehicular chases and drifts across Mediterranean coastal cliffside roads with pursuit counter-measures." },
        { name: "Clandestine Reconnaissance & Q-Gadgets", desc: "Infiltrate fortified syndicates using covert surveillance devices, directional acoustic sensors, and non-lethal electronic warfare tools." },
        { name: "Precision CQC & Lethal Ballistics", desc: "Fluidly transition between close-quarters judo disarms, human-shield manipulation, and suppressed Walther PPK headshot marksmanship." }
      ]
    },
    testedSpecs: {
      gpu: "NVIDIA GeForce RTX Series / GTX Series",
      resolution: "1080p FHD (1920 x 1080)",
      avgFps: "142 FPS",
      vramUsed: "4.5 GB / 8.0 GB",
      latency: "11.2 ms",
      gpuLoad: "97%"
    },
    presets: {
      rtx40: "Ultra Settings + DLSS 4.5 Quality + Frame Generation",
      rtx30: "High Settings + DLSS Quality + Reflex Low Latency",
      gtx: "Medium / High Settings + FSR 3 / XeSS (4.4 GB VRAM Opt)"
    },
    features: [
      { name: "NVIDIA DLSS 4.5", desc: "Super Resolution & Ray Reconstruction", active: true },
      { name: "DLSS Frame Generation", desc: "2x AI Frame Interpolation with Sub-Frame Latency", active: true },
      { name: "NVIDIA Reflex", desc: "Ultra-Low Latency Input Pass-Through", active: true },
      { name: "Full Ray Tracing", desc: "Real-Time Path Tracing & Screen-Space GI", active: true }
    ],
    screenshots: [
      {
        src: "/games/FirstLight_SS1.webp",
        title: "Coastal Infiltration & Hardware Telemetry",
        desc: "Coastal training facility traversal captured at 132 FPS (92 FPS 1% Low) with 4.4 GB VRAM allocation (96% GPU load, 79°C GPU temperature, 75% Good stability rating)."
      },
      {
        src: "/games/FirstLight_SS2.webp",
        title: "Aston Martin DBS Arrival & Dynamic Particle Shading",
        desc: "High-speed drift entry captured at 131 FPS (90 FPS 1% Low) with 97% GPU load (72W GPU power draw, 4.4 GB VRAM footprint, 81°C GPU temp)."
      },
      {
        src: "/games/FirstLight_SS3.webp",
        title: "Tactical Briefing & Peak Framerate Telemetry",
        desc: "Close dialogue sequence captured at peak 176 FPS (87 FPS 1% Low) under 97% GPU load (73W power draw, 4.5 GB VRAM allocation, 17.6 GB system RAM)."
      },
      {
        src: "/games/FirstLight_SS4.webp",
        title: "Aston Martin DBS Deployment & Volumetric Lighting",
        desc: "Vehicular mission launch sequence captured at 128 FPS (94 FPS 1% Low) with 97% GPU load (76W power draw, 4.5 GB VRAM allocation, 42W CPU load)."
      }
    ],
    storeRating: "4.9 ★★★★★",
    dlssVersion: "DLSS 4.5"
  }
};

export const BENCHMARK_PROFILES: Record<string, BenchmarkProfile> = FALLBACK_BENCHMARK_PROFILES;

export const FALLBACK_TESTED_GAMES_LIST: TestedGameSummary[] = [
  {
    id: "firstlight",
    name: "007 First Light",
    publisher: "IO Interactive / MGM",
    genre: "Espionage Action / Tactical Stealth",
    preset: "Ultra / DLSS 4.5",
    keyTech: ["DLSS 4.5", "Frame Gen", "Reflex", "Ray Tracing"],
    status: "VERIFIED BENCHMARK",
    fps: "142 FPS",
    vram: "4.5 GB / 8.0 GB",
    gpuLoad: "97%",
    latency: "11.2 ms",
    api: "DirectX 12 Ultimate",
    coverImage: "/games/FirstLight_SS1.webp",
    gameplayGif: "/games/FirstLight_SS1.webp",
    storeRating: "4.9 ★★★★★",
    dlssVersion: "DLSS 4.5"
  },
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
    api: "DirectX 12 Ultimate",
    coverImage: "/games/SpiderMan_SS1.webp",
    gameplayGif: "/games/SpiderMan_SS1.webp",
    storeRating: "4.9 ★★★★★",
    dlssVersion: "DLSS 4"
  },
  {
    id: "thelastofus",
    name: "The Last of Us™ Part I",
    publisher: "PlayStation / Naughty Dog",
    genre: "Action-Adventure / Survival Horror",
    preset: "Ultra / DLSS",
    keyTech: ["DLSS 4", "DirectX 12", "Reflex", "VRAM Opt"],
    status: "VERIFIED BENCHMARK",
    fps: "131 FPS",
    vram: "6.16 GB / 8.0 GB",
    gpuLoad: "85%",
    latency: "11.8 ms",
    api: "DirectX 12",
    coverImage: "/games/TheLastOfUs_SS1.webp",
    gameplayGif: "/games/TheLastOfUs_SS1.webp",
    storeRating: "4.9 ★★★★★",
    dlssVersion: "DLSS 4"
  },
  {
    id: "gtav",
    name: "Grand Theft Auto V Enhanced",
    publisher: "Rockstar Games",
    genre: "Open World / Action",
    preset: "Ultra Settings",
    keyTech: ["DLSS 4", "Soft Shadows", "Reflex", "High FPS"],
    status: "VERIFIED BENCHMARK",
    fps: "193 FPS",
    vram: "4.56 GB / 8.0 GB",
    gpuLoad: "88%",
    latency: "12.4 ms",
    api: "DirectX 11",
    coverImage: "/games/GTA_V_SS1.webp",
    gameplayGif: "/games/GTA_V_SS1.webp",
    storeRating: "4.8 ★★★★★",
    dlssVersion: "DLSS 4"
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
    api: "DirectX 12 Ultimate",
    coverImage: "/games/Tsushima_SS1.webp",
    gameplayGif: "/games/Tsushima_SS1.webp",
    storeRating: "4.9 ★★★★★",
    dlssVersion: "DLSS 4"
  },
  {
    id: "nfsheat",
    name: "Need For Speed Heat",
    publisher: "Electronic Arts",
    genre: "Arcade Racing / Open World",
    preset: "Ultra Frostbite",
    keyTech: ["Frostbite 3", "Reflex", "TAA", "Night Heat Shaders"],
    status: "VERIFIED BENCHMARK",
    fps: "73 FPS",
    vram: "2.76 GB / 8.0 GB",
    gpuLoad: "100%",
    latency: "13.5 ms",
    api: "DirectX 11",
    coverImage: "/games/NFSHeat_SS1.webp",
    gameplayGif: "/games/NFSHeat_SS1.webp",
    storeRating: "4.7 ★★★★★",
    dlssVersion: "TAA"
  },
  {
    id: "thedivision",
    name: "Tom Clancy's The Division",
    publisher: "Ubisoft",
    genre: "Tactical Shooter / Action RPG",
    preset: "Ultra Snowdrop",
    keyTech: ["TAA", "DirectX 12", "Reflex", "Volumetric Snow"],
    status: "VERIFIED BENCHMARK",
    fps: "94 FPS",
    vram: "3.26 GB / 8.0 GB",
    gpuLoad: "100%",
    latency: "10.6 ms",
    api: "DirectX 12",
    coverImage: "/games/TomClancyThe Division_SS1.webp",
    gameplayGif: "/games/TomClancyThe Division_SS1.webp",
    storeRating: "4.6 ★★★★☆",
    dlssVersion: "TAA"
  }
];

export const TESTED_GAMES_LIST: TestedGameSummary[] = FALLBACK_TESTED_GAMES_LIST;

// Live in-memory cache populated from database (first priority)
let liveProfilesCache: Record<string, BenchmarkProfile> | null = null;
let liveTestedGamesCache: TestedGameSummary[] | null = null;

/**
 * Updates the live in-memory cache from database fetch results.
 */
export function updateLiveBenchmarks(
  profiles: Record<string, BenchmarkProfile>,
  testedGames: TestedGameSummary[]
): void {
  liveProfilesCache = profiles;
  liveTestedGamesCache = testedGames;
}

/**
 * Returns live tested games if fetched from database, otherwise static fallback.
 */
export function getLiveTestedGames(): TestedGameSummary[] {
  return liveTestedGamesCache || TESTED_GAMES_LIST;
}

/**
 * Returns live benchmark profiles if fetched from database, otherwise static fallback.
 */
export function getLiveBenchmarkProfiles(): Record<string, BenchmarkProfile> {
  return liveProfilesCache || BENCHMARK_PROFILES;
}

/**
 * Fetches all benchmarks with database as the primary source of truth.
 * Falls back to offline static defaults only if database/network is unreachable.
 */
export async function fetchBenchmarks(): Promise<{
  profiles: Record<string, BenchmarkProfile>;
  testedGames: TestedGameSummary[];
}> {
  try {
    const res = await fetch("/api/benchmarks", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.profiles && data.testedGames && data.testedGames.length > 0) {
        liveProfilesCache = data.profiles;
        liveTestedGamesCache = data.testedGames;
        return {
          profiles: data.profiles,
          testedGames: data.testedGames,
        };
      }
    }
  } catch (e) {
    console.warn("[benchmarks.ts] Failed to fetch benchmarks from database, using fallback:", e);
  }

  return {
    profiles: liveProfilesCache || BENCHMARK_PROFILES,
    testedGames: liveTestedGamesCache || TESTED_GAMES_LIST,
  };
}

/**
 * Fetches a single benchmark profile by ID, prioritizing database data.
 */
export async function fetchBenchmarkProfileById(id: string): Promise<BenchmarkProfile> {
  // Check live cache first
  if (liveProfilesCache && liveProfilesCache[id]) {
    return liveProfilesCache[id];
  }

  try {
    const res = await fetch(`/api/benchmarks?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data && !data.error && data.id) {
        if (!liveProfilesCache) liveProfilesCache = { ...BENCHMARK_PROFILES };
        liveProfilesCache[id] = data;
        return data;
      }
    }
  } catch (e) {
    console.warn(`[benchmarks.ts] Failed to fetch benchmark ${id} from database, using fallback:`, e);
  }

  return getBenchmarkProfileById(id);
}

/**
 * Returns all benchmark profiles, checking live database cache first.
 */
export function getAllBenchmarkProfiles(): BenchmarkProfile[] {
  if (liveProfilesCache && Object.keys(liveProfilesCache).length > 0) {
    return Object.values(liveProfilesCache);
  }
  return Object.values(BENCHMARK_PROFILES);
}

/**
 * Returns a benchmark profile by ID, checking live database cache first.
 */
export function getBenchmarkProfileById(id: string): BenchmarkProfile {
  if (liveProfilesCache && liveProfilesCache[id]) {
    return liveProfilesCache[id];
  }
  return (
    BENCHMARK_PROFILES[id] ||
    (liveProfilesCache ? Object.values(liveProfilesCache)[0] : null) ||
    Object.values(BENCHMARK_PROFILES)[0] ||
    BENCHMARK_PROFILES.firstlight
  );
}
