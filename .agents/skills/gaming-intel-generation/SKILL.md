---
name: gaming-intel-generation
description: Instructions for AI-driven technical blog post generation, incorporating RSS feeds, dynamic image prompts, and technical/SEO writing standards for Mission Control.
---

# Dynamic Gaming Intel Blog Generation Guidelines

This skill documents the formatting, metadata, and quality requirements for generating automated technical blogs for the Mission Control dashboard.

---

## 1. Allowed Categories & Feed Routing

The blog generator route `/api/blogs/generate` automatically categorizes articles based on the filtered RSS feed items:
* **GPU News**: Covers graphics processors, CPU architectures, semiconductors, memory tech, fabrication nodes, leaks, and hardware benchmarks.
* **Game News**: Covers video game releases, expansions, developer announcements, graphics APIs, game engines, and performance optimizations.

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

### Code Blocks
* All code blocks must be complete, correct, and runnable (no commented-out placeholder comments).
* Do not include command-line prompts (`$` or `>`) in console blocks.

### Mermaid Diagrams
* Use node labels wrapped in double quotes (e.g., `A["Node Label"]`).
* Never include styling directives or `classDef` definitions, as the site frontend styles diagrams dynamically.
* Keep diagrams focused on technical flows (e.g., frame rendering pipelines, API auth).

### Mathematical Expressions
* Use `$ ... $` for inline formulas and `$$ ... $$` for block equations.
* All metrics and calculations must be technically precise and physically plausible.

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

* **Content Restrictions (No Bloat, No Ads, No Promotions, No Harmful or 18+ Content)**:
  * Articles must be strictly informational and analytical.
  * Never include advertisements, sponsored placements, or promotional calls to action (e.g., "Buy now", "Click here to subscribe", "Check out their website").
  * Cut out marketing fluff and bloated introductory paragraphs. Get straight to the technical facts and analysis.
  * **STRICT SAFETY**: Do NOT generate any harmful, unsafe, hateful, or 18+ / adult-related content. Keep the content safe for all audiences.

* **Scheduling & Daily Multi-Post Rules**:
  * The blog generator runs daily at **4:00 AM IST** (configured as a Vercel cron job running at `22:30 UTC`).
  * Every execution must generate a post for **each** of the four active categories (GPU News, Game News, Hardware Deep-Dive, Game Revisit) to populate the website filters daily.
  * **Anti-Duplication**: Feed items must be partitioned/sliced across related categories (e.g. GPU News and Hardware Deep-Dive get separate halves of the hardware news, while Game News and Game Revisit get separate halves of the game news). Each category must also be prompted with a distinct focus (e.g. latest releases vs. historical retrospects/architecture) to avoid topic duplicates on the same day.
