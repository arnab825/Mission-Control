export interface ApiEndpointExample {
  method: "GET" | "POST";
  path: string;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  pool: "Catalog Pool (:8811/:8812)" | "Node Pool (:8821/:8822)" | "Gateway (:8800)";
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  responseBody: any;
}

export const API_EXAMPLES: ApiEndpointExample[] = [
  {
    method: "GET",
    path: "/api/games/discover?q=Assassin's Creed Mirage&limit=5",
    name: "Discover Games from Web",
    badge: "Web Discovery",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    description:
      "Performs real-time parallel harvesting across Steam, Epic Games, GOG, and RAWG. Normalizes titles, resolves official CDN artwork, and triggers asynchronous LLM genre taxonomy classification.",
    pool: "Catalog Pool (:8811/:8812)",
    responseBody: {
      success: true,
      query: "Assassin's Creed Mirage",
      total_found: 1,
      results: [
        {
          id: "assassins-creed-mirage",
          title: "Assassin's Creed Mirage",
          developer: "Ubisoft Bordeaux",
          publisher: "Ubisoft",
          release_date: "2024-10-17",
          primary_genre: "Stealth Action",
          genres: ["Stealth", "Action Adventure", "Parkour", "Historical"],
          tags: ["Open World", "Story Rich", "Assassins", "Singleplayer"],
          store: "Steam",
          store_app_id: "3035570",
          cover_url:
            "https://cdn.cloudflare.steamstatic.com/steam/apps/3035570/library_600x900_2x.jpg",
          banner_url: "https://cdn.cloudflare.steamstatic.com/steam/apps/3035570/header.jpg",
          in_catalog: true,
          ai_classified: true,
          launchers: ["Steam", "Ubisoft Connect", "Epic Games"],
          store_availability: {
            steam: { available: true, store_app_id: "3035570" },
            ubisoft: { available: true, store_app_id: "ubi-ac-mirage" },
          },
        },
      ],
      cached: true,
      compute_credits_used: 0,
    },
  },
  {
    method: "POST",
    path: "/api/nodes/register",
    name: "Register Hardware Node",
    badge: "Cluster Mesh",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    description:
      "Connects a local PC or handheld to the cluster. Stores host telemetry, IP resolution, CPU/GPU capabilities, and physical storage capacity.",
    pool: "Node Pool (:8821/:8822)",
    requestBody: {
      name: "Desktop-Battlestation",
      hostname: "ROG-TITAN-X",
      ip: "192.168.1.142",
      os: "Windows 11 Pro 64-bit (23H2)",
      specs: {
        cpu: "AMD Ryzen 9 7950X3D (16 Cores, 32 Threads)",
        gpu: "NVIDIA GeForce RTX 4090 (24GB GDDR6X)",
        ram_gb: 64,
      },
      storage_total_gb: 4096,
      storage_free_gb: 1840,
      auth_token: "node_sec_example_mock_token",
    },
    responseBody: {
      success: true,
      node_id: "node_774a10fc",
      status: "online",
      heartbeat_interval_sec: 15,
      offline_timeout_sec: 45,
      message: "Node registered to cluster. Awaiting initial launcher sync.",
    },
  },
  {
    method: "POST",
    path: "/api/nodes/node_774a10fc/sync",
    name: "Sync Node Game Installations",
    badge: "Manifest Crawl",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    description:
      "Transmits parsed local launcher manifests (.acf, .item, SQLite) to link local game files with master canonical records.",
    pool: "Node Pool (:8821/:8822)",
    requestBody: {
      node_id: "node_774a10fc",
      games_count: 24,
      installations: [
        {
          game_id: "assassins-creed-mirage",
          store: "Steam",
          install_path: "D:\\SteamLibrary\\steamapps\\common\\Assassin's Creed Mirage",
          size_bytes: 41249780000,
          executable: "ACMirage.exe",
          last_played: "2026-09-08T18:30:00Z",
        },
      ],
    },
    responseBody: {
      success: true,
      synced_games: 24,
      linked_canonical: 24,
      cluster_installations_total: 68,
      timestamp: "2026-09-10T05:45:00Z",
    },
  },
  {
    method: "GET",
    path: "/api/library/stats",
    name: "Cluster-Wide Library Telemetry",
    badge: "Mesh Stats",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    description:
      "Aggregates total games, total distinct installed titles, active cluster nodes, and free storage capacity across all connected hardware.",
    pool: "Node Pool (:8821/:8822)",
    responseBody: {
      total_canonical_games: 1042,
      total_active_nodes: 3,
      total_installed_games: 68,
      total_cluster_storage_gb: 8192,
      free_cluster_storage_gb: 3410,
      nodes: [
        {
          id: "node_774a10fc",
          name: "Desktop-Battlestation",
          status: "online",
          installed_count: 38,
          last_seen_seconds_ago: 3,
        },
        {
          id: "node_882b99ea",
          name: "Razer-Blade-Laptop",
          status: "online",
          installed_count: 18,
          last_seen_seconds_ago: 8,
        },
        {
          id: "node_114c00ab",
          name: "Steam-Deck-OLED",
          status: "online",
          installed_count: 12,
          last_seen_seconds_ago: 12,
        },
      ],
    },
  },
  {
    method: "GET",
    path: "/cluster/status",
    name: "Cluster Load Balancer HUD",
    badge: "Load Balancer",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    description:
      "Real-time gateway status reporting instance health, latency metrics, upstream pool round-robin state, and memory allocations.",
    pool: "Gateway (:8800)",
    responseBody: {
      gateway: { status: "healthy", port: 8800, uptime_seconds: 482910 },
      pools: {
        catalog_discovery: {
          strategy: "round-robin",
          active_instances: 2,
          targets: [
            { url: "http://127.0.0.1:8811", healthy: true, latency_ms: 2.1 },
            { url: "http://127.0.0.1:8812", healthy: true, latency_ms: 1.9 },
          ],
        },
        user_library_sync: {
          strategy: "round-robin",
          active_instances: 2,
          targets: [
            { url: "http://127.0.0.1:8821", healthy: true, latency_ms: 0.8 },
            { url: "http://127.0.0.1:8822", healthy: true, latency_ms: 0.7 },
          ],
        },
      },
      database: { tier: 1, provider: "Supabase PostgreSQL", fallback_sqlite_ready: true },
    },
  },
];
