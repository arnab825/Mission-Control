# 🌐 Mission Control — Web Platform (`Gaming/website`)

<p align="center">
  <img src="public/logo.png" width="80" alt="Mission Control Website Logo" />
</p>

The official high-performance web platform for **Mission Control**, built with Next.js 16 (App Router), TypeScript, Tailwind CSS, and MongoDB Atlas. It hosts the interactive game benchmark dataset, documentation center, community glitch tracker, and an automated AI-driven gaming news generation engine (`Gaming Intel`).

---

## ⚡ Key Features

- **📰 Automated AI Gaming Intel Blog Pipeline (`/api/blogs/generate`)**:
  - Automatically fetches real-time updates from 5 major RSS feeds: IGN, Kotaku, Eurogamer, AnandTech, and Tom's Hardware.
  - Generates technical gaming articles daily across 4 core categories: `GPU News`, `Game News`, `Hardware Deep-Dive`, and `Game Revisit`.
  - **3-Tier Failover LLM Pipeline**: Google Gemini (`gemini-3.8-flash`) ➔ Hugging Face (`Llama-3.1-8B-Instruct`) ➔ NVIDIA NIM (`meta/llama-3.2-11b-vision-instruct` / `nvidia/nemotron-3-super-120b-a12b`).
  - **4-Tier Image Failover Pipeline & Vercel Blob CDN**: Imagen 3 via Gemini ➔ Hugging Face (`FLUX.1-schnell`) ➔ Pollinations AI ➔ Fallback 3D PNG artwork assets. All generated media is persistently stored on Vercel Blob CDN (`BLOB_READ_WRITE_TOKEN`) to prevent serverless 404 errors.
  - **MongoDB Atlas Persistence**: Saves posts directly into MongoDB Atlas to guarantee zero content loss across serverless Vercel function lifecycles.
- **🎮 Interactive Game Benchmark Library**: Dynamic rendering of GPU performance profiles, CPU bottleneck metrics, story overviews, and gameplay mechanics across top titles.
- **📥 Dynamic OS-Dependent Download Router (`/api/download`)**: Automated HTTP User-Agent inspection serving native Windows installers (`.exe`, `.msi`, `.zip`) to Windows users and Linux packages (`.AppImage`, `.deb`, `.rpm`, `.tar.gz`) to Linux users.
- **🤖 Support Bot & AI Assistant (`/api/support/chat`)**: Real-time tactical assistant delivering hardware recommendations, system specifications, and troubleshooting guidance.
- **📚 Interactive Documentation Station (`/docs`)**: In-depth architecture guides, telemetry hooks, hotkeys, and API specifications.
- **📊 System Telemetry & Glitch Tracker**: Community bug tracking hub and live WebGL GPU hardware specs auto-detection.
- **🔍 Automated SEO & Schema**: Full JSON-LD structured schema metadata generation for gaming news articles and benchmarks.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Custom Design Tokens
- **Database**: MongoDB Atlas (via Mongoose)
- **Object Storage / CDN**: Cloudflare Global Edge Network + Vercel Blob Storage
- **AI Integrations**: Google Gemini API, Hugging Face Inference, NVIDIA NIM API
- **Deployment & Hosting**: Cloudflare Workers (via `@opennextjs/cloudflare` & Wrangler) with Vercel Serverless standby
- **Edge Cron & Scheduling**: Vercel Cron Jobs & Cloudflare Cron Triggers

---

## 🚀 Getting Started

### 1. Installation & Environment Scaffolding

```bash
# Navigate to website directory
cd Gaming/website

# Install dependencies
npm install

# Initialize local environment templates (Zero-Secrets policy)
npm run setup
```

### 2. Environment Configuration (`.env`)

Configure your `.env` or `.env.local` file with the following variables:

```env
# MongoDB Connection String
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/mission_control?retryWrites=true&w=majority

# Cron Secret for Protected Blog Generation Endpoint
CRON_SECRET=your_secure_cron_secret_token

# AI LLM & Image Generation Keys
GEMINI_API_KEY=your_google_gemini_api_key
HF_TOKEN=your_hugging_face_token
NVIDIA_API_KEY=nvapi-your_nvidia_nim_api_key

# Vercel Blob CDN for Persistent Image Hosting
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

### 3. Local Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Cloudflare Workers Edge Deployment (OpenNext)

The website is packaged and deployed directly to Cloudflare Workers using OpenNext for full Next.js 16 App Router edge execution and ultra-low edge latency:

```bash
# 1. Build Next.js & package OpenNext Cloudflare bundle (.open-next/)
npm run build:cf

# 2. Deploy to Cloudflare Workers via Wrangler
npm run deploy:cf

# Or deploy directly using wrangler CLI:
npx wrangler deploy

# 3. Preview locally using Cloudflare workerd runtime
npm run preview:cf
```

---

## 🌐 Subdomains & Cloudflare Edge Routing

The production website and edge microservices operate across primary Cloudflare Workers routes and custom subdomains:

| Subdomain / Route | Target Service | Purpose / Features |
| :--- | :--- | :--- |
| `https://mission-control.rarnab225.workers.dev` | Primary Cloudflare Worker (`mission-control`) | Live web application, SSR pages, App Router RSC, and API routes. |
| `missioncontrol.<domain>` *(Custom Domain)* | Cloudflare Worker Custom Domain | Main brand landing hub and interactive hardware benchmark portal. |
| `api.<domain>` *(Custom Subdomain)* | Workers API Gateway / OpenNext Router | Handles `/api/blogs`, `/api/download`, `/api/support/chat`, and telemetry endpoints. |
| `docs.<domain>` *(Subdomain Route)* | Next.js Interactive Documentation Hub | Architecture manuals, telemetry specifications, and controller mapping documentation. |
| `release.<domain>` *(Cloudflare Edge Proxy)* | `scripts/cf-worker-release-proxy.js` | Zero-redirect binary streaming edge proxy for Microsoft Store certification. |

