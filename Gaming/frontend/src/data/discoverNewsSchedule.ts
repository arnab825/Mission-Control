import type { NewsItem } from '../types/discover';

// ISO Week Calculation Helper (Syncs to Monday-to-Sunday weekly editorial cadence)
export function getISOWeekInfo(d: Date = new Date()): { year: number; week: number; key: string } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return {
    year: date.getUTCFullYear(),
    week: weekNo,
    key: `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
  };
}

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

// 52-Week Thematic Schedule for Automatic Weekly Topic Rotation
export const WEEKLY_THEMES_SCHEDULE: Array<{ theme: string; topics: string[] }> = [
  { theme: 'Winter GOTY & Year-End Hardware Retrospective', topics: ['GOTY Awards', 'Steam Winter Sale', 'Best RPGs', 'GPU Price Drops'] },
  { theme: 'CES Keynotes & Next-Gen Mobile GPUs', topics: ['CES Tech', 'RTX Mobile', 'Ryzen AI', 'OLED Gaming Monitors'] },
  { theme: 'Unreal Engine 5.5 & Next-Gen Physics Engines', topics: ['Unreal Engine 5.5', 'Nanite', 'Lumen', 'Substrate Materials'] },
  { theme: 'DLSS 4 Multi-Frame Gen & Neural Rendering', topics: ['DLSS 4', 'Frame Generation', 'Ray Reconstruction', 'NVIDIA Reflex'] },
  { theme: 'Steam Next Fest Demos & Indie Breakthroughs', topics: ['Next Fest', 'Indie Highlights', 'Roguelikes', 'Deckbuilders'] },
  { theme: 'Open-World Action & Modding Communities', topics: ['Cyberpunk Mods', 'GTA VI Updates', 'Skyrim Overhauls', 'Witcher Next-Gen'] },
  { theme: 'Tactical Shooters & Esports Engine Tweaks', topics: ['Counter-Strike 2', 'Valorant', 'Warzone Meta', 'Apex Legends'] },
  { theme: 'PlayStation PC Ports & Sony Interactive', topics: ['PlayStation PC', 'God of War', 'Spider-Man', 'Ghost of Tsushima'] },
  { theme: 'GDC Architectures & Developer Insights', topics: ['GDC Keynotes', 'DirectX 12 Agility', 'Vulkan 1.4', 'Mesh Shading'] },
  { theme: 'Spring Release Blitz & Soulslike Highlights', topics: ['Elden Ring', 'Soulslike', 'Black Myth', 'Action Combat'] },
  { theme: 'Handheld PC Gaming & Linux Performance', topics: ['Steam Deck OLED', 'ROG Ally X', 'Proton 9', 'Legion Go'] },
  { theme: 'CPU Bottlenecks, X3D V-Cache & Latency', topics: ['Ryzen 9000X3D', 'Core Ultra 200', '1% Lows', 'DDR5 Latency'] },
  { theme: 'Co-Op Survival, Crafting & Base Building', topics: ['Palworld', 'Enshrouded', 'Rust', 'Helldivers 2'] },
  { theme: 'Ray Tracing & Full Path Tracing Showcases', topics: ['Path Tracing', 'Alan Wake 2', 'Full RT', 'Shader Execution Reordering'] },
  { theme: 'Retro Remakes & Nostalgia Overhauls', topics: ['Resident Evil', 'Silent Hill 2', 'Metal Gear Solid', 'Dead Space'] },
  { theme: 'Summer Showcase Season & World Premieres', topics: ['Summer Game Fest', 'Xbox Showcase', 'Capcom Spotlight', 'Devolver'] },
  { theme: 'High Refresh Rate & 4K Ultra Visual Tiers', topics: ['240Hz OLED', '4K Ultra Gaming', 'DisplayPort 2.1', 'HDR10+'] },
  { theme: 'Space Exploration & Sci-Fi Epics', topics: ['Starfield', 'No Mans Sky', 'Star Wars', 'Mass Effect'] },
  { theme: 'Simulation, Strategy & Fleet Command', topics: ['Civilization VII', 'Manor Lords', 'Frostpunk 2', 'City Builders'] },
  { theme: 'Gamescom Europe & Consumer Hardware Demos', topics: ['Gamescom Reveals', 'RTX 50 Tech', 'Hands-On Previews', 'Indie Booths'] },
  { theme: 'Autumn Frontier Releases & Flagship Launchers', topics: ['Black Myth: Wukong', 'Space Marine 2', 'Kingdom Come II', 'S.T.A.L.K.E.R. 2'] },
  { theme: 'Tokyo Game Show & JRPG Spectacles', topics: ['Tokyo Game Show', 'Final Fantasy', 'Monster Hunter Wilds', 'Metaphor'] },
  { theme: 'Competitive Battle Royales & Season Passes', topics: ['Apex Season', 'Fortnite Chapter', 'Warzone Overhauls', 'The Finals'] },
  { theme: 'Spooky Season Horrors & Psychological Thrillers', topics: ['Silent Hill', 'Resident Evil', 'Phasmophobia', 'Dead by Daylight'] },
  { theme: 'Fall Hardware Blockbusters & Blackwell Architecture', topics: ['RTX 5090 / 5080', 'Blackwell Architecture', 'PCIe 5.0 GPUs', 'GDDR7'] },
  { theme: 'Black Friday Deals & System Build Guides', topics: ['Black Friday Sales', 'Best Budget GPUs', 'NVMe SSDs', 'Prebuilt Deals'] },
  { theme: 'Game Awards Nominees & Winter Blockbusters', topics: ['The Game Awards', 'GOTY Nominees', 'Winter Premieres', 'Steam Holiday'] }
];

export const CANDIDATE_ENTITIES = [
  'RTX 5090', 'RTX 5080', 'Blackwell', 'Unreal Engine', 'DLSS 4', 'Path Tracing',
  'GTA VI', 'PlayStation', 'Xbox Game Pass', 'Steam Deck', 'Nintendo Switch',
  'Black Myth', 'Elden Ring', 'Cyberpunk', 'Final Fantasy', 'Monster Hunter',
  'Civilization', 'Helldivers', 'Space Marine', 'Silent Hill', 'Ryzen X3D'
];

export const FALLBACK_NEWS_ITEMS: NewsItem[] = [
  {
    id: 'news-pcgamer-1',
    title: 'NVIDIA RTX 50 Blackwell Architecture: Next-Gen DLSS 4 & Neural Rendering Deep Dive',
    link: 'https://www.pcgamer.com/hardware/',
    description: 'Technical analysis of the 5th-gen Tensor Cores and multi-frame generation capabilities powering the upcoming GPU generation.',
    source: 'PC Gamer',
    category: 'Hardware',
    pubDate: new Date().toUTCString(),
  },
  {
    id: 'news-eurogamer-1',
    title: 'Unreal Engine 5.5 In-Game Performance Analysis & Nanite Mesh Shading Benchmarks',
    link: 'https://www.eurogamer.net/digitalfoundry',
    description: 'Digital Foundry breaks down the latest advancements in geometry caching and CPU overhead reduction for flagship PC titles.',
    source: 'Eurogamer',
    category: 'Gaming',
    pubDate: new Date(Date.now() - 3600000 * 3).toUTCString(),
  },
  {
    id: 'news-tomshardware-1',
    title: "Tom's Hardware: 3D V-Cache vs. Fast DDR5 Latency in Modern Open-World Games",
    link: 'https://www.tomshardware.com/reviews/cpu-hierarchy,4364.html',
    description: 'Evaluating frame-time consistency and 1% lows across dense urban traversal workloads in Cyberpunk 2077 and Black Myth: Wukong.',
    source: "Tom's Hardware",
    category: 'Hardware',
    pubDate: new Date(Date.now() - 3600000 * 8).toUTCString(),
  },
  {
    id: 'news-ign-1',
    title: 'IGN: The Best PC Gaming Releases and Optimization Tweaks of the Month',
    link: 'https://www.ign.com/news',
    description: 'A comprehensive roundup of the latest patches, driver updates, and performance tuning configurations for top PC titles.',
    source: 'IGN',
    category: 'Gaming',
    pubDate: new Date(Date.now() - 3600000 * 20).toUTCString(),
  }
];
