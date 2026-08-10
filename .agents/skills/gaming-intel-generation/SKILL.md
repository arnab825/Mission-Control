---
name: gaming-intel-generation
description: Instructions for AI-driven technical blog post generation, incorporating RSS feeds, dynamic image prompts, and technical/SEO writing standards for Mission Control.
---

# Dynamic Gaming Intel Blog Generation Guidelines

This skill documents the formatting, metadata, and quality requirements for generating automated technical blogs for the Mission Control dashboard.

---

## 1. Allowed Categories & Feed Routing

The blog generator route `/api/blogs/generate` automatically categorizes articles based on 10 parsed RSS feeds (IGN, Kotaku, Eurogamer, PC Gamer, Polygon, GameSpot, Rock Paper Shotgun, Wccftech, AnandTech, Tom's Hardware).

### Category Query Parameter Support:
- Calling `/api/blogs/generate` without parameters generates posts across all 4 active categories.
- Passing `?category=[Category]` generates an AI article specifically for that filtered category:
  * **GPU News**: `/api/blogs/generate?category=GPU%20News` (Graphics processors, CPUs, memory tech, fabrication nodes, hardware benchmarks).
  * **Game News**: `/api/blogs/generate?category=Game%20News` (Game releases, launches, developer updates, graphics APIs, game engines).
  * **Hardware Deep-Dive**: `/api/blogs/generate?category=Hardware%20Deep-Dive` (Technical architecture, ray tracing pipelines, CUDA/Tensor core mechanics).
  * **Game Revisit**: `/api/blogs/generate?category=Game%20Revisit` (Retrospective post-mortems, legacy engine architectures, rendering triumphs).

---

## 2. Formatting & Metadata Structure

Articles must begin with a Markdown frontmatter block containing the following fields:

```yaml
---
title: [Compelling title, no clickbait]
meta_description: [A snappy, click-worthy summary. Active voice. Exactly 120-150 characters.]
tags: [3-5 tags, lowercase only. E.g., rtx5090, amd, directx12]
slug: [Unique lowercase hyphen-separated URL string based on the title, followed strictly by the date suffix in YYYY-MM-DD format, e.g. "intel-core-ultra-gaming-performance-2026-07-18"]
image_prompt: A high-resolution, close-up shot of [Specific hardware/character] with [Specific lighting/setting, e.g. cyberpunk neon lighting], vibrant color grading, no text, photorealistic style.
---

## 2.1 Standardized Publication Timing to Prevent Duplicates
To avoid creating duplicate posts for the same day (e.g. if the generation script runs multiple times or cold-starts), the publication time must be completely deterministic and standardized:
* All generated posts are standardized to exactly **08:00 AM IST** (02:30 UTC of the same day) on their respective publication date.
* Slugs must strictly end with the date suffix (`-YYYY-MM-DD`) so database duplicate-key checks can immediately detect and skip redundant entries.

```

---

## 3. Structural & Content Standards

### Highlights Block
* Positioned immediately below the frontmatter and the introductory paragraph.
* Format as a blockquote: `> **Key Highlights**`
* Exactly 3-4 bullet points. Each bullet must state a **specific technical claim with a real number or concrete metric** (e.g., bandwidth speed, memory footprint, release window).

### Headline Formatting
* Headings must be **2-6 words only**.
* If a heading starts with Why, How, What, or When, it **must** end with a question mark (`?`).

### Code & Diagram Fencing (Strict MDX Rule)
* **Code Fencing**: All code blocks (C#, Python, C++, TypeScript, Bash) **MUST** be explicitly enclosed in triple backticks with language specifiers (e.g. ```csharp ... ``` or ```python ... ```). Never output unfenced code snippets in markdown body text.
* **Mermaid Diagrams**: All diagrams **MUST** be enclosed in ```mermaid ... ``` code fences. Use node labels wrapped in double quotes (e.g., `A["Node Label"]`). Never include styling directives or `classDef` definitions, as the site frontend styles diagrams dynamically.

### Mathematical Expressions & KaTeX
* Use `$ ... $` for inline formulas and `$$ ... $$` for block equations.
* Use standard LaTeX bracket syntax (e.g., `\frac{A}{B}`) with plain `{` and `}` curly braces. Never output HTML entity escapes (`&#123;`).
* All metrics and calculations must be technically precise and physically plausible.

### Photorealistic 3D Cover Art Requirements
* **Topic-Specific 3D Photorealistic Style Only**: `image_prompt` MUST request photorealistic 3D renders or cinematic 3D game concept art depicting the **exact character, game scene, or hardware component** from the article (e.g. *"A highly detailed, photorealistic 3D video game concept art depicting [Specific Character/Combat Scene], cinematic volumetric lighting, 8k resolution, Unreal Engine 5 style, no text"*).
* **Multi-Tier AI Image Pipeline & Persistent Vercel Blob Storage**: Images are generated through a 4-tier provider cascade:
  1. **Google Gemini (Imagen 3)** via `GEMINI_API_KEY` (`imagen-3.0-generate-002`)
  2. **Hugging Face (`FLUX.1-schnell`)** via `HF_TOKEN`
  3. **Pollinations AI** (fast 8s timeout)
  4. **High-Resolution Photorealistic 3D PNG Artwork** category fallback
* **Vercel Blob CDN Integration (`BLOB_READ_WRITE_TOKEN`)**: Generated image buffers are automatically uploaded to Vercel Blob CDN (`@vercel/blob`) and saved as public CDN URLs in MongoDB. This ensures 100% persistent storage and prevents serverless filesystem 404 errors.
* **No Generic Abstract Art**: Never generate flat vector graphics, generic abstract wallpapers, or unrelated artwork.


---

## 4. Editorial Voice & Anti-Repetition

* **Professional Persona**: Write in a technical, journalistic, and analytical tone. Do not use generic AI transitional phrases (e.g., *"delve into"*, *"it is worth noting"*).
* **Banned Openers**:
  * *"In the fast-paced world of technology..."*
  * *"In today's digital landscape..."*
  * *"As AI continues to evolve..."*
* **Banned Closers**:
  * *"...developers can build robust, high-performance systems ready for the next decade."*
  * *"...in an ever-evolving digital landscape."*

---

## 5. Content Restrictions & Scheduling Rules

* **3-Tier LLM Failover for Busy Schedules / Quota Limits**:
  * If Google Gemini is busy or rate-limited during scheduled cron executions, the system automatically cascades to:
    1. **Google Gemini Flash** (`gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-2.0-flash`)
    2. **Hugging Face LLMs** (`meta-llama/Llama-3.1-8B-Instruct`, `mistralai/Mistral-7B-Instruct-v0.3`, `Qwen/Qwen2.5-72B-Instruct` via `HF_TOKEN`)
    3. **NVIDIA NIM LLMs** (`meta/llama-3.3-70b-instruct` via `NVIDIA_API_KEY`)
  * This guarantees 100% uptime for automated daily blog generation under high traffic or API quota limits.


* **Scheduling & Daily Multi-Post Rules**:
  * The blog generator runs daily at **5:30 AM IST** (configured as a Vercel cron job running at `00:00 UTC`).
  * Every execution must generate a post for **each** of the four active categories (GPU News, Game News, Hardware Deep-Dive, Game Revisit) to populate the website filters daily.
  * **Anti-Duplication**: Feed items must be partitioned/sliced across related categories (e.g. GPU News and Hardware Deep-Dive get separate halves of the hardware news, while Game News and Game Revisit get separate halves of the game news). Each category must also be prompted with a distinct focus (e.g. latest releases vs. historical retrospects/architecture) to avoid topic duplicates on the same day.
