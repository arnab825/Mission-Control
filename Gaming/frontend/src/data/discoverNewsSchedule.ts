import type { NewsItem } from '../types/discover';

// ISO Week Calculation Helper (Syncs to Monday-to-Sunday weekly editorial cadence)
export function getISOWeekInfo(d: Date = new Date()): {
  year: number;
  week: number;
  key: string;
  month: number;
  monthName: string;
} {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return {
    year: date.getUTCFullYear(),
    week: weekNo,
    key: `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`,
    month: d.getMonth() + 1,
    monthName: monthNames[d.getMonth()] || 'November'
  };
}

// 12-Month Thematic Schedule for Monthly Cadence & Directives
export const MONTHLY_THEMES_SCHEDULE: Array<{ month: string; theme: string; focus: string; topics: string[] }> = [
  {
    month: 'January',
    theme: 'CES Innovations & New-Year Hardware Horizon',
    focus: 'Next-gen GPUs, mobile processors, high-refresh OLED gaming displays, and year-opening hardware reveals.',
    topics: ['CES Tech', 'RTX Mobile', 'Ryzen AI', 'OLED Monitors', 'Steam Winter Sale']
  },
  {
    month: 'February',
    theme: 'Engine Architectures & Steam Next Fest Discoveries',
    focus: 'Unreal Engine 5 advancements, DLSS frame generation improvements, indie breakout demos, and tactical esports.',
    topics: ['Unreal Engine 5', 'DLSS 4', 'Next Fest', 'Frame Generation', 'Indie Breakthroughs']
  },
  {
    month: 'March',
    theme: 'GDC Developer Insights & Spring Game Launches',
    focus: 'Game Developers Conference tech keynotes, DirectX 12 Agility, Vulkan updates, and spring blockbuster titles.',
    topics: ['GDC Keynotes', 'DirectX 12', 'Vulkan 1.4', 'Mesh Shading', 'Soulslike']
  },
  {
    month: 'April',
    theme: 'Ray Tracing Showcases & High-Fidelity Worlds',
    focus: 'Full path tracing, volumetric lighting, photorealistic rendering benchmarks, and CPU bottleneck evaluations.',
    topics: ['Path Tracing', 'Alan Wake 2', 'Ray Reconstruction', 'Ryzen X3D', 'Reflex']
  },
  {
    month: 'May',
    theme: 'Co-Op Survival & Community Modding Revolutions',
    focus: 'Multiplayer co-op survival, modding frameworks, open-world overhauls, and Linux / Steam Deck performance.',
    topics: ['Co-Op Survival', 'Cyberpunk Mods', 'Steam Deck', 'Proton 9', 'Helldivers']
  },
  {
    month: 'June',
    theme: 'Mid-Year Global Showcases & Summer Sales',
    focus: 'Summer Game Fest world premieres, major publisher showcases, PC gaming announcements, and Steam Summer Sale.',
    topics: ['Summer Game Fest', 'Xbox Showcase', 'Steam Summer Sale', 'World Premieres', '4K Gaming']
  },
  {
    month: 'July',
    theme: 'Simulations, Strategy & Handheld PC Gaming',
    focus: 'Deep tactical grand strategy, fleet command simulators, handheld optimizations, and competitive balance patches.',
    topics: ['Civilization VII', 'Manor Lords', 'ROG Ally', 'Simulation', 'Strategy']
  },
  {
    month: 'August',
    theme: 'Gamescom Europe & Flagship Previews',
    focus: 'Consumer hands-on demos from Cologne, upcoming fall hardware architectures, and European developer spotlights.',
    topics: ['Gamescom Reveals', 'Hardware Demos', 'Hands-On Previews', 'Indie Booths', 'Black Myth']
  },
  {
    month: 'September',
    theme: 'Tokyo Game Show & JRPG Masterpieces',
    focus: 'Major Asian game studio debuts, Tokyo Game Show showcases, high-speed combat RPGs, and seasonal esports.',
    topics: ['Tokyo Game Show', 'Final Fantasy', 'Monster Hunter Wilds', 'Action RPG', 'Apex Meta']
  },
  {
    month: 'October',
    theme: 'Atmospheric Thrillers & Fall Tech Debuts',
    focus: 'Survival horror, psychological narrative adventures, Halloween festival events, and fall hardware architectures.',
    topics: ['Silent Hill', 'Survival Horror', 'RTX Flagships', 'Resident Evil', 'Psychological']
  },
  {
    month: 'November',
    theme: 'Hardware Flagships & Black Friday Upgrades',
    focus: 'Next-gen flagship GPUs, PCIe 5.0 storage, Black Friday PC build optimizations, and early GOTY discussions.',
    topics: ['RTX 5090 / 5080', 'Blackwell Architecture', 'Black Friday Deals', 'NVMe Gen5', 'S.T.A.L.K.E.R. 2']
  },
  {
    month: 'December',
    theme: 'The Game Awards, GOTY Celebrations & Holiday Retrospective',
    focus: 'The Game Awards crowns, year-end game rankings, winter discount events, and a look ahead to next year.',
    topics: ['The Game Awards', 'GOTY Nominees', 'Steam Winter Sale', 'Year-End Tech', 'Best RPGs']
  }
];

