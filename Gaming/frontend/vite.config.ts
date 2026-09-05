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

// Dev server middleware to fetch live trending games & store search without CORS in browser mode
const liveGamesDevPlugin = () => ({
  name: 'live-games-dev-server',
  configureServer(server: any) {
    let trendingCache: { timestamp: number; data: any[] } | null = null;
    const TRENDING_CACHE_TTL = 15 * 60 * 1000;

    server.middlewares.use('/api/games-trending', async (_req: any, res: any) => {
      const now = Date.now();
      if (trendingCache && now - trendingCache.timestamp < TRENDING_CACHE_TTL) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, games: trendingCache.data }));
        return;
      }

      try {
        const mapped: any[] = [];
        const seenIds = new Set<string>();

        const safeAdd = (game: any) => {
          const norm = (game.title || '').toLowerCase().trim();
          if (!norm || seenIds.has(norm) || /Steam Deck|Valve Index|Soundtrack|Controller/i.test(norm)) return;
          seenIds.add(norm);
          mapped.push(game);
        };

        // 1. Steam Featured Categories
        const steamPromise = (async () => {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);
            const r = await fetch('https://store.steampowered.com/api/featuredcategories/?l=english&cc=US', {
              signal: controller.signal,
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MissionControl/3.5' }
            });
            clearTimeout(timeout);
            if (!r.ok) return;
            const data = (await r.json()) as any;

            const processGroup = (items: any[], cat: string) => {
              if (!Array.isArray(items)) return;
              items.forEach(item => {
                const appId = String(item.id);
                if (!appId || !item.name) return;
                const banner = item.header_image || `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;
                safeAdd({
                  id: `steam-${appId}`,
                  title: item.name,
                  developer: 'Steam Verified Partner',
                  publisher: 'Steam Partner',
                  release_date: new Date().getFullYear().toString(),
                  primary_genre: cat,
                  genres: [cat, 'Trending', 'Steam'],
                  tags: [cat, 'Steam Store', item.discount_percent ? `${item.discount_percent}% Off` : 'Featured'],
                  rating: item.discount_percent ? 85 : 90,
                  cover_url: item.large_capsule_image || banner,
                  banner_url: banner,
                  summary: item.discount_percent > 0
                    ? `Currently ${item.discount_percent}% off on Steam Store.`
                    : `Trending ${cat.toLowerCase()} title on Steam Store.`,
                  store: 'Steam',
                  store_app_id: appId,
                  launchers: ['Steam'],
                  in_catalog: true,
                  ai_classified: true,
                  installations: []
                });
              });
            };

            processGroup(data?.top_sellers?.items?.slice(0, 16), 'Top Seller');
            processGroup(data?.specials?.items?.slice(0, 12), 'Special Offer');
            processGroup(data?.new_releases?.items?.slice(0, 12), 'New Release');
          } catch (_) {}
        })();

        // 2. Epic Games Store Promotions
        const epicPromise = (async () => {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);
            const r = await fetch('https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US', {
              signal: controller.signal,
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MissionControl/3.5' }
            });
            clearTimeout(timeout);
            if (!r.ok) return;
            const data = (await r.json()) as any;
            const elements = data?.data?.Catalog?.searchStore?.elements || [];
            elements.slice(0, 10).forEach((item: any) => {
              const imgObj = (item.keyImages || []).find((i: any) => i.type === 'OfferImageWide' || i.type === 'Thumbnail' || i.type === 'DieselStoreFrontWide');
              safeAdd({
                id: `epic-${item.id}`,
                title: item.title,
                developer: item.seller?.name || 'Epic Games Partner',
                publisher: item.seller?.name || 'Epic Games',
                release_date: item.releaseDate ? item.releaseDate.split('T')[0] : new Date().getFullYear().toString(),
                primary_genre: 'Epic Featured',
                genres: ['Action', 'Epic Games', 'Featured'],
                tags: ['Epic Games Store', 'Official'],
                cover_url: imgObj?.url,
                banner_url: imgObj?.url,
                summary: item.description || `Trending headline title featured on the Epic Games Store.`,
                store: 'Epic Games',
                store_app_id: item.id,
                launchers: ['Epic Games'],
                in_catalog: true,
                ai_classified: true,
                installations: []
              });
            });
          } catch (_) {}
        })();

        // 3. GOG Bestsellers
        const gogPromise = (async () => {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);
            const r = await fetch('https://catalog.gog.com/v1/catalog?limit=12&order=desc:bestselling&productType=in:game', {
              signal: controller.signal,
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MissionControl/3.5' }
            });
            clearTimeout(timeout);
            if (!r.ok) return;
            const data = (await r.json()) as any;
            (data?.products || []).forEach((prod: any) => {
              safeAdd({
                id: `gog-${prod.id}`,
                title: prod.title,
                developer: prod.developers?.[0] || 'GOG Partner',
                publisher: prod.publishers?.[0] || 'GOG',
                release_date: prod.releaseDate ? prod.releaseDate.split('T')[0] : '',
                primary_genre: prod.genres?.[0]?.name || 'GOG Classic',
                genres: (prod.genres || []).map((g: any) => g.name || g),
                tags: ['DRM-Free', 'GOG Galaxy', 'Bestseller'],
                cover_url: prod.coverHorizontal || prod.coverVertical,
                banner_url: prod.coverHorizontal || prod.coverVertical,
                summary: `Bestselling DRM-free classic trending on GOG Galaxy.`,
                store: 'GOG Galaxy',
                store_app_id: String(prod.id),
                launchers: ['GOG Galaxy'],
                in_catalog: true,
                ai_classified: true,
                installations: []
              });
            });
          } catch (_) {}
        })();

        await Promise.allSettled([steamPromise, epicPromise, gogPromise]);

        if (mapped.length > 0) {
          trendingCache = { timestamp: now, data: mapped };
        }

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, games: mapped }));
      } catch (err: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: err?.message }));
      }
    });

    server.middlewares.use('/api/games-search', async (req: any, res: any) => {
      try {
        const urlObj = new URL(req.url, 'http://localhost');
        const q = (urlObj.searchParams.get('q') || urlObj.searchParams.get('query') || '').trim();
        if (!q) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, games: [] }));
          return;
        }

        const mapped: any[] = [];
        const seenTitles = new Set<string>();

        const safeAdd = (game: any) => {
          const norm = (game.title || '').toLowerCase().trim();
          if (!norm || seenTitles.has(norm)) return;
          seenTitles.add(norm);
          mapped.push(game);
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const r = await fetch(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(q)}&l=english&cc=US`, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MissionControl/3.5' }
        });
        clearTimeout(timeout);

        if (r.ok) {
          const data = (await r.json()) as any;
          (data?.items || []).forEach((item: any) => {
            const appId = String(item.id);
            const banner = `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;
            safeAdd({
              id: `steam-${appId}`,
              title: item.name,
              developer: 'Steam Verified',
              publisher: 'Steam Partner',
              release_date: new Date().getFullYear().toString(),
              primary_genre: item.metascore ? `Metascore ${item.metascore}` : 'Steam Store',
              genres: ['Action', 'RPG', 'Steam'],
              tags: ['Steam Store', item.metascore ? `Metascore ${item.metascore}` : 'Popular'],
              cover_url: banner,
              banner_url: banner,
              summary: item.price
                ? `Official Steam Release (${(item.price.final / 100).toFixed(2)} ${item.price.currency}).`
                : `Official Steam title matching "${q}".`,
              store: 'Steam',
              store_app_id: appId,
              launchers: ['Steam'],
              in_catalog: true,
              ai_classified: true,
              installations: []
            });
          });
        }

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, games: mapped }));
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
    liveGamesDevPlugin(),
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
