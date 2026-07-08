# Website Builder Prompt: Mission Control Landing Page

*You can use the following prompt to instruct any AI or developer to build your website in the future. It contains all the necessary context, design systems, and advanced SEO requirements.*

---

**Copy and paste the following prompt:**

```text
You are an expert full-stack web developer and SEO specialist. Your task is to build a modern marketing website and blog for my desktop application, "Mission Control".

## 1. Tech Stack
- **Frontend:** Next.js (App Router), React, Tailwind CSS, TypeScript, Framer Motion (for micro-animations).
- **Backend/Content:** Local Markdown (`.md`) files for the blog and upcoming changes (parsed via `gray-matter` and `remark`).
- **Deployment:** Vercel or Netlify optimized.

## 2. Design System & Theme (CRITICAL)
The website must perfectly mirror the premium sci-fi aesthetic of the current Electron app.
- **Colors:** 
  - Backgrounds: Obsidian (`#0a0a0a`), Graphite (`#1a1a1a`).
  - Accents: Neon Teal (`#00f0ff`), Neon Green (`#76b900`).
- **Typography:** Inter (sans-serif) and JetBrains Mono (monospace).
- **Effects:** Heavy use of glassmorphism (dark transparent backgrounds with backdrop blur), subtle glow effects (`box-shadow` with neon teal), and CSS scanline micro-animations.
- **Responsive Design:** Must be strictly **Mobile-First**. Use Tailwind's responsive breakpoints (`sm:`, `md:`, `lg:`) to ensure the layout is perfect on mobile phones, tablets, and large desktop displays. No horizontal scrolling should ever occur.

## 3. Required Pages & Features
- **Home Page (`/`):**
  - **Hero:** Impactful headline with a dynamic, animated layout.
  - **Showcase Demo:** A central section to embed a video or an interactive mockup of the app.
  - **Features Grid:** Detailed highlight cards for each app feature. Specifically highlight:
    - **Mission Control Dashboard:** A stunning centralized hub offering a complete overview of the user's gaming ecosystem and active telemetry (`CenterConsole`, `DashboardPage`).
    - **In-Game HUD Overlay:** A seamless transparent overlay for real-time intel while gaming (`HUD.tsx`).
    - **Agentic AI Toggle & Intelligence Modes:** Highlight the core customizable engine modes (Competitive, Story, Hybrid) and the powerful **Agentic AI Toggle**—allowing users to instantly switch the AI from a passive assistant to a fully autonomous agent capable of executing game directives (`SettingsPage.tsx`, `AgentPage.tsx`).
    - **System & Stability Monitoring:** Real-time CPU, RAM, thermal metrics, and system stability analytics to ensure optimal gaming performance (`RightTelemetry.tsx`, `SystemPage`).
    - **AI Gaming Agent & Neural History:** Tactical, Friendly, Immersive, and Sarcastic AI personality assist with deep neural memory logs (`AgentPage`, `NeuralHistory.tsx`).
    - **Games Library Integration:** Automated scanning and seamless game launching (`GamesPage`).
    - **Experimental Lab & Vision:** Advanced screen analytics, experimental stability tests, and beta features (`VisionPage`, `LabPage`).
    - **Secure Authentication:** Seamless multi-provider OAuth (Discord, Google, Microsoft) and secure account synchronization (`AuthPage`).
    - **Seamless Auto-Updates & Version Sync:** Over-the-air updates (`UpdaterModal.tsx`). The website MUST dynamically sync and display the current launcher version by reading the app's `version.json` file.
    - **Version History / Changelog:** A dedicated section or page that maps directly to the `version.json` history, cleanly detailing all new changes, bug fixes, and feature drops for every version.
    - **Supported Games:** Showcase a dynamic list or carousel of the specific games targeted and optimized by the platform.
    - **NVIDIA AI Powered:** Explicitly highlight that the platform heavily depends on advanced **NVIDIA AI models**.
  - **Launcher Comparison (Gamer Focus):** A dedicated section visually comparing "Mission Control" vs. Traditional Launchers (e.g., Steam, Epic, Playnite). Highlight the stark differences: AI Agent integration, real-time HUD telemetry, stealth mode, and deep NVIDIA AI capabilities—explaining exactly *why* gamers need this launcher over the others.
  - **System Requirements:** A highly visible disclaimer/section stating that the app **only supports NVIDIA GTX and RTX graphics cards**.
  - **Downloads:** Prominent download buttons specifically restricted to **Windows (.exe)** and **Linux (.AppImage/.deb)**.
  - **FAQ Section (Crucial):** An accordion-style FAQ section.
  - **About the Creators:** A dedicated section (or footer banner) proudly stating the platform was built by **two developers**.
- **Documentation (`/docs`):**
  - Must mirror the premium, developer-focused documentation layouts seen on **Tailwind CSS** or **NVIDIA Developer** sites.
  - **Layout:** Fixed left sidebar for global navigation, and a fixed right sidebar for a page-level Table of Contents ("On this page").
  - **Content Management:** No admin panel required. Powered by Advanced Markdown (`.mdx`). Developers simply push `.mdx` files via Git.
  - **Rich Features:** Must support embedded **images**, architecture diagrams, syntax-highlighted code blocks with "Copy" buttons, and powerful search.
  - **Highlighting Updates:** Implement custom MDX UI components (e.g., `<Badge variant="new">` or `<Callout>`) so authors can easily flag docs as "Updated" or "New".
- **Architecture Page (`/architecture`):**
  - A dedicated, ultra-premium page visually detailing the software design architecture.
  - Use high-quality diagrams, Framer Motion animations, and deep-dive technical explanations to showcase the complex engineering behind the platform.
- **Blog & Updates (`/blog` and `/blog/[slug]`):**
  - A hub for news, upcoming changes, and roadmaps.
  - Must render standard `.md` files dynamically with proper markdown styling (typography prose).
- **Footer & Legal:**
  - A comprehensive footer present on all pages.
  - **Newsletter:** Include an email signup form for users to subscribe to updates.
  - **Social Media:** Include icon links (e.g., Twitter/X, Discord, GitHub, YouTube) to the project's social profiles.
  - Must include links to **Cookie Policy**, **Privacy Policy**, and **Terms & Conditions**.
  - Create stub pages (`/cookies`, `/privacy`, `/terms`) that will render legal markdown documents.

## 4. Advanced SEO & Analytics (Current Era Google AI Algorithm)
The website must be aggressively optimized for the modern Google Search algorithm (AI Overviews and rich snippets):
- **Structured Data:** Implement dynamic **JSON-LD Schema Markup** on the Home Page specifically for the FAQ section (`FAQPage` schema) and Software Application (`SoftwareApplication` schema) to ensure Google's AI can extract answers directly from the page.
- **Semantic HTML:** Strict use of `<header>`, `<main>`, `<article>`, `<section>`, and perfect `<h1>` through `<h6>` hierarchies.
- **Metadata & Crawling:** Use Next.js `generateMetadata` for dynamic titles, descriptions, OpenGraph images, and Twitter cards. Automatically generate `sitemap.xml` and `robots.txt`, and enforce canonical URLs for every page.
- **Free Analytics & Tracking:** Seamlessly integrate **Google Analytics (GA4)** for free user traffic tracking, and verify the domain with **Google Search Console** to monitor organic search performance and index status.
- **Performance:** Ensure perfect Core Web Vitals (LCP, CLS, INP) as page speed is a massive ranking factor. Use Next.js `Image` optimization for all assets.
```