export function getMonthInfo(d: Date = new Date()): {
  month: number;
  name: string;
  key: string;
  theme: { month: string; theme: string; focus: string; topics: string[] };
} {
  const month = d.getMonth() + 1;
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const name = monthNames[d.getMonth()] || 'November';
  const theme = MONTHLY_THEMES_SCHEDULE[d.getMonth()] || MONTHLY_THEMES_SCHEDULE[10];
  return {
    month,
    name,
    key: `${d.getFullYear()}-${String(month).padStart(2, '0')}`,
    theme
  };
}

// 52-Week Complete Thematic Schedule for Automatic Weekly Topic Rotation
export const WEEKLY_THEMES_SCHEDULE: Array<{ theme: string; topics: string[] }> = [
  // Q1: January - March (Weeks 1 - 13)
  { theme: 'Winter GOTY & Year-End Hardware Retrospective', topics: ['GOTY Awards', 'Steam Winter Sale', 'Best RPGs', 'GPU Price Drops'] }, // W01
  { theme: 'CES Keynotes & Next-Gen Mobile GPUs', topics: ['CES Tech', 'RTX Mobile', 'Ryzen AI', 'OLED Gaming Monitors'] }, // W02
  { theme: 'Ultra-High Refresh Gaming Displays & Fast IPS', topics: ['540Hz Displays', 'OLED Clarity', 'DisplayPort 2.1', 'HDR Calibration'] }, // W03
  { theme: 'Next-Gen Memory Architectures & PCIe 5.0 Storage', topics: ['DDR5 Clocks', 'PCIe Gen5 SSDs', 'DirectStorage', 'Load Times'] }, // W04
  { theme: 'Unreal Engine 5.5 & Next-Gen Physics Engines', topics: ['Unreal Engine 5.5', 'Nanite', 'Lumen', 'Substrate Materials'] }, // W05
  { theme: 'DLSS 4 Multi-Frame Gen & Neural Rendering', topics: ['DLSS 4', 'Frame Generation', 'Ray Reconstruction', 'NVIDIA Reflex'] }, // W06
  { theme: 'Steam Next Fest Demos & Indie Breakthroughs', topics: ['Next Fest', 'Indie Highlights', 'Roguelikes', 'Deckbuilders'] }, // W07
  { theme: 'Tactical Shooters & Esports Engine Tweaks', topics: ['Counter-Strike 2', 'Valorant', 'Warzone Meta', 'Apex Legends'] }, // W08
  { theme: 'PlayStation PC Ports & Sony Interactive', topics: ['PlayStation PC', 'God of War', 'Spider-Man', 'Ghost of Tsushima'] }, // W09
  { theme: 'GDC Architectures & Developer Insights', topics: ['GDC Keynotes', 'DirectX 12 Agility', 'Vulkan 1.4', 'Mesh Shading'] }, // W10
  { theme: 'Spring Release Blitz & Soulslike Highlights', topics: ['Elden Ring', 'Soulslike', 'Black Myth', 'Action Combat'] }, // W11
  { theme: 'Handheld PC Gaming & Linux Performance', topics: ['Steam Deck OLED', 'ROG Ally X', 'Proton 9', 'Legion Go'] }, // W12
  { theme: 'Open-World Action & Modding Communities', topics: ['Cyberpunk Mods', 'GTA VI Updates', 'Skyrim Overhauls', 'Witcher Next-Gen'] }, // W13

  // Q2: April - June (Weeks 14 - 26)
  { theme: 'CPU Bottlenecks, X3D V-Cache & Latency', topics: ['Ryzen 9000X3D', 'Core Ultra 200', '1% Lows', 'DDR5 Latency'] }, // W14
  { theme: 'Co-Op Survival, Crafting & Base Building', topics: ['Palworld', 'Enshrouded', 'Rust', 'Helldivers 2'] }, // W15
  { theme: 'Ray Tracing & Full Path Tracing Showcases', topics: ['Path Tracing', 'Alan Wake 2', 'Full RT', 'Shader Execution Reordering'] }, // W16
  { theme: 'Retro Remakes & Nostalgia Overhauls', topics: ['Resident Evil', 'Silent Hill 2', 'Metal Gear Solid', 'Dead Space'] }, // W17
  { theme: 'Early Access Breakthroughs & Community Roadmaps', topics: ['Early Access', 'Roadmap Updates', 'Indie Gems', 'Survival Crafting'] }, // W18
  { theme: 'Simulation, Strategy & Fleet Command', topics: ['Civilization VII', 'Manor Lords', 'Frostpunk 2', 'City Builders'] }, // W19
  { theme: 'VR & Immersive Sim Performance Tuning', topics: ['VR Simulators', 'Flight Simulator', 'Spatial Audio', 'Index 2'] }, // W20
  { theme: 'Linux Gaming Ecosystem & Proton Experimental', topics: ['Proton Experimental', 'Vulkan Shaders', 'SteamOS', 'Wine 9'] }, // W21
  { theme: 'Summer Showcase Hype & Worldwide Teasers', topics: ['Showcase Teasers', 'E3 Legacy', 'World Premieres', 'Publisher Briefings'] }, // W22
  { theme: 'Summer Game Fest & Official Premieres', topics: ['Summer Game Fest', 'Xbox Showcase', 'Capcom Spotlight', 'Devolver'] }, // W23
  { theme: 'Steam Summer Sale Blockbusters & Best Value Deals', topics: ['Steam Summer Sale', 'Deep Discounts', 'Bundle Deals', 'Steam Deck Verified'] }, // W24
  { theme: 'High Refresh Rate & 4K Ultra Visual Tiers', topics: ['240Hz OLED', '4K Ultra Gaming', 'DisplayPort 2.1', 'HDR10+'] }, // W25
  { theme: 'Mid-Year Gaming Milestones & Community Metas', topics: ['Mid-Year GOTY', 'Community Metas', 'Patch 2.0 Overhauls', 'Player Counts'] }, // W26

  // Q3: July - September (Weeks 27 - 39)
  { theme: 'Space Exploration & Sci-Fi Epics', topics: ['Starfield', 'No Mans Sky', 'Star Wars', 'Mass Effect'] }, // W27
  { theme: 'Racing Simulators, Wheels & Physics Fidelity', topics: ['Forza Horizon', 'Assetto Corsa', 'F1 Sim', 'Direct Drive'] }, // W28
  { theme: 'Handheld Battery & Low-Wattage Optimization', topics: ['TDP Tuning', '15W Gaming', 'Battery Life', 'FSR 3.1 Handheld'] }, // W29
  { theme: 'Roguelike & Indie Perfection Showcases', topics: ['Hades II', 'Balatro', 'Dead Cells', 'Vampire Survivors'] }, // W30
  { theme: 'Gamescom Europe Preview & Tech Demos', topics: ['Gamescom Preview', 'Koelnmesse', 'German Showcases', 'Playable Builds'] }, // W31
  { theme: 'Gamescom Reveals & Consumer Hardware Demos', topics: ['Gamescom Reveals', 'RTX 50 Tech', 'Hands-On Previews', 'Indie Booths'] }, // W32
  { theme: 'Fighting Games & Rollback Netcode Engineering', topics: ['Tekken 8', 'Street Fighter 6', 'Guilty Gear', 'Rollback Netcode'] }, // W33
  { theme: 'Autumn Frontier Releases & Flagship Launchers', topics: ['Black Myth: Wukong', 'Space Marine 2', 'Kingdom Come II', 'S.T.A.L.K.E.R. 2'] }, // W34
  { theme: 'Cyberpunk & Sci-Fi Worldbuilding Updates', topics: ['Cyberpunk 2077', 'Project Orion', 'Sci-Fi Lore', 'Photorealistic Mods'] }, // W35
  { theme: 'Tokyo Game Show & JRPG Spectacles', topics: ['Tokyo Game Show', 'Final Fantasy', 'Monster Hunter Wilds', 'Metaphor'] }, // W36
  { theme: 'Competitive Battle Royales & Season Passes', topics: ['Apex Season', 'Fortnite Chapter', 'Warzone Overhauls', 'The Finals'] }, // W37
  { theme: 'Action RPG Deep Dives & Loot Mechanics', topics: ['Path of Exile 2', 'Diablo IV', 'Titan Quest II', 'ARPG Seasons'] }, // W38
  { theme: 'Late Summer Optimization & Driver Updates', topics: ['GeForce Game Ready', 'AMD Adrenalin', 'Intel Arc Drivers', 'Stability Patches'] }, // W39

  // Q4: October - December (Weeks 40 - 52)
  { theme: 'Spooky Season Horrors & Psychological Thrillers', topics: ['Silent Hill', 'Resident Evil', 'Phasmophobia', 'Dead by Daylight'] }, // W40
  { theme: 'Halloween Game Events & Seasonal Overhauls', topics: ['Halloween Updates', 'Horror Indies', 'Co-op Terrors', 'Atmospheric Lighting'] }, // W41
  { theme: 'Fall Hardware Blockbusters & Architecture Previews', topics: ['RTX 50 Series', 'Blackwell Architecture', 'PCIe 5.0 GPUs', 'GDDR7'] }, // W42
  { theme: 'Next-Gen Game Engines & Audio Physics', topics: ['Spatial Audio', 'Nanite Geometry', 'Destructible Environments', 'Chaos Physics'] }, // W43
  { theme: 'Flagship November Game Releases & Reviews', topics: ['S.T.A.L.K.E.R. 2', 'Civilization VII', 'Dragon Age', 'November Launches'] }, // W44
  { theme: 'GPU Architecture Benchmarks & Thermal Testing', topics: ['Thermal Throttling', 'Vapor Chambers', 'Undervolting', 'Frametime Pacing'] }, // W45
  { theme: 'Fall Hardware Blockbusters & Blackwell Architecture', topics: ['RTX 5090 / 5080', 'Blackwell Architecture', 'PCIe 5.0 GPUs', 'GDDR7'] }, // W46
  { theme: 'Black Friday Deals & System Build Guides', topics: ['Black Friday Sales', 'Best Budget GPUs', 'NVMe SSDs', 'Prebuilt Deals'] }, // W47
  { theme: 'Cyber Monday Peripherals & High-End Monitors', topics: ['Cyber Monday', 'Mechanical Keyboards', '4K OLEDs', 'Wireless Mice'] }, // W48
  { theme: 'The Game Awards Nominees & Predictions', topics: ['The Game Awards', 'GOTY Nominees', 'Best Narrative', 'Best Multiplayer'] }, // W49
  { theme: 'Game Awards World Premieres & Winter Teasers', topics: ['TGA Premieres', 'World Reveals', 'Surprise Drops', 'Winter Trailers'] }, // W50
  { theme: 'Steam Winter Sale & Community Favorites', topics: ['Steam Winter Sale', 'Steam Awards', 'Holiday Discounts', 'Winter Gaming'] }, // W51
  { theme: 'Annual Year-End Retrospective & Next-Gen Outlook', topics: ['Year-End Retrospective', 'Top 10 of the Year', 'Next Year Outlook', 'Hardware Future'] } // W52
];

