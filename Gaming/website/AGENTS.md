<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Cloudflare Workers & OpenNext Deployment Rules

1. **Target Runtime**: Cloudflare Workers using `@opennextjs/cloudflare` and `wrangler.jsonc`.
2. **Build Commands**:
   - `npm run build:cf` (`opennextjs-cloudflare build`) to package `.open-next/worker.js` and `.open-next/assets`.
   - `npm run deploy:cf` or `npx wrangler deploy` to push to Cloudflare Workers edge network.
3. **Subdomains & Domains**:
   - Default live worker URL: `https://mission-control.rarnab225.workers.dev`.
   - Custom domains and subdomains (e.g. `missioncontrol.<domain>`, `api.<domain>`, `docs.<domain>`) are handled via Cloudflare Custom Domains or `wrangler.jsonc` route patterns.
4. **Node.js Compatibility**: Ensure `compatibility_flags: ["nodejs_compat"]` is preserved in `wrangler.jsonc`.
5. **Static Assets**: All static assets must route through Cloudflare Workers Assets binding (`ASSETS` mapped to `.open-next/assets`).
6. **Documentation**: See `docs/CLOUDFLARE_DEPLOYMENT.md` for complete architecture and troubleshooting.

