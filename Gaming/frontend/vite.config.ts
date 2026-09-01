/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'

import fs from 'fs'
import path from 'path'

// Custom plugin to remove deprecated inlineDynamicImports and force codeSplitting: false
const cleanElectronBuildPlugin = () => ({
  name: 'clean-electron-build',
  configResolved(config: any) {
    if (config.build) {
      if (config.build.lib) {
        config.build.lib.formats = ['cjs'];
      }
      const output = config.build.rolldownOptions?.output || config.build.rollupOptions?.output;
      if (output) {
        if (Array.isArray(output)) {
          for (const out of output) {
            out.format = 'cjs';
            delete out.inlineDynamicImports;
            out.codeSplitting = false;
          }
        } else {
          output.format = 'cjs';
          delete output.inlineDynamicImports;
          output.codeSplitting = false;
        }
      }
    }
  },
  closeBundle() {
    try {
      const src = path.resolve('electron/splash.html');
      const dest = path.resolve('dist-electron/splash.html');
      fs.copyFileSync(src, dest);
      console.log('✓ Copied splash.html to dist-electron');

      const srcLogo = path.resolve('public/logo.png');
      const destLogo = path.resolve('dist-electron/logo.png');
      if (fs.existsSync(srcLogo)) {
        fs.copyFileSync(srcLogo, destLogo);
        console.log('✓ Copied logo.png to dist-electron');
      }
    } catch (err) {
      console.error('Failed to copy splash assets:', err);
    }
  }
})

// Dev server middleware to fetch live RSS news without CORS issues in browser mode
const gamingNewsDevPlugin = () => ({
  name: 'gaming-news-dev-server',
  configureServer(server: any) {
    server.middlewares.use('/api/gaming-news', async (_req: any, res: any) => {
      try {
        const FEEDS = [
          { url: 'https://www.pcgamer.com/rss/', source: 'PC Gamer', category: 'PC Gaming' },
          { url: 'https://www.eurogamer.net/?format=rss', source: 'Eurogamer', category: 'Gaming' },
          { url: 'https://kotaku.com/rss', source: 'Kotaku', category: 'Gaming' },
          { url: 'https://www.polygon.com/rss/index.xml', source: 'Polygon', category: 'Gaming' },
          { url: 'https://www.rockpapershotgun.com/feed', source: 'Rock Paper Shotgun', category: 'PC Gaming' },
          { url: 'https://www.gamespot.com/feeds/news/', source: 'GameSpot', category: 'Gaming' },
          { url: 'https://www.tomshardware.com/feeds/all', source: "Tom's Hardware", category: 'Hardware' },
        ];

        const allArticles: any[] = [];
        const seenLinks = new Set<string>();

        await Promise.allSettled(FEEDS.map(async (feed) => {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);
            const r = await fetch(feed.url, {
              signal: controller.signal,
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MissionControl/3.3' }
            });
            clearTimeout(timeout);
            if (!r.ok) return;
            const xml = await r.text();
            const itemRegex = /<item>([\s\S]*?)<\/item>/g;
            let m;
            let count = 0;
            while ((m = itemRegex.exec(xml)) !== null && count < 8) {
              const block = m[1];
              const rawTitle = (/<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(block) || /<title>(.*?)<\/title>/.exec(block))?.[1]?.trim() || '';
              const rawLink = (/<link>(.*?)<\/link>/.exec(block) || /<link href=["'](.*?)["']/.exec(block))?.[1]?.trim() || '';
              const rawDesc = (/<description><!\[CDATA\[(.*?)\]\]><\/description>/.exec(block) || /<description>(.*?)<\/description>/.exec(block))?.[1] || '';
              const pubDate = (/<pubDate>(.*?)<\/pubDate>/.exec(block))?.[1]?.trim() || '';
              const rawImg = (
                /<enclosure[^>]+url=["']([^"']+)["']/.exec(block) ||
                /<media:content[^>]+url=["']([^"']+)["']/.exec(block) ||
                /<img[^>]+src=["']([^"']+)["']/.exec(block)
              )?.[1];

              const cleanTitle = rawTitle.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#8217;/g, "'").replace(/&#8216;/g, "'").replace(/&#8220;/g, '"').replace(/&#8221;/g, '"').replace(/&quot;/g, '"');
              const cleanDesc = rawDesc.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#8217;/g, "'").replace(/&quot;/g, '"').trim().slice(0, 220) + '...';

              if (cleanTitle && rawLink && !seenLinks.has(rawLink)) {
                seenLinks.add(rawLink);
                allArticles.push({
                  id: rawLink,
                  title: cleanTitle,
                  link: rawLink,
                  description: cleanDesc,
                  source: feed.source,
                  category: feed.category,
                  pubDate: pubDate,
                  imageUrl: rawImg || undefined,
                });
                count++;
              }
            }
          } catch (_) {}
        }));

        allArticles.sort((a, b) => {
          const timeA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
          const timeB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
          return timeB - timeA;
        });

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, items: allArticles }));
      } catch (err: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: err?.message }));
      }
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        codeSplitting: true,
        manualChunks(id: string) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('react') || id.includes('react-dom')) {
            return 'vendor-react';
          }

          if (id.includes('recharts') || id.includes('framer-motion') || id.includes('lucide-react')) {
            return 'vendor-ui';
          }

          if (id.includes('electron') || id.includes('electron-updater')) {
            return 'vendor-electron';
          }

          return 'vendor';
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    gamingNewsDevPlugin(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          plugins: [cleanElectronBuildPlugin()],
          build: {
            lib: {
              entry: 'electron/main.ts',
              formats: ['cjs']
            },
            rolldownOptions: {
              external: ['electron'],
              output: {
                entryFileNames: '[name].cjs',
                format: 'cjs'
              }
            },
            rollupOptions: {
              external: ['electron'],
              output: {
                entryFileNames: '[name].cjs',
                format: 'cjs'
              }
            }
          }
        }
      },
      preload: {
        input: 'electron/preload.ts',
        vite: {
          plugins: [cleanElectronBuildPlugin()],
          build: {
            rolldownOptions: {
              output: {
                entryFileNames: '[name].cjs',
                format: 'cjs'
              }
            },
            rollupOptions: {
              output: {
                entryFileNames: '[name].cjs',
                format: 'cjs'
              }
            }
          }
        }
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