### Configuring Custom Subdomains in Cloudflare

1. **Via Cloudflare Dashboard**:
   - Go to **Workers & Pages** ➔ Select **`mission-control`**.
   - Navigate to **Settings** ➔ **Domains & Routes**.
   - Click **Add Custom Domain** and enter your desired subdomain (e.g., `missioncontrol.yourdomain.com`).
   - Cloudflare will automatically provision SSL certificates and configure the edge DNS routing.

2. **Via `wrangler.jsonc`**:
   - Define custom domain routes directly in [`wrangler.jsonc`](wrangler.jsonc):
     ```jsonc
     "routes": [
       { "pattern": "missioncontrol.yourdomain.com/*", "custom_domain": true },
       { "pattern": "*.missioncontrol.yourdomain.com/*", "custom_domain": true }
     ]
     ```

---

## 📦 Downloads & Windows Package Manager (Winget) Status

The website distributes native builds for Windows and Linux through direct download endpoints and automated mirrors:

- **Primary Direct Installers (Windows)**:
  - **Setup Executable (`.exe`)**: Standard NSIS wizard installer with desktop shortcut and uninstaller.
  - **MSI Installer (`.msi`)**: Windows Installer package for managed deployments.
  - **Portable Archive (`.zip`)**: Zero-install standalone executable folder.
- **Linux Packages**: `.AppImage`, `.deb`, `.rpm`, `.tar.gz` for Debian, Ubuntu, Fedora, and Arch.

### ⏳ Winget Package Status (Microsoft Verification In Progress)

The official package identifier `arnab825.MissionControl` manifest has been prepared and submitted to the official [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs) community repository.

> **Status Notice:** While Microsoft's verification and pull request review are actively in progress, running `winget install arnab825.MissionControl` directly from the public source is not yet live. 
> 
> **Immediate Installation Alternatives:**
> 1. **Direct Download**: Use the 1-click installer from the website or [GitHub Releases](https://github.com/arnab825/Mission-Control/releases/latest).
> 2. **Local Winget Manifest**: Advanced users can test and install locally using the verified manifest without waiting for Microsoft's CDN sync:
>    ```powershell
>    # Run from repository root:
>    winget install --manifest .\Gaming\winget\arnab825.MissionControl.singleton.yaml --accept-package-agreements --accept-source-agreements --force
>    ```

---

## 📅 Automated Blog Pipeline Scheduling

The blog generation route runs automatically via Vercel Crons configured in [`vercel.json`](vercel.json):

```json
{
  "crons": [
    {
      "path": "/api/blogs/generate?batch=1",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/blogs/generate?batch=2",
      "schedule": "15 0 * * *"
    }
  ]
}
```

### Manual Triggering (Development / Testing)

```bash
curl -X POST "http://localhost:3000/api/blogs/generate" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 📂 Project Structure

```
Gaming/website/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── blogs/
│   │   │       ├── route.ts              # Blog GET/POST endpoint
│   │   │       └── generate/
│   │   │           ├── route.ts          # AI blog generation cron route
│   │   │           └── shared.ts         # RSS parser & failover LLM/Image logic
│   │   ├── blog/                         # Gaming Intel UI pages
│   │   ├── benchmarks/                   # Game benchmark profiles UI
│   │   ├── docs/                         # Documentation hub
│   │   └── page.tsx                      # Landing homepage
│   ├── components/                       # Shared UI components & navbar
│   ├── data/
│   │   └── benchmarks.ts                 # Hardware benchmark datasets
│   └── models/
│       └── Blog.ts                       # Mongoose Blog schema model
├── public/                               # Static images, fonts, & fallbacks
├── next.config.ts                        # Next.js configuration
├── open-next.config.ts                   # OpenNext Cloudflare adapter configuration
├── wrangler.jsonc                        # Cloudflare Workers deployment & routing config
└── vercel.json                           # Vercel deployment & cron config
```

---

## 🐳 Distributed Backend Services (Docker)

The web platform interacts with our distributed backend cluster (located in `Gaming/distributed_server`) for catalog search, AI classification, and library syncing.

### Running the Backend Cluster Locally

To simulate the production load-balanced environment, you can run the backend cluster using Docker Compose. The cluster spawns multiple instances of:

1. **Catalog & Web Discovery Service** (Serving `/api/games`, `/api/games/discover`, `/api/games/seed`)
2. **User Library & Node Sync Service** (Serving `/api/nodes/register`, `/api/nodes/{id}/sync`)
3. **AI Classification Service** (Serving `/api/games/classify`)
4. **Load Balancer** (Routing traffic across the services)

```bash
# Navigate to the distributed server directory
cd Gaming/distributed_server

# Build and start the cluster using Docker Compose
docker-compose up --build -d
```

> [!IMPORTANT]
> **Windows Docker Desktop Users (IPv6 Warning)**
> Supabase's PostgreSQL instances often utilize IPv6. If you receive connection timeouts (e.g., `TimeoutError`, `Host is unreachable`) when connecting from the Docker containers to Supabase on a Windows machine, you must enable IPv6 in the Docker engine.
>
> 1. Open Docker Desktop -> Settings -> Docker Engine
> 2. Add `"ipv6": true` to the JSON configuration:
>    ```json
>    {
>      "ipv6": true,
>      "experimental": false
>    }
>    ```
> 3. Click **Apply & restart**.
> 4. Restart your containers using `docker-compose down` and `docker-compose up -d`.
