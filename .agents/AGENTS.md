# Custom Agent Rules for Mission Control

Follow these rules when writing, updating, or generating code and content in this workspace.

---

## 1. Project Overview & Tech Stack

This repository, **Mission Control**, is split into three primary components:
1. **Website (Next.js)**: Located in `/Gaming/website`. Built with Next.js (App Router), TypeScript, Tailwind CSS, and MongoDB/Mongoose.
2. **Desktop App (Electron)**: Located in `/Gaming/frontend`. Built with React, TypeScript, and Vite.
3. **Backend (Python)**: Located in `/Gaming/backend`. Built with Python, using FastAPI for system interfaces and utility scripting.

---

## 2. Blog Generation Architecture & Rules

The website features an automated AI-driven blog generation pipeline at `/api/blogs/generate`:
- **Feeds**: It fetches from IGN, Kotaku, Eurogamer, AnandTech, and Tom's Hardware RSS feeds.
- **Categories**: It generates and posts for **four** categories daily: `GPU News`, `Game News`, `Hardware Deep-Dive`, and `Game Revisit`.
- **Scheduling**: The blog generation runs automatically every day at **4:00 AM** via Vercel cron jobs.
- **Tone**: Technical, authoritative, and analytical. Avoid generic AI catchphrases.
- **Content Restrictions**: Strict prohibition of advertisements, promotional calls to action, marketing bloat, harmful/unsafe content, or 18+/adult material.
- **Image Generation**: Uses the parsed `image_prompt` from the LLM frontmatter to generate custom preview images via Pollinations AI or HuggingFace.

---

## 3. General Code Standards

* **TypeScript**: Use strict types where possible. Always verify typing with `tsc --noEmit` before proposing changes.
* **Styles**: Ensure that styling modifications remain clean and align with the design system.
* **Paths**: Ensure all paths are relative within the workspace. Never hardcode absolute user paths.

For the full detailed rules on generating gaming news blog posts and SEO/formatting details, see the skill file:
→ [`.agents/skills/gaming-intel-generation/SKILL.md`](file:///e:/AiAssistant/.agents/skills/gaming-intel-generation/SKILL.md)
