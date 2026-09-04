# 🌐 Mission Control — Web Platform (`Gaming/website`)

<p align="center">
  <img src="public/logo.png" width="80" alt="Mission Control Website Logo" />
</p>

The official high-performance web platform for **Mission Control**, built with Next.js 15 (App Router), TypeScript, Tailwind CSS, and MongoDB Atlas. It hosts the interactive game benchmark dataset, documentation center, community glitch tracker, and an automated AI-driven gaming news generation engine (`Gaming Intel`).

---

## ⚡ Key Features

- **📰 Automated AI Gaming Intel Blog Pipeline (`/api/blogs/generate`)**:
  - Automatically fetches real-time updates from 5 major RSS feeds: IGN, Kotaku, Eurogamer, AnandTech, and Tom's Hardware.
  - Generates technical gaming articles daily across 4 core categories: `GPU News`, `Game News`, `Hardware Deep-Dive`, and `Game Revisit`.
  - **3-Tier Failover LLM Pipeline**: Google Gemini (`gemini-3.8-flash`) ➔ Hugging Face (`Llama-3.1-8B-Instruct`) ➔ NVIDIA NIM (`nvidia/nemotron-3-ultra` / `meta/llama-3.3-70b-instruct`).
  - **4-Tier Image Failover Pipeline**: Imagen 3 via Gemini ➔ Hugging Face (`FLUX.1-schnell`) ➔ Pollinations AI ➔ Fallback 3D PNG artwork assets.
  - **MongoDB Atlas Persistence**: Saves posts directly into MongoDB Atlas to guarantee zero content loss across serverless Vercel function lifecycles.
- **🎮 Interactive Game Benchmark Library**: Dynamic rendering of GPU performance profiles, CPU bottleneck metrics, story overviews, and gameplay mechanics across top titles.
- **📥 Dynamic OS-Dependent Download Router (`/api/download`)**: Automated HTTP User-Agent inspection serving native Windows installers (`.exe`, `.msi`, `.zip`) to Windows users and Linux packages (`.AppImage`, `.deb`, `.rpm`, `.tar.gz`) to Linux users.
- **📊 System Telemetry & Glitch Tracker**: Community bug tracking hub and live WebGL GPU hardware specs auto-detection.
- **🔍 Automated SEO & Schema**: Full JSON-LD structured schema metadata generation for gaming news articles and benchmarks.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Custom Design Tokens
- **Database**: MongoDB Atlas (via Mongoose)
- **AI Integrations**: Google Gemini API, Hugging Face Inference, NVIDIA NIM API
- **Deployment & Crons**: Vercel Serverless Functions + Vercel Cron Jobs

---

## 🚀 Getting Started

### 1. Installation

```bash
# Navigate to website directory
cd Gaming/website

# Install dependencies
npm install
```

### 2. Environment Configuration (`.env`)

Create a `.env` file in `Gaming/website/` with the following variables:

```env
# MongoDB Connection String
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/mission_control?retryWrites=true&w=majority

# Cron Secret for Protected Blog Generation Endpoint
CRON_SECRET=your_secure_cron_secret_token

# AI LLM & Image Generation Keys
GEMINI_API_KEY=your_google_gemini_api_key
HF_TOKEN=your_hugging_face_token
NVIDIA_API_KEY=nvapi-your_nvidia_nim_api_key
```

### 3. Local Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

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
