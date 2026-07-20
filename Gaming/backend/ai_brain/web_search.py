"""
web_search.py — Multi-Source Gaming Intelligence Engine for Mission Control.

Architecture: Gaming-Optimized, Truly Free, Dev + Prod Safe.

Source Stack (all free, no credit card):
  1. Wikipedia API   — Unlimited. Game lore, characters, story, wiki lookups.
  2. RAWG.io API     — 20,000/month free. Game DB: genres, ratings, DLC, Metacritic.
  3. SteamSpy API    — Unlimited. Steam stats: player count, pricing, tags.
  4. Steam Web API   — Unlimited, no key. Official patch notes + live player counts.
  5. DuckDuckGo      — Unlimited, no key. General strategies, patch notes, guides.
  [Optional] Tavily  — 1000/month. User's own free key only. Enriches weak results.

Auto-routing:
  - "wiki"      → Wikipedia + RAWG (game lore, items, characters)
  - "patch"     → Steam News (official patch notes) → DuckDuckGo fallback
  - "strategy"  → DuckDuckGo + SteamSpy (builds, guides, meta)
  - "real_time" → Steam Players (live count) → SteamSpy → DuckDuckGo
  - "game_info" → RAWG (ratings, genres, release info)
  - "general"   → DuckDuckGo (fallback for everything else)
"""
import logging
import os
import time
import json
import urllib.request
import urllib.parse

logger = logging.getLogger(__name__)

# ── Task → Provider routing ───────────────────────────────────────────────────

TASK_ROUTING = {
    "wiki":        ["wikipedia", "rawg", "duckduckgo", "brave"],
    "patch":       ["steam_news", "reddit", "duckduckgo", "brave"],    # Steam News first: official, reliable
    "strategy":    ["reddit", "duckduckgo", "steamspy", "brave"],
    "walkthrough": ["reddit", "duckduckgo", "wikipedia", "brave"],
    "real_time":   ["steam_players", "steamspy", "duckduckgo", "brave"],  # Live player count
    "game_info":   ["rawg", "steamspy", "brave"],
    "price":       ["duckduckgo", "steamspy", "brave"],
    "general":     ["duckduckgo", "wikipedia", "brave", "reddit"],
}

TASK_DDG_SUFFIXES = {
    "wiki":        " wiki fandom character",
    "patch":       " patch notes",
    "strategy":    " guide",
    "walkthrough": " walkthrough",
    "price":       " steam sales deals",
    "general":     "",
}

DDG_MAX_RESULTS = {
    "patch": 3, "strategy": 5, "walkthrough": 5, "general": 3, "wiki": 2, "price": 5,
}


