# Mission Control Landing Page Plan

This plan outlines the creation of a new marketing website (landing page) for your project to showcase a demo, highlight features, provide platform-specific downloads, and host a blog, all while matching your current app's aesthetic.

## User Review Required

> [!IMPORTANT]  
> Please review this plan. This will involve creating a **new web project** (e.g., using Next.js or Vite) inside a new `website` folder in your repository. This allows the landing page to be deployed easily to services like Vercel or Netlify without interfering with your Electron desktop app.

## Open Questions

> [!WARNING]  
> 1. **Framework Choice:** I recommend using **Next.js** for the website because it has great built-in SEO, routing, and Markdown support which is perfect for the **blog portion**. Do you agree with using Next.js?
> 2. **Demo Format:** For the "show demo" section, do you want a video player, an interactive mockup, or just an image carousel of your app?
> 3. **Blog Content:** Should the blog use local Markdown files for you to easily write posts, or do you want to connect a CMS later?
> 4. **Theme Alignment:** I checked your theme. It uses a sleek dark mode (`obsidian` and `graphite` backgrounds) with `neon-teal` and `neon-green` accents, plus glassmorphism (`.glass-panel`). We will replicate this exactly. Does this sound good?

## Proposed Changes

### 1. New Website Project Initialization

We will create a new directory named `website` at the root of your project (`c:\Users\DELL\Desktop\AiAssistant\Gaming\website`).

#### [NEW] `website/` (Next.js Project)
- Initialize a new Next.js application with Tailwind CSS and TypeScript.
- Set up the Next.js App Router for easy page creation.

### 2. Theming, Styling, and Responsiveness

We will port your existing CSS variables and Tailwind configuration from the Electron app to the website to ensure a unified brand.

#### [NEW] `website/src/app/globals.css`
- Add `--color-neon-teal`, `--color-neon-green`, `--color-obsidian`, `--color-graphite`.
- Add `.glass`, `.glass-panel`, `.scanline-effect`, and `.glow-teal` utilities.

#### [NEW] `website/tailwind.config.ts`
- Configure fonts (`Inter`, `JetBrains Mono`) and colors to match your `frontend` app exactly.

#### Mobile-First Responsive Design
- The entire website will be built with a **Mobile-First approach** using Tailwind's grid and flex utilities. It will scale beautifully from mobile phones up to ultra-wide monitors, ensuring a perfect layout everywhere.

### 3. Core Pages and Sections

We will build out the pages you requested, optimized for modern search engines:

#### [NEW] `website/src/app/page.tsx` (Home Page)
- **Hero Section:** Catchy title with a clear call to action (Download).
- **Show Demo Section:** A prominent area containing a video or interactive preview of "Mission Control".
- **Features Details:** A grid or list showcasing all the powerful features of your app based on the frontend structure (`pages/` and `components/`):
  - **Mission Control Dashboard:** The main visual hub for the user (`DashboardPage`).
  - **Agentic AI Toggle & Modes:** Highlight the powerful ability to instantly toggle the AI into full **Autonomous Agentic Mode** (executing keystrokes/directives), along with the Competitive, Story, and Hybrid passive intelligence modes.
  - **System & Stability Monitoring:** Real-time PC hardware, thermal, and stability tracking (`SystemPage`).
  - **In-Game HUD Overlay:** Transparent game overlay integration (`HUD`).
  - **AI Agent & Neural History:** Interactive gaming assistant with multiple personalities and conversation memory (`NeuralHistory`).
  - **Games Library:** Unified library with stealth mode.
  - **Experimental Lab:** Advanced analytics, vision tests, and beta features (`LabPage`).
  - **Secure Authentication:** Discord, Microsoft, and Google OAuth integration (`AuthPage`).
  - **Version Sync & Auto-Updates:** Built-in auto-update system (`UpdaterModal`). The website will dynamically fetch and display the current launcher version by reading `version.json`.
  - **Version History / Changelog:** A dedicated log highlighting all new changes corresponding to the updates in `version.json`.
  - **Targeted Games:** Dedicated highlight of the specific games the AI is optimized for.
  - **NVIDIA AI Integration:** Emphasize the heavy reliance on NVIDIA's AI models.
- **Launcher Comparison (Gamer Focused):** A powerful "Us vs. Them" section directly comparing Mission Control to traditional launchers. This will highlight exactly *why* a gamer should use this over a standard launcher (showcasing AI capabilities, HUD, and Stealth Mode).
- **System Requirements Alert:** A clear callout on the homepage that the software **strictly requires an NVIDIA GTX or RTX graphics card** to function.
- **SEO & Free Analytics Suite:**
  - **Structured Data:** Implement **JSON-LD Schema Markup** for the FAQ. This is crucial for the current era of Google Search (AI Overviews).
  - **Tracking tools:** Integrate **Google Analytics (GA4)** and verify with **Google Search Console**—both of which are completely **free**—to track user traffic and organic search growth.
- **About the Developers:** A section explicitly highlighting that this massive platform was built by a dedicated team of **two developers**.
- **Download Section:** Buttons specifically tailored to **Windows (.exe)** and **Linux (.AppImage/.deb)**.

#### [NEW] `website/src/app/docs/page.tsx` (Premium Documentation Hub)
- A highly structured, professional user manual built specifically to rival the documentation of **Tailwind CSS** or **NVIDIA**.
- **Admin & Updates:** You do **not** need a separate admin portal. You will simply edit local `.mdx` files. You can highlight updated docs using built-in UI components like `<Badge>Updated</Badge>`.
- **Rich Content:** Seamlessly supports embedding high-quality **images** and diagrams directly inside your markdown files.
- **Layout:** A fixed left sidebar for global navigation and a right sidebar for the page's Table of Contents ("On this page").
- Powered by advanced Markdown (`.mdx`) frameworks (like Nextra or Fumadocs) so you can effortlessly write world-class guides.

#### [NEW] `website/src/app/architecture/page.tsx` (Software Design Showcase)
- A dedicated, premium page designed solely to show off the complex software design and architecture of the application.
- Will feature animated diagrams and technical deep-dives to impress advanced users and developers.

#### [NEW] `website/src/app/blog/page.tsx` (Blog & Updates)
- A dedicated portion to share updates, guides, and upcoming changes.
- We will use **Markdown (.md) files** to manage all content. This means you can easily write about upcoming changes, roadmaps, and patch notes in simple `.md` files, and Next.js will automatically generate beautiful pages for them matching your theme.

#### [NEW] `website/src/app/blog/[slug]/page.tsx` (Dynamic MD Renderer)
- Dynamic route to render individual `.md` files for blog posts and upcoming changes.

#### [NEW] Global Footer & Legal Pages
- Implement a global footer component across the website.
- **Newsletter:** Add a sleek email signup form to capture leads for your marketing efforts.
- **Social Media:** Include branded icons linking to your community spaces (Discord, Twitter/X, YouTube).
- Add dedicated pages for **Cookie Policy (`/cookies`)**, **Privacy Policy (`/privacy`)**, and **Terms & Conditions (`/terms`)**. These will also be powered by Markdown files for easy editing.

## Verification Plan

### Automated Tests
- Run `npm run build` in the new `website` directory to ensure there are no build errors.
- Test routing between Home and Blog pages.

### Manual Verification
- You will be asked to run the Next.js dev server (`npm run dev`) and visually inspect the landing page.
- We will verify that the theme matches your existing app.
- We will verify the download buttons are present and correctly labeled for Windows and Linux.
