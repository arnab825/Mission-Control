# Custom Agent Rules for Mission Control

Follow these rules when writing, updating, or generating code and content in this workspace.

---

## 1. Project Overview & Tech Stack

This repository, **Mission Control**, is split into three primary components:
1. **Website (Next.js & Cloudflare Workers)**: Located in `/Gaming/website`. Built with Next.js 16 (App Router), TypeScript, Tailwind CSS, MongoDB/Mongoose, and deployed to Cloudflare Workers via OpenNext (`@opennextjs/cloudflare` + Wrangler) with multi-subdomain edge routing (`mission-control.rarnab225.workers.dev` and custom subdomains).
2. **Desktop App (Electron)**: Located in `/Gaming/frontend`. Built with React, TypeScript, and Vite.
3. **Backend (Python)**: Located in `/Gaming/backend`. Built with Python, using FastAPI for system interfaces and utility scripting.

---

## 2. General Code Standards

* **TypeScript**: Use strict types where possible. Always verify typing with `tsc --noEmit` before proposing changes.
* **Styles**: Ensure that styling modifications remain clean and align with the design system.
* **Paths**: Ensure all paths are relative within the workspace. Never hardcode absolute user paths.
* **Game Benchmark Profiles**: Whenever a game is added to `BENCHMARK_PROFILES` in `Gaming/website/src/data/benchmarks.ts`, you MUST include a complete `detailedOverview` object (with `story`, `gameplayLoop`, and 4 `keyMechanics` items `{ name, desc }`). Use Llama/NVIDIA NIM to generate the structured game overviews automatically.