class WebSearchEngine:
    """
    Gaming-intelligence web search engine.
    Uses free, unlimited sources as primary providers.
    Truly production-safe — no keys required for core functionality.
    """

    def __init__(self, config: dict = None):
        self.config = config or {}
        self._cache: dict = {}
        self._cache_ttl = 300           # 5 minutes
        self._rawg_key = self._get_rawg_key()
        self._tavily_client = None
        self._tavily_available = False
        self._tavily_failures = 0
        self._tavily_disabled_until = 0.0
        self._init_tavily()             # Optional enhancement only
        

        self.was_search_triggered_this_tick = False
        self.last_search_status = "idle"
        # Steam app ID cache: game_name (lower) → appid (int)
        self._steam_appid_cache: dict = {}

    # ── Key Resolution ────────────────────────────────────────────────────────

    def _get_rawg_key(self) -> str:
        """RAWG key: 20,000 free req/month. Register at https://rawg.io/apidocs"""
        return (
            os.environ.get("RAWG_API_KEY")
            or self.config.get("web_search", {}).get("rawg_api_key", "")
        )

    def _init_tavily(self):
        """Optional Tavily upgrade — only if user provides their own key."""
        api_key = (
            os.environ.get("TAVILY_API_KEY")
            or self.config.get("web_search", {}).get("tavily_api_key", "")
        )
        if not api_key or api_key.strip() in ("", "YOUR_TAVILY_API_KEY_HERE"):
            return
        try:
            from tavily import TavilyClient
            self._tavily_client = TavilyClient(api_key=api_key.strip())
            self._tavily_available = True
            logger.info("Tavily enabled as optional search enhancer.")
        except Exception:
            pass

    def _urlopen_with_ua(self, url: str, timeout: float = 5.0):
        import ssl
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "MissionControl/1.0"}
        )
        try:
            context = ssl._create_unverified_context()
        except AttributeError:
            context = None
            
        if context:
            return urllib.request.urlopen(req, timeout=timeout, context=context)
        else:
            return urllib.request.urlopen(req, timeout=timeout)

    # ── Public API ────────────────────────────────────────────────────────────

    def _query_provider(self, provider: str, query: str, task: str, game_name: str) -> dict:
        """Helper to query a single search provider, wrapped for safety."""
        try:
            if provider == "tavily":
                res = self._search_tavily(query, task)
                return res if res else {"answer": "", "results": []}

            elif provider == "wikipedia":
                return self._search_wikipedia(query)
            elif provider == "rawg" and self._rawg_key:
                return self._search_rawg(game_name or query)
            elif provider == "steamspy":
                return self._search_steamspy(game_name or query)
            elif provider == "steam_news":
                return self._fetch_steam_patch_notes(game_name or query)
            elif provider == "steam_players":
                return self._fetch_steam_player_stats(game_name or query)
            elif provider == "duckduckgo":
                if task == "price" and not game_name:
                    return self._fetch_store_deals()
                else:
                    suffix = TASK_DDG_SUFFIXES.get(task, "")
                    max_results = DDG_MAX_RESULTS.get(task, 3)
                    return self._search_duckduckgo(query + suffix, max_results=max_results)
            elif provider == "brave":
                return self._search_brave(query, max_results=3)
            elif provider == "reddit":
                return self._search_reddit(query, max_results=3)
        except Exception as e:
            logger.debug(f"Provider '{provider}' failed: {e}")
        return {"answer": "", "results": []}

    def search(self, query: str, task: str = "general", game_name: str = "") -> dict:
        """
        Multi-source gaming search. Returns structured result with answer + sources.
        Works in dev and production with zero API key setup.
        """
        self.was_search_triggered_this_tick = True
        
        # Clean game_name of trademark symbols and spacing to ensure clean searching
        if game_name:
            for symbol in ["™", "®", "\u2122", "\u00ae"]:
                game_name = game_name.replace(symbol, "")
            game_name = " ".join(game_name.split())
        # Check Privacy Shield
        if self.config.get("privacy", {}).get("enabled", False):
            logger.info("Privacy Shield active: Blocking external web search to prevent external telemetry leakage.")
            self.last_search_status = "blocked"
            return {
                "answer": "Privacy Shield is active. External search disabled to protect your privacy and block external telemetry.",
                "results": [],
                "source": "privacy-shield",
                "task": task
            }

        # Selective prepend logic
        should_prepend = False
        if game_name:
            game_name_lower = game_name.lower().strip()
            query_lower = query.lower().strip()
            if game_name_lower not in query_lower:
                game_specific_tasks = {"patch", "strategy", "walkthrough", "real_time", "game_info", "price"}
                if task in game_specific_tasks:
                    should_prepend = True
                elif task in {"wiki", "general"}:
                    words = query.split()
                    if len(words) <= 3:
                        should_prepend = True

        if should_prepend:
            query = f"{game_name} {query}"

        cache_key = f"{task}::{query.lower().strip()}"
        if cache_key in self._cache:
            ts, result = self._cache[cache_key]
            if time.time() - ts < self._cache_ttl:
                self.last_search_status = "success"
                return {**result, "source": "cache"}

        providers = TASK_ROUTING.get(task, TASK_ROUTING["general"])
        
        # In production, prioritize Tavily to guarantee the latest information
        active_providers = list(providers)
        

        # Priority 1: Tavily (inserts at 0)
        if self._tavily_available and self._tavily_failures < 5:
            if time.time() >= self._tavily_disabled_until:
                if "tavily" not in active_providers:
                    active_providers.insert(0, "tavily")
                    
        # Priority 2: Brave Search API (inserts at 1, or 0 if Tavily unavailable)
        brave_key = os.environ.get("BRAVE_API_KEY")
        if brave_key and "brave" in active_providers:
            active_providers.remove("brave")
            insert_idx = 1 if "tavily" in active_providers else 0
            active_providers.insert(insert_idx, "brave")
                    
        merged_results = []
        answer = ""

        # Run all active search providers concurrently to optimize latency
        from concurrent.futures import ThreadPoolExecutor, as_completed
        results_by_provider = {}
        provider_failures = 0
        with ThreadPoolExecutor(max_workers=len(active_providers)) as executor:
            future_to_provider = {
                executor.submit(self._query_provider, provider, query, task, game_name): provider
                for provider in active_providers
            }
            for future in as_completed(future_to_provider):
                provider = future_to_provider[future]
                try:
                    res = future.result()
                    if res and (res.get("answer") or res.get("results")):
                        results_by_provider[provider] = res
                    else:
                        provider_failures += 1
                except Exception as e:
                    logger.debug(f"Concurrent search provider '{provider}' failed: {e}")
                    provider_failures += 1

        # Merge results keeping priority order
        for provider in active_providers:
            r = results_by_provider.get(provider)
            if r:
                if r.get("answer") and not answer:
                    answer = r["answer"]
                merged_results.extend(r.get("results", []))

        # Calculate final status
        if answer or merged_results:
            self.last_search_status = "success"
        else:
            total_attempted = len(active_providers)
            failed_count = provider_failures
            if failed_count >= total_attempted:
                self.last_search_status = "failed"
            else:
                self.last_search_status = "empty"

        result = {
            "answer": answer,
            "results": merged_results[:8],  # Cap at 8 total sources
            "source": "multi-source",
            "task": task,
        }
        self._cache[cache_key] = (time.time(), result)
        return result

    def detect_task(self, query: str) -> str:
        """Auto-detect the task type from the user's query for model + source routing."""
        q = query.lower()
        if any(k in q for k in ("walkthrough", "mission", "quest", "objective", "level", "stage", "chapter", "instruction", "gameplay", "full guide")):
            return "walkthrough"
        if any(k in q for k in ("wiki", "item", "weapon", "armor", "ability", "skill", "npc", "boss", "location", "lore", "story", "character", "who is", "who's", "cast", "protagonist", "antagonist", "villain", "hero")):
            return "wiki"
        if any(k in q for k in ("patch", "update", "changelog", "new season", "hotfix", "nerf", "buff", "what's new")):
            return "patch"
        if any(k in q for k in ("build", "strategy", "guide", "best", "tier list", "loadout", "combo", "how to", "tips")):
            return "strategy"
        if any(k in q for k in ("server", "down", "lag", "maintenance", "live", "right now", "today", "player count")):
            return "real_time"
        if any(k in q for k in ("rating", "review", "metacritic", "release", "genre", "developer", "publisher")):
            return "game_info"
        if any(k in q for k in ("price", "discount", "sale", "cheap", "cost", "deals", "buy", "shop", "specials", "steamdb")):
            return "price"
        return "general"

    # ── Provider: Wikipedia (Unlimited, No Key) ───────────────────────────────

    def _search_wikipedia(self, query: str) -> dict:
        """
        Wikipedia REST API — truly unlimited, no key, perfect for game wikis.
        Uses the official MediaWiki API (not scraping).
        """
        try:
            params = urllib.parse.urlencode({
                "action": "query",
                "list": "search",
                "srsearch": query,
                "format": "json",
                "srlimit": 3,
                "srnamespace": 0,
            })
            url = f"https://en.wikipedia.org/w/api.php?{params}"
            with self._urlopen_with_ua(url, timeout=5) as r:
                data = json.loads(r.read())

            search_results = data.get("query", {}).get("search", [])
            results = []
            answer = ""

            for item in search_results[:2]:
                title = item.get("title", "")
                snippet = item.get("snippet", "").replace("<span class=\"searchmatch\">", "").replace("</span>", "")
                page_url = f"https://en.wikipedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}"
                results.append({"title": title, "url": page_url, "content": snippet})
                if not answer and snippet:
                    answer = f"{title}: {snippet}"

            return {"answer": answer, "results": results, "source": "wikipedia"}
        except Exception as e:
            logger.debug(f"Wikipedia search failed: {e}")
            return {"answer": "", "results": [], "source": "wikipedia"}

    # ── Provider: RAWG.io (20,000 free/month with key) ────────────────────────

    def _search_rawg(self, game_name: str) -> dict:
        """
        RAWG.io Game Database — 20,000 req/month free.
        Get your free key: https://rawg.io/apidocs (no credit card)
        Returns: ratings, genres, metacritic, release date, DLC, platforms.
        """
        if not self._rawg_key:
            return {"answer": "", "results": [], "source": "rawg"}
        try:
            params = urllib.parse.urlencode({
                "key": self._rawg_key,
                "search": game_name,
                "page_size": 1,
                "ordering": "-relevance",
            })
            url = f"https://api.rawg.io/api/games?{params}"
            with self._urlopen_with_ua(url, timeout=6) as r:
                data = json.loads(r.read())

            games = data.get("results", [])
            if not games:
                return {"answer": "", "results": [], "source": "rawg"}

            g = games[0]
            name = g.get("name", "")
            rating = g.get("rating", 0)
            metacritic = g.get("metacritic") or "N/A"
            released = g.get("released", "Unknown")
            genres = ", ".join(gr["name"] for gr in g.get("genres", [])[:3])
            platforms = ", ".join(p["platform"]["name"] for p in g.get("platforms", [])[:4])
            rawg_url = f"https://rawg.io/games/{g.get('slug', '')}"

            answer = (
                f"{name} | ⭐ Rating: {rating}/5 | Metacritic: {metacritic} | "
                f"Released: {released} | Genres: {genres} | Platforms: {platforms}"
            )
            return {
                "answer": answer,
                "results": [{"title": name, "url": rawg_url, "content": answer}],
                "source": "rawg",
            }
        except Exception as e:
            logger.debug(f"RAWG search failed: {e}")
            return {"answer": "", "results": [], "source": "rawg"}

    # ── Provider: SteamSpy (Unlimited, No Key) ────────────────────────────────

    def _search_steamspy(self, game_name: str) -> dict:
        """
        SteamSpy API — completely free, no key required.
        Returns Steam player counts, tags, price, ownership estimates.
        """
        try:
            params = urllib.parse.urlencode({"request": "search", "term": game_name})
            url = f"https://steamspy.com/api.php?{params}"
            with self._urlopen_with_ua(url, timeout=6) as r:
                data = json.loads(r.read())

            if not data:
                return {"answer": "", "results": [], "source": "steamspy"}

            # SteamSpy returns a dict of appid → game data
            games = list(data.values())
            if not games:
                return {"answer": "", "results": [], "source": "steamspy"}

            g = games[0]
            name = g.get("name", "")
            owners = g.get("owners", "Unknown")
            score = g.get("score_rank", "N/A")
            price = g.get("price", 0)
            price_str = f"${price/100:.2f}" if isinstance(price, int) else "N/A"
            tags = ", ".join(list(g.get("tags", {}).keys())[:5])
            app_id = g.get("appid", "")
            steam_url = f"https://store.steampowered.com/app/{app_id}" if app_id else ""

            answer = (
                f"{name} | 👥 Owners: {owners} | Score: {score} | "
                f"Price: {price_str} | Tags: {tags}"
            )
            return {
                "answer": answer,
                "results": [{"title": name, "url": steam_url, "content": answer}],
                "source": "steamspy",
            }
        except Exception as e:
            logger.debug(f"SteamSpy search failed: {e}")
            return {"answer": "", "results": [], "source": "steamspy"}

    # ── Provider: Steam Web API (Unlimited, No Key) ────────────────────────────

    def _resolve_steam_appid(self, game_name: str) -> int:
        """Resolve a game name to a Steam App ID via the Steam Store search API.
        
        Uses a lightweight store search endpoint — no API key required.
        Results are cached in-memory for the session lifetime.
        Returns 0 if not found.
        """
        key = game_name.lower().strip()
        if key in self._steam_appid_cache:
            return self._steam_appid_cache[key]
        try:
            params = urllib.parse.urlencode({"term": game_name, "l": "english", "cc": "US", "category1": 998})
            url = f"https://store.steampowered.com/api/storesearch/?{params}"
            with self._urlopen_with_ua(url, timeout=6) as r:
                data = json.loads(r.read())
            items = data.get("items", [])
            if items:
                appid = int(items[0].get("id", 0))
                self._steam_appid_cache[key] = appid
                return appid
        except Exception as e:
            logger.debug(f"Steam App ID resolution failed for '{game_name}': {e}")
        self._steam_appid_cache[key] = 0
        return 0

    def _fetch_steam_patch_notes(self, game_name: str) -> dict:
        """Fetch the latest patch notes via ISteamNews/GetNewsForApp.
        
        Steam News is the canonical source for official patch notes, changelogs, and
        hotfixes. No API key required. Returns the 3 most recent game news items
        filtered to those that look like patch notes.
        """
        appid = self._resolve_steam_appid(game_name)
        if not appid:
            return {"answer": "", "results": [], "source": "steam_news"}
        try:
            params = urllib.parse.urlencode({
                "appid": appid,
                "count": 10,
                "maxlength": 600,
                "format": "json",
            })
            url = f"https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?{params}"
            with self._urlopen_with_ua(url, timeout=7) as r:
                data = json.loads(r.read())

            news_items = data.get("appnews", {}).get("newsitems", [])
            if not news_items:
                return {"answer": "", "results": [], "source": "steam_news"}

            # Filter: prefer items that look like patch notes
            patch_keywords = ("patch", "update", "hotfix", "fix", "changelog", "version", "v", "build", "nerf", "buff")
            patch_items = [
                n for n in news_items
                if any(kw in n.get("title", "").lower() for kw in patch_keywords)
            ] or news_items  # fall back to all items if none match

            results = []
            for item in patch_items[:3]:
                title = item.get("title", "")
                contents = item.get("contents", "")[:500].strip()
                url_link = item.get("url", f"https://store.steampowered.com/news/app/{appid}")
                import datetime
                date_ts = item.get("date", 0)
                date_str = datetime.datetime.fromtimestamp(date_ts).strftime("%Y-%m-%d") if date_ts else "Unknown"
                results.append({"title": f"{title} ({date_str})", "url": url_link, "content": contents})

            answer = f"[Steam News — {game_name}] {results[0]['title']}: {results[0]['content']}" if results else ""
            return {"answer": answer, "results": results, "source": "steam_news"}
        except Exception as e:
            logger.debug(f"Steam News fetch failed for '{game_name}' (appid={appid}): {e}")
            return {"answer": "", "results": [], "source": "steam_news"}

    def _fetch_steam_player_stats(self, game_name: str) -> dict:
        """Fetch current player count via ISteamUserStats/GetNumberOfCurrentPlayers.
        
        Provides real-time concurrent player count directly from Steam's servers.
        No API key required. Complements SteamSpy's historical ownership data.
        """
        appid = self._resolve_steam_appid(game_name)
        if not appid:
            return {"answer": "", "results": [], "source": "steam_players"}
        try:
            params = urllib.parse.urlencode({"appid": appid, "format": "json"})
            url = f"https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?{params}"
            with self._urlopen_with_ua(url, timeout=6) as r:
                data = json.loads(r.read())

            player_count = data.get("response", {}).get("player_count", 0)
            steam_url = f"https://store.steampowered.com/app/{appid}"
            answer = f"{game_name} — 🎮 {player_count:,} players online right now (Steam)"
            return {
                "answer": answer,
                "results": [{"title": f"{game_name} live players", "url": steam_url, "content": answer}],
                "source": "steam_players",
            }
        except Exception as e:
            logger.debug(f"Steam player count failed for '{game_name}' (appid={appid}): {e}")
            return {"answer": "", "results": [], "source": "steam_players"}

    def _fetch_store_deals(self) -> dict:
        """Fetch current featured specials from Steam (Regional INR) and Free Games from Epic."""
        deals_text = []
        results = []
        
        # 1. Fetch Steam Specials (with Regional Pricing for India: cc=IN)
        try:
            url = "https://store.steampowered.com/api/featuredcategories/?cc=IN"
            with self._urlopen_with_ua(url, timeout=6) as r:
                data = json.loads(r.read())
            
            specials = data.get("specials", {}).get("items", [])
            for item in specials[:5]:
                name = item.get("name", "Unknown Game")
                discount = item.get("discount_percent", 0)
                final_price = item.get("final_price", 0) / 100
                deals_text.append(f"[Steam] {name}: {discount}% off (INR {final_price:.0f})")
                results.append({
                    "title": f"[Steam] {name} - {discount}% off",
                    "url": f"https://store.steampowered.com/app/{item.get('id', '')}",
                    "content": f"{name} is currently on sale on Steam for INR {final_price:.0f} ({discount}% off)."
                })
        except Exception as e:
            logger.debug(f"Steam store deals fetch failed: {e}")
            
        # 2. Fetch Epic Free Games & Top Discounts
        try:
            url = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=IN&allowCountries=IN"
            with self._urlopen_with_ua(url, timeout=5) as r:
                data = json.loads(r.read())
                elements = data.get("data", {}).get("Catalog", {}).get("searchStore", {}).get("elements", [])
                for game in elements:
                    proms = game.get("promotions")
                    if proms and proms.get("promotionalOffers"):
                        offers = proms["promotionalOffers"]
                        if offers and offers[0].get("promotionalOffers"):
                            name = game.get("title", "Unknown")
                            price_info = game.get("price", {}).get("totalPrice", {})
                            original_price = price_info.get("originalPrice", 0) / 100
                            discount_price = price_info.get("discountPrice", 0) / 100
                            
                            if discount_price == 0 and original_price > 0:
                                deals_text.append(f"[Epic] {name} is 100% FREE!")
                                results.append({
                                    "title": f"[Epic Games] {name} - FREE",
                                    "url": "https://store.epicgames.com/en-US/free-games",
                                    "content": f"{name} is currently 100% free to claim on the Epic Games Store (was INR {original_price:.0f})."
                                })
                            elif discount_price > 0 and original_price > 0:
                                discount_pct = int((1 - (discount_price / original_price)) * 100)
                                deals_text.append(f"[Epic] {name}: {discount_pct}% off (INR {discount_price:.0f})")
                                results.append({
                                    "title": f"[Epic Games] {name} - {discount_pct}% off",
                                    "url": "https://store.epicgames.com/en-US/",
                                    "content": f"{name} is currently on sale on Epic Games for INR {discount_price:.0f} (down from INR {original_price:.0f})."
                                })
        except Exception as e:
            logger.debug(f"Epic Games free fetch failed: {e}")
            
        # 3. Fetch EA, Ubisoft, GOG Deals via CheapShark (Displaying in USD to avoid regional conversion issues)
        try:
            store_map = {"7": "GOG", "8": "EA", "13": "Ubisoft"}
            url = "https://www.cheapshark.com/api/1.0/deals?storeID=7,8,13&upperPrice=50&sortBy=DealRating&onSale=1&pageSize=5"
            with self._urlopen_with_ua(url, timeout=5) as r:
                data = json.loads(r.read())
                for deal in data:
                    name = deal.get("title", "Unknown Game")
                    sale_price_usd = float(deal.get("salePrice", 0))
                    store_id = deal.get("storeID", "7")
                    store_name = store_map.get(store_id, "Unknown Store")
                    discount = int(float(deal.get("savings", 0)))
                    deals_text.append(f"[{store_name}] {name}: {discount}% off (${sale_price_usd:.2f} USD)")
                    results.append({
                        "title": f"[{store_name}] {name} - {discount}% off",
                        "url": f"https://www.cheapshark.com/redirect?dealID={deal.get('dealID')}",
                        "content": f"{name} is currently on sale on {store_name} for ${sale_price_usd:.2f} USD."
                    })
        except Exception as e:
            logger.debug(f"CheapShark EA/Ubisoft fetch failed: {e}")

        if not deals_text:
            return {"answer": "", "results": [], "source": "store_apis"}
            
        answer = "Here are the top Regional Deals and Free Games right now: " + " | ".join(deals_text)
        return {"answer": answer, "results": results, "source": "store_apis"}

    # ── Provider: DuckDuckGo (Unlimited, No Key) ──────────────────────────────

    def _search_duckduckgo(self, query: str, max_results: int = 3) -> dict:
        """DuckDuckGo — unlimited, no key, general-purpose fallback."""
        results = []
        answer = ""
        try:
            from ddgs import DDGS
            with DDGS() as ddgs:
                hits = list(ddgs.text(query, max_results=max_results))
                results = [{"title": h["title"], "url": h["href"], "content": h["body"]} for h in hits]
                if results:
                    answer = results[0]["content"][:500]
        except Exception:
            # Ultra-fallback: DuckDuckGo Instant Answer (stdlib only)
            try:
                url = "https://api.duckduckgo.com/?q=" + urllib.parse.quote(query) + "&format=json&no_html=1"
                with self._urlopen_with_ua(url, timeout=5) as r:
                    d = json.loads(r.read())
                    answer = d.get("AbstractText") or d.get("Answer") or ""
                    for t in d.get("RelatedTopics", [])[:3]:
                        if isinstance(t, dict) and t.get("FirstURL"):
                            results.append({"title": t.get("Text", "")[:60], "url": t["FirstURL"], "content": t.get("Text", "")})
            except Exception as e2:
                logger.debug(f"DuckDuckGo instant answer failed: {e2}")

        return {"answer": answer, "results": results, "source": "duckduckgo"}

    # ── Provider: Brave Search (Optional, User Key Only, 2000 free/month) ────────
    
    def _search_brave(self, query: str, max_results: int = 3) -> dict:
        """Brave Search API — extremely high quality, 2000 free requests per month."""
        results = []
        answer = ""
        api_key = os.environ.get("BRAVE_API_KEY")
        if not api_key:
            return {"answer": "", "results": [], "source": "brave"}
            
        try:
            url = f"https://api.search.brave.com/res/v1/web/search?q={urllib.parse.quote(query)}&count={max_results}"
            req = urllib.request.Request(url, headers={
                "Accept": "application/json",
                "Accept-Encoding": "gzip",
                "X-Subscription-Token": api_key,
                "User-Agent": "MissionControl/1.0"
            })
            with urllib.request.urlopen(req, timeout=5) as r:
                if r.info().get('Content-Encoding') == 'gzip':
                    import gzip
                    data = gzip.decompress(r.read())
                else:
                    data = r.read()
                d = json.loads(data)
                web_results = d.get("web", {}).get("results", [])
                for item in web_results:
                    extra_snippets = item.get("extra_snippets", [])
                    extra_snippet = extra_snippets[0] if isinstance(extra_snippets, list) and len(extra_snippets) > 0 else ""
                    desc = item.get("description", "") or extra_snippet
                    results.append({"title": item.get("title", ""), "url": item.get("url", ""), "content": desc})
                if results:
                    answer = results[0]["content"][:500]
        except Exception as e:
            logger.debug(f"Brave Search failed: {e}")
            
        return {"answer": answer, "results": results, "source": "brave"}

    # ── Provider: Reddit (JSON API, Truly Free) ──────────────────────────────
    
    def _search_reddit(self, query: str, max_results: int = 3) -> dict:
        """Reddit JSON scraper for meta/strategies."""
        results = []
        answer = ""
        try:
            # We append 'site:reddit.com' logic to the internal Reddit search
            clean_query = query.replace("site:reddit.com", "").strip()
            url = f"https://www.reddit.com/search.json?q={urllib.parse.quote(clean_query)}&limit={max_results}&sort=relevance"
            with self._urlopen_with_ua(url, timeout=5) as r:
                d = json.loads(r.read())
                children = d.get("data", {}).get("children", [])
                for child in children:
                    post = child.get("data", {})
                    title = post.get("title", "")
                    content = post.get("selftext", "")
                    url = f"https://www.reddit.com{post.get('permalink', '')}"
                    if not content:
                        continue # Skip image-only or link-only posts
                    results.append({"title": f"[Reddit] {title}", "url": url, "content": content[:800]})
                if results:
                    answer = results[0]["content"][:500]
        except Exception as e:
            logger.debug(f"Reddit Search failed: {e}")
            
        return {"answer": answer, "results": results, "source": "reddit"}

    # ── Provider: Tavily (Optional, User Key Only) ────────────────────────────

    def _search_tavily(self, query: str, task: str) -> dict | None:
        try:
            resp = self._tavily_client.search(
                query=query,
                search_depth="advanced" if task in ("wiki", "strategy") else "basic",
                max_results=5,
                include_answer=True,
            )
            self._tavily_failures = 0
            return {
                "answer": resp.get("answer", ""),
                "results": [{"title": r.get("title", ""), "url": r.get("url", ""), "content": r.get("content", "")} for r in resp.get("results", [])],
                "source": "tavily",
            }
        except Exception as e:
            self._tavily_failures += 1
            if "429" in str(e):
                self._tavily_disabled_until = time.time() + 60
            elif "401" in str(e) or "403" in str(e):
                self._tavily_available = False
            return None


    @property
    def is_available(self) -> bool:
        return True  # DuckDuckGo always works