export const CANDIDATE_ENTITIES = [
  'RTX 5090', 'RTX 5080', 'RTX 5070', 'Blackwell', 'Unreal Engine', 'DLSS 4', 'Path Tracing',
  'GTA VI', 'PlayStation', 'Xbox Game Pass', 'Steam Deck', 'Nintendo Switch',
  'Black Myth', 'Elden Ring', 'Cyberpunk', 'Final Fantasy', 'Monster Hunter',
  'Civilization', 'Helldivers', 'Space Marine', 'Silent Hill', 'Ryzen X3D',
  'S.T.A.L.K.E.R. 2', 'Dragon Age', 'GeForce NOW', 'DirectX 12', 'Vulkan'
];

// Format relative timestamps for news dispatches
export function getRelativeTime(pubDate: string): string {
  if (!pubDate) return '';
  const d = new Date(pubDate);
  if (isNaN(d.getTime())) return pubDate.split(' ').slice(0, 4).join(' ');
  const diffMs = Date.now() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Check if an article timestamp falls within a specific number of past days
export function isWithinPastDays(pubDate: string, days: number): boolean {
  if (!pubDate) return true;
  const d = new Date(pubDate);
  if (isNaN(d.getTime())) return true;
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  return d.getTime() >= cutoff;
}

// Dynamic fallback news baseline when completely offline
export function getDynamicFallbackNews(): NewsItem[] {
  const now = Date.now();
  return [
    {
      id: 'news-pcgamer-1',
      title: 'NVIDIA RTX 50 Blackwell Architecture: Next-Gen DLSS 4 & Neural Rendering Deep Dive',
      link: 'https://www.pcgamer.com/hardware/',
      description: 'Technical analysis of the 5th-gen Tensor Cores and multi-frame generation capabilities powering the upcoming GPU generation.',
      source: 'PC Gamer',
      category: 'Hardware',
      pubDate: new Date(now - 1000 * 60 * 45).toUTCString(),
    },
    {
      id: 'news-eurogamer-1',
      title: 'Unreal Engine 5.5 In-Game Performance Analysis & Nanite Mesh Shading Benchmarks',
      link: 'https://www.eurogamer.net/digitalfoundry',
      description: 'Digital Foundry breaks down the latest advancements in geometry caching and CPU overhead reduction for flagship PC titles.',
      source: 'Eurogamer',
      category: 'Gaming',
      pubDate: new Date(now - 3600000 * 3).toUTCString(),
    },
    {
      id: 'news-tomshardware-1',
      title: "Tom's Hardware: 3D V-Cache vs. Fast DDR5 Latency in Modern Open-World Games",
      link: 'https://www.tomshardware.com/reviews/cpu-hierarchy,4364.html',
      description: 'Evaluating frame-time consistency and 1% lows across dense urban traversal workloads in Cyberpunk 2077 and Black Myth: Wukong.',
      source: "Tom's Hardware",
      category: 'Hardware',
      pubDate: new Date(now - 3600000 * 8).toUTCString(),
    },
    {
      id: 'news-gamespot-1',
      title: 'Monster Hunter Wilds & S.T.A.L.K.E.R. 2: PC Performance Benchmarks & Settings Guide',
      link: 'https://www.gamespot.com/news/',
      description: 'Comprehensive graphics optimization guide for the most demanding PC releases of the season, from shader pre-compilation to ray tracing toggles.',
      source: 'GameSpot',
      category: 'Gaming',
      pubDate: new Date(now - 3600000 * 14).toUTCString(),
    },
    {
      id: 'news-ign-1',
      title: 'IGN: The Best PC Gaming Releases and Optimization Tweaks of the Month',
      link: 'https://www.ign.com/news',
      description: 'A comprehensive roundup of the latest patches, driver updates, and performance tuning configurations for top PC titles.',
      source: 'IGN',
      category: 'Gaming',
      pubDate: new Date(now - 3600000 * 22).toUTCString(),
    },
    {
      id: 'news-kotaku-1',
      title: 'Steam Deck & Handheld PC Gaming: The Definitive Battery Life & Settings Handbook',
      link: 'https://kotaku.com/',
      description: 'How modern frame-generation techniques and TDP limiters unlock playable 60 FPS on portable devices without draining battery.',
      source: 'Kotaku',
      category: 'Gaming',
      pubDate: new Date(now - 3600000 * 30).toUTCString(),
    },
    {
      id: 'news-rockpapershotgun-1',
      title: 'Rock Paper Shotgun: The Most Exciting PC Strategy & City Builders to Watch',
      link: 'https://www.rockpapershotgun.com/',
      description: 'From Manor Lords updates to Frostpunk 2 survival scenarios, here are the deepest simulation titles commanding player libraries.',
      source: 'Rock Paper Shotgun',
      category: 'PC Gaming',
      pubDate: new Date(now - 3600000 * 48).toUTCString(),
    }
  ];
}

export const FALLBACK_NEWS_ITEMS: NewsItem[] = getDynamicFallbackNews();
