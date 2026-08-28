"""
Mission Control — Distributed Game Library Server
db.py: Multi-Tier High-Availability Database & Backup Connection Manager.

Supports Redundancy & Disaster Recovery:
  Tier 1: Primary Cloud PostgreSQL (DATABASE_URL / Supabase host: db.vekqkwwzzamwhitjodld.supabase.co)
  Tier 2: Local SQLite Disk Replica (catalog_fallback.db — Zero-Downtime Offline Engine)
  Tier 3: MongoDB Atlas Cloud NoSQL Standby (MONGODB_URI — Asynchronous Document JSON Mirror)
  Tier 4: Unlimited Immutable JSONL Backup Ledger (unlimited_catalog_backup.jsonl — Append-Only Recovery)
"""

import hashlib
import json
import logging
import os
import time
import sqlite3
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional
import re
import urllib.parse
from dotenv import load_dotenv

# Load .env (search local, backend, root) — override=False ensures host/cloud env vars take precedence
for _env_path in [
    os.path.join(os.path.dirname(__file__), ".env"),
    os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
    os.path.join(os.path.dirname(__file__), "..", ".env"),
]:
    if os.path.exists(_env_path):
        load_dotenv(_env_path, override=False)
        break

logger = logging.getLogger(__name__)

try:
    import psycopg2
    import psycopg2.extras
    _PSYCOPG2_AVAILABLE = True
except ImportError:
    _PSYCOPG2_AVAILABLE = False
    logger.warning("psycopg2 not available. Install psycopg2-binary.")


QUERIES_DIR = Path(__file__).parent / "queries"


def _load_sql(name: str) -> str:
    return (QUERIES_DIR / f"{name}.sql").read_text(encoding="utf-8-sig")

def _sanitize_db_url(raw_url: str) -> str:
    if not raw_url:
        return ""
    # Strip any enclosing quotes, spaces, tabs, and Windows CRLF (\r\n)
    url = raw_url.strip().strip('"').strip("'").strip()
    url = re.sub(r'[\r\n\t"\']', '', url)
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    
    # Parse and clean query parameters
    try:
        parsed = urllib.parse.urlparse(url)
        params = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
        clean_params = {}
        for k, vals in params.items():
            clean_k = k.strip().strip('"').strip("'")
            clean_params[clean_k] = [v.strip().strip('"').strip("'") for v in vals]
        
        # Ensure sslmode is valid and present
        valid_sslmodes = {"require", "verify-full", "verify-ca", "prefer", "allow", "disable"}
        if "sslmode" not in clean_params or not clean_params["sslmode"] or clean_params["sslmode"][0] not in valid_sslmodes:
            clean_params["sslmode"] = ["require"]
            
        new_query = urllib.parse.urlencode(clean_params, doseq=True)
        return urllib.parse.urlunparse(parsed._replace(query=new_query))
    except Exception:
        if "sslmode" not in url:
            sep = "&" if "?" in url else "?"
            url = f"{url}{sep}sslmode=require"
        return url

class LibraryDB:
    """
    Thread-safe Multi-Tier PostgreSQL/SQLite connection manager.
    """

    def __init__(self, database_url: Optional[str] = None):
        raw_primary = database_url or os.getenv("ORACLE_DATABASE_URL") or os.getenv("DATABASE_URL", "")
        
        self._url_primary = _sanitize_db_url(raw_primary)
        self._conn = None
        self._active_tier = 0  # 0=None, 1=Primary, 2=SQLite, 3=Mongo
        
        self.available = False
        
        self._sqlite_path = Path(os.path.dirname(__file__)) / "data" / "catalog_fallback.db"
        self._sqlite_path.parent.mkdir(parents=True, exist_ok=True)
        self._jsonl_backup_path = Path(os.path.dirname(__file__)) / "data" / "unlimited_catalog_backup.jsonl"
        self._sqlite_conn = None
        self._init_sqlite()

        # MongoDB Atlas NoSQL Standby Setup (if MONGODB_URI configured)
        self._mongo_uri = os.getenv("MONGODB_URI", "")
        self._mongo_client = None
        self._mongo_col = None
        self._init_mongo()

        if not _PSYCOPG2_AVAILABLE and not self._url_primary:
            logger.warning("LibraryDB: psycopg2 or DATABASE_URL not available. Defaulting to Tier 2 (SQLite).")
            self._active_tier = 2
            self.available = True
            return

        # Retry loop: Cloud connection negotiation
        for attempt in range(1, 4):
            self._connect()
            if self._active_tier == 1:
                break
            logger.warning("LibraryDB: Cloud Startup attempt %d/3 failed, retrying in 5s...", attempt)
            time.sleep(5)
            
        if self._active_tier != 1:
            logger.error("LibraryDB: Could not connect to Cloud PostgreSQL. Falling back to Tier 2 (SQLite).")
            self._active_tier = 2
            self.available = True

    @property
    def active_tier_name(self) -> str:
        if self._active_tier == 1:
            prov = "Supabase" if "supabase" in self._url_primary.lower() else "Neon Serverless" if "neon.tech" in self._url_primary.lower() else "Primary Cloud Postgres"
            return f"Tier 1 ({prov} / Primary)"
        elif self._active_tier == 2:
            return "Tier 2 (SQLite NVMe Disk Replica)"
        elif self._active_tier == 3:
            return "Tier 3 (MongoDB Atlas Mirror)"
        return f"Tier {self._active_tier}"

    # ── Tier 2 SQLite Initialization ──────────────────────────────────────────

    def _init_sqlite(self):
        try:
            self._sqlite_conn = sqlite3.connect(self._sqlite_path, check_same_thread=False)
            self._sqlite_conn.row_factory = sqlite3.Row
            with self._sqlite_conn:
                self._sqlite_conn.execute("PRAGMA cache_size = -2000;")
                self._sqlite_conn.execute("PRAGMA synchronous = NORMAL;")
                self._sqlite_conn.execute("PRAGMA temp_store = MEMORY;")
                self._sqlite_conn.execute('''
                    CREATE TABLE IF NOT EXISTS canonical_games (
                        id TEXT PRIMARY KEY,
                        title TEXT,
                        normalized_title TEXT,
                        developer TEXT,
                        publisher TEXT,
                        release_date TEXT,
                        primary_genre TEXT,
                        genres TEXT,
                        tags TEXT,
                        features TEXT,
                        platforms TEXT,
                        launchers TEXT,
                        cover_url TEXT,
                        banner_url TEXT,
                        description TEXT,
                        slug TEXT,
                        source TEXT,
                        source_game_id TEXT,
                        last_scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        ai_classified BOOLEAN,
                        ai_confidence REAL,
                        raw_tags TEXT,
                        metadata TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                self._sqlite_conn.execute('''
                    CREATE TABLE IF NOT EXISTS library_nodes (
                        node_id TEXT PRIMARY KEY,
                        name TEXT,
                        hostname TEXT,
                        ip TEXT,
                        platform TEXT,
                        status TEXT,
                        auth_token_hash TEXT,
                        clerk_id TEXT,
                        auth_provider TEXT,
                        storage_total INTEGER,
                        storage_used INTEGER,
                        storage_free INTEGER,
                        scan_paths TEXT,
                        last_heartbeat TIMESTAMP,
                        version TEXT,
                        metadata TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                self._sqlite_conn.execute('''
                    CREATE TABLE IF NOT EXISTS game_installations (
                        id TEXT PRIMARY KEY,
                        node_id TEXT,
                        game_id TEXT,
                        store TEXT,
                        store_app_id TEXT,
                        install_path TEXT,
                        exe_path TEXT,
                        version TEXT,
                        size_bytes INTEGER,
                        status TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
            logger.info("LibraryDB: Tier 2 SQLite Replica initialized at %s", self._sqlite_path)
        except Exception as e:
            logger.error("LibraryDB: Failed to initialize SQLite replica: %s", e)

    # ── Tier 3: NoSQL MongoDB Atlas Cloud Mirror ─────────────────────────────

    def _init_mongo(self):
        """
        Initializes optional MongoDB Atlas connection for NoSQL cloud document mirroring.
        When MONGODB_URI is provided in .env, every game ingested into PostgreSQL is
        asynchronously mirrored as a flexible JSON document in MongoDB Atlas.
        """
        if not self._mongo_uri:
            return
        try:
            from pymongo import MongoClient
            self._mongo_client = MongoClient(self._mongo_uri, serverSelectionTimeoutMS=4000)
            self._mongo_db = self._mongo_client["mission_control"]
            self._mongo_col = self._mongo_db["canonical_games"]
            logger.info("LibraryDB: Connected to Tier 3 MongoDB Atlas NoSQL Standby.")
        except Exception as e:
            logger.debug("LibraryDB: MongoDB Atlas init skipped or pymongo not installed: %s", e)

    def _mongo_upsert_game(self, payload: Dict[str, Any]):
        """
        Asynchronously mirrors a game record into MongoDB Atlas collection 'canonical_games'.
        Provides unstructured document-level redundancy across separate cloud providers.
        """
        if self._mongo_col is None:
            return
        try:
            doc = dict(payload)
            doc["_id"] = payload["id"]
            self._mongo_col.update_one({"_id": doc["_id"]}, {"$set": doc}, upsert=True)
        except Exception as e:
            logger.debug("MongoDB Atlas async mirror error: %s", e)

    # ── Tier 4: Unlimited Immutable JSONL Backup Ledger ───────────────────────

    def _append_jsonl_backup(self, payload: Dict[str, Any]):
        """
        Persists every game payload to an append-only unlimited JSONL backup ledger on disk.
        Guarantees cold disaster recovery with zero network or database dependencies.
        """
        try:
            line = json.dumps(payload) + "\n"
            with open(self._jsonl_backup_path, "a", encoding="utf-8") as f:
                f.write(line)
        except Exception as e:
            logger.debug("JSONL backup error: %s", e)

    # ── Connection Management ────────────────────────────────────────────────

    def _connect(self):
        # Try Tier 1 (Primary)
        if self._url_primary:
            try:
                self._conn = psycopg2.connect(self._url_primary, connect_timeout=10)
                self._conn.autocommit = False
                self._ensure_schema()
                self.available = True
                self._active_tier = 1
                logger.info("LibraryDB: Connected to Tier 1 PostgreSQL.")
                return
            except Exception as exc:
                logger.warning("LibraryDB: Tier 1 Connection failed: %s", exc)
                self._conn = None
                
        # If cloud tier fails, Tier 2 is active (Local SQLite)
        self._active_tier = 2
        self.available = True

    def _alive(self) -> bool:
        if self._active_tier >= 2:
            return True  # SQLite is always alive
        if not self._conn:
            return False
        try:
            with self._conn.cursor() as cur:
                cur.execute("SELECT 1")
            return True
        except Exception:
            return False

    def _ensure_connected(self) -> bool:
        if not self._alive():
            logger.info("LibraryDB: Connection lost. Re-evaluating Tiers...")
            self._connect()
        return self.available

    def ping(self) -> bool:
        """Pings the database with an active SELECT 1 query to verify health."""
        if not self._conn and self._active_tier < 2:
            return self._ensure_connected()
        if self._active_tier >= 2:
            return True
        try:
            with self._conn.cursor() as cur:
                cur.execute("SELECT 1")
            return True
        except Exception:
            return self._ensure_connected()

    def _ensure_schema(self):
        try:
            schema_sql = _load_sql("schema")
            with self._conn.cursor() as cur:
                cur.execute(schema_sql)
            self._conn.commit()
            logger.info("LibraryDB: Schema verified/created in Cloud Postgres.")
        except Exception as exc:
            if self._conn:
                try:
                    self._conn.rollback()
                except Exception:
                    pass
            logger.warning("LibraryDB: Schema setup notice (non-fatal, tables may already exist): %s", exc)

    # ── Generic Query Helpers ────────────────────────────────────────────────

    def execute(self, sql: str, params=None, fetch: str = "none") -> Any:
        """Execute a query against PostgreSQL."""
        if not self._ensure_connected():
            raise RuntimeError("LibraryDB: Not connected.")
            
        if self._active_tier >= 2:
            raise RuntimeError("LibraryDB: 'execute' called on Postgres SQL while in SQLite mode. Use direct methods instead.")

        try:
            with self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(sql, params or {})
                if fetch == "one":
                    result = cur.fetchone()
                    self._conn.commit()
                    return dict(result) if result else None
                elif fetch == "all":
                    result = cur.fetchall()
                    self._conn.commit()
                    return [dict(r) for r in result]
                else:
                    self._conn.commit()
                    return None
        except Exception as exc:
            self._conn.rollback()
            logger.error("LibraryDB: Query failed on Tier %d: %s | SQL: %.200s", self._active_tier, exc, sql)
            # Simple connection drop failover
            self._conn = None
            raise

    # ── SQLite Query Helpers ──────────────────────────────────────────────────

    def _sqlite_execute(self, sql: str, params: Dict[str, Any] = None, fetch: str = "none") -> Any:
        try:
            cur = self._sqlite_conn.execute(sql, params or {})
            if fetch == "one":
                row = cur.fetchone()
                self._sqlite_conn.commit()
                return dict(row) if row else None
            elif fetch == "all":
                rows = cur.fetchall()
                self._sqlite_conn.commit()
                return [dict(r) for r in rows]
            else:
                self._sqlite_conn.commit()
                return None
        except Exception as exc:
            self._sqlite_conn.rollback()
            logger.error("LibraryDB: SQLite Query failed: %s | SQL: %s", exc, sql)
            raise

    # ── Canonical Games ──────────────────────────────────────────────────────

    def _sqlite_upsert_game(self, payload: Dict[str, Any]) -> None:
        """Snapshot game to Tier 2."""
        if not self._sqlite_conn:
            return
        sql = '''
            INSERT INTO canonical_games (
                id, title, normalized_title, developer, publisher, release_date, primary_genre,
                genres, tags, features, platforms, launchers, cover_url, banner_url,
                description, slug, source, source_game_id, ai_classified, ai_confidence, raw_tags, metadata, updated_at
            ) VALUES (
                :id, :title, :normalized_title, :developer, :publisher, :release_date, :primary_genre,
                :genres, :tags, :features, :platforms, :launchers, :cover_url, :banner_url,
                :description, :slug, :source, :source_game_id, :ai_classified, :ai_confidence, :raw_tags, :metadata, CURRENT_TIMESTAMP
            ) ON CONFLICT(id) DO UPDATE SET
                title=:title, normalized_title=:normalized_title, developer=:developer, publisher=:publisher,
                release_date=:release_date, primary_genre=:primary_genre, genres=:genres, tags=:tags,
                features=:features, platforms=:platforms, launchers=:launchers, cover_url=:cover_url,
                banner_url=:banner_url, description=:description, slug=:slug, source=:source,
                source_game_id=:source_game_id, ai_classified=:ai_classified,
                ai_confidence=:ai_confidence, raw_tags=:raw_tags, metadata=:metadata, updated_at=CURRENT_TIMESTAMP
        '''
        sqlite_payload = dict(payload)
        for k in ["genres", "tags", "features", "platforms", "launchers", "raw_tags"]:
            sqlite_payload[k] = json.dumps(payload.get(k) or [])
        if "metadata" not in sqlite_payload or not isinstance(sqlite_payload["metadata"], str):
             sqlite_payload["metadata"] = json.dumps(payload.get("metadata") or {})
        try:
            self._sqlite_execute(sql, sqlite_payload)
        except Exception as e:
            logger.warning("LibraryDB: Failed to snapshot game to SQLite: %s", e)

    def upsert_game(self, game: Dict[str, Any]) -> None:
        payload = {
            "id":               game.get("id"),
            "title":            game.get("title"),
            "normalized_title": game.get("normalized_title"),
            "slug":             game.get("slug") or game.get("id"),
            "source":           game.get("source") or "web",
            "source_game_id":   game.get("source_game_id") or game.get("id"),
            "developer":        game.get("developer"),
            "publisher":        game.get("publisher"),
            "release_date":     game.get("release_date"),
            "primary_genre":    game.get("primary_genre") or "Action",
            "genres":           game.get("genres") or ["Action"],
            "tags":             game.get("tags") or ["PC"],
            "features":         game.get("features") or [],
            "platforms":        game.get("platforms") or ["Windows", "Linux"],
            "launchers":        game.get("launchers") or ["Steam"],
            "cover_url":        game.get("cover_url"),
            "banner_url":       game.get("banner_url"),
            "description":      game.get("description") or game.get("summary"),
            "ai_classified":    bool(game.get("ai_classified", False)),
            "ai_confidence":    float(game.get("ai_confidence", 0.0) or 0.0),
            "raw_tags":         game.get("raw_tags") or game.get("tags") or [],
            "metadata":         json.dumps(game.get("metadata", {})) if isinstance(game.get("metadata"), dict) else (game.get("metadata") or "{}"),
        }
        
        # Postgres execution
        if self._active_tier == 1:
            try:
                sql = _load_sql("upsert_game")
                self.execute(sql, payload)
            except Exception as e:
                logger.error("LibraryDB: Postgres upsert_game failed: %s", e)
                
        # Always mirror to SQLite, JSONL Backup Ledger, and MongoDB Atlas (NoSQL)
        def _background_mirrors(p):
            self._sqlite_upsert_game(p)
            self._append_jsonl_backup(p)
            self._mongo_upsert_game(p)

        threading.Thread(target=_background_mirrors, args=(payload,), daemon=True).start()

    def upsert_games_bulk(self, games: List[Dict[str, Any]]) -> int:
        saved = 0
        for g in games:
            self.upsert_game(g)
            saved += 1
        return saved

    def _sqlite_get_game(self, game_id: str) -> Optional[Dict]:
        game = self._sqlite_execute("SELECT * FROM canonical_games WHERE id = :id", {"id": game_id}, fetch="one")
        if not game:
            return None
        for k in ["genres", "tags", "features", "platforms", "launchers", "raw_tags", "metadata"]:
            if game.get(k):
                try:
                    game[k] = json.loads(game[k])
                except Exception:
                    game[k] = [] if k != "metadata" else {}
                    
        insts = self._sqlite_execute(
            """SELECT i.*, n.name AS nodeName, n.status AS nodeStatus
               FROM game_installations i
               LEFT JOIN library_nodes n ON n.node_id = i.node_id
               WHERE i.game_id = :id""", {"id": game_id}, fetch="all"
        )
        game["installations"] = []
        for i in insts:
            game["installations"].append({
                "id": i["id"],
                "nodeId": i["node_id"],
                "nodeName": i["nodeName"],
                "nodeStatus": i["nodeStatus"],
                "store": i["store"],
                "storeAppId": i["store_app_id"],
                "installPath": i["install_path"],
                "exePath": i["exe_path"],
                "version": i["version"],
                "sizeBytes": i["size_bytes"],
                "status": i["status"]
            })
        return game

    def get_game(self, game_id: str) -> Optional[Dict]:
        if self._active_tier >= 2:
            return self._sqlite_get_game(game_id)
            
        sql = """
            SELECT g.*, COALESCE(
                json_agg(json_build_object(
                    'nodeId', i.node_id, 'nodeName', n.name, 'nodeStatus', n.status,
                    'store', i.store, 'storeAppId', i.store_app_id,
                    'installPath', i.install_path, 'exePath', i.exe_path,
                    'version', i.version, 'sizeBytes', i.size_bytes, 'status', i.status
                )) FILTER (WHERE i.id IS NOT NULL), '[]'::json
            ) AS installations
            FROM canonical_games g
            LEFT JOIN game_installations i ON i.game_id = g.id
            LEFT JOIN library_nodes n ON n.node_id = i.node_id
            WHERE g.id = %(id)s
            GROUP BY g.id
        """
        try:
            return self.execute(sql, {"id": game_id}, fetch="one")
        except Exception:
            logger.warning("LibraryDB: Falling back to SQLite for get_game.")
            return self._sqlite_get_game(game_id)

    def _sqlite_get_catalog(self, search, genre, node_id, clerk_id, store, installed_only, last_seen_id, page, limit) -> List[Dict]:
        query = "SELECT * FROM canonical_games WHERE 1=1"
        params = {}
        if search:
            query += " AND (title LIKE :search OR normalized_title LIKE :search)"
            params["search"] = f"%{search}%"
        if genre:
            query += " AND (primary_genre LIKE :genre OR genres LIKE :genre)"
            params["genre"] = f"%{genre}%"
        if last_seen_id:
            query += " AND id > :last_seen_id"
            params["last_seen_id"] = last_seen_id
            
        query += " ORDER BY id ASC LIMIT :limit OFFSET :offset"
        offset = 0 if last_seen_id else (page - 1) * limit
        params["limit"] = limit
        params["offset"] = offset
        
        games = self._sqlite_execute(query, params, fetch="all")
        results = []
        for g in games:
            for k in ["genres", "tags", "features", "platforms", "launchers", "raw_tags", "metadata"]:
                if g.get(k):
                    try:
                        g[k] = json.loads(g[k])
                    except Exception:
                        g[k] = [] if k != "metadata" else {}
            # We skip heavy install filtering in sqlite fallback for brevity, just attach basic []
            g["installations"] = []
            results.append(g)
        return results

    def get_catalog(
        self,
        search: Optional[str] = None,
        genre: Optional[str] = None,
        node_id: Optional[str] = None,
        clerk_id: Optional[str] = None,
        store: Optional[str] = None,
        installed_only: bool = False,
        last_seen_id: Optional[str] = None,
        page: int = 1,
        limit: int = 48,
        need_installations: bool = False,
    ) -> List[Dict]:
        # Only JOIN installation tables when the caller needs them (saves a heavy json_agg at 26K+ rows)
        need_installations = need_installations or installed_only or bool(node_id) or bool(clerk_id)
        if self._active_tier >= 2:
            return self._sqlite_get_catalog(search, genre, node_id, clerk_id, store, installed_only, last_seen_id, page, limit)
            
        sql = _load_sql("load_catalog")
        offset = 0 if last_seen_id else (page - 1) * limit
        try:
            return self.execute(sql, {
                "search": search or None,
                "search_like": (search or "").lower(),
                "genre": genre or None,
                "node_id": node_id or None,
                "clerk_id": clerk_id or None,
                "store": store or None,
                "installed_only": installed_only,
                "need_installations": need_installations,
                "last_seen_id": last_seen_id,
                "limit": limit,
                "offset": offset,
            }, fetch="all")
        except Exception:
            logger.warning("LibraryDB: Falling back to SQLite for get_catalog.")
            return self._sqlite_get_catalog(search, genre, node_id, clerk_id, store, installed_only, last_seen_id, page, limit)


    def get_installations_for_game(self, game_id: str, clerk_id: Optional[str] = None) -> List[Dict]:
        if self._active_tier >= 2:
            return [] # Simplified fallback
            
        if clerk_id:
            sql = """
                SELECT i.*, n.name AS node_name, n.status AS node_status, n.hostname, n.ip
                FROM game_installations i
                JOIN library_nodes n ON n.node_id = i.node_id
                WHERE i.game_id = %(game_id)s AND n.clerk_id = %(clerk_id)s
                ORDER BY n.name, i.store
            """
            return self.execute(sql, {"game_id": game_id, "clerk_id": clerk_id}, fetch="all")
        sql = """
            SELECT i.*, n.name AS node_name, n.status AS node_status, n.hostname, n.ip
            FROM game_installations i
            JOIN library_nodes n ON n.node_id = i.node_id
            WHERE i.game_id = %(game_id)s
            ORDER BY n.name, i.store
        """
        return self.execute(sql, {"game_id": game_id}, fetch="all")

    def get_unclassified_games(self, limit: int = 50) -> List[Dict]:
        if self._active_tier >= 2:
            return []
        sql = """
            SELECT id, title, developer, publisher, raw_tags, genres, tags, metadata, description as summary
            FROM canonical_games
            WHERE ai_classified = FALSE
               OR publisher IS NULL
               OR publisher = ''
               OR publisher = 'None'
            ORDER BY created_at ASC
            LIMIT %(limit)s
        """
        return self.execute(sql, {"limit": limit}, fetch="all")

    def mark_game_classified(
        self,
        game_id: str,
        primary_genre: str,
        genres: List[str],
        tags: List[str],
        confidence: float,
        features: Optional[List[str]] = None,
        publisher: Optional[str] = None,
        summary: Optional[str] = None,
        release_date: Optional[str] = None,
    ) -> None:
        if self._active_tier >= 2:
            return # Skip write if tier 2
        sql = """
            UPDATE canonical_games SET
                primary_genre   = %(primary_genre)s,
                genres          = %(genres)s,
                tags            = %(tags)s,
                publisher       = COALESCE(NULLIF(%(publisher)s, ''), NULLIF(canonical_games.publisher, ''), canonical_games.developer),
                features        = CASE 
                                    WHEN array_length(%(features)s::text[], 1) > 0 THEN %(features)s 
                                    ELSE canonical_games.features 
                                  END,
                description     = CASE 
                                    WHEN %(summary)s IS NOT NULL AND %(summary)s != '' AND LEFT(%(summary)s, 28) != 'An acclaimed game developed by' 
                                    THEN %(summary)s 
                                    ELSE canonical_games.description 
                                  END,
                release_date    = COALESCE(NULLIF(canonical_games.release_date, ''), %(release_date)s),
                ai_classified   = TRUE,
                ai_confidence   = %(confidence)s,
                updated_at      = NOW()
            WHERE id = %(id)s
        """
        self.execute(sql, {
            "id": game_id,
            "primary_genre": primary_genre,
            "genres": genres,
            "tags": tags,
            "features": features or [],
            "publisher": publisher,
            "summary": summary,
            "confidence": confidence,
            "release_date": release_date,
        })

    def enrich_game_metadata(
        self,
        game_id: str,
        summary: Optional[str] = None,
        features: Optional[List[str]] = None,
        platforms: Optional[List[str]] = None,
        release_date: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        if self._active_tier >= 2:
            return
        sql = """
            UPDATE canonical_games SET
                description  = COALESCE(NULLIF(%(summary)s, ''), canonical_games.description),
                features     = CASE 
                                 WHEN array_length(%(features)s::text[], 1) > 0 THEN %(features)s 
                                 ELSE canonical_games.features 
                               END,
                platforms    = CASE 
                                 WHEN array_length(%(platforms)s::text[], 1) > 0 THEN %(platforms)s 
                                 ELSE canonical_games.platforms 
                               END,
                release_date = COALESCE(NULLIF(canonical_games.release_date, ''), %(release_date)s),
                metadata     = canonical_games.metadata || COALESCE(%(metadata)s::jsonb, '{}'::jsonb),
                updated_at   = NOW()
            WHERE id = %(id)s
        """
        self.execute(sql, {
            "id": game_id,
            "summary": summary,
            "features": features or [],
            "platforms": platforms or [],
            "release_date": release_date,
            "metadata": json.dumps(metadata) if metadata else "{}",
        })

    def log_ai_classification(self, log: Dict[str, Any]) -> None:
        if self._active_tier >= 2:
            return
        sql = """
            INSERT INTO ai_classification_log
                (game_id, provider, model, input_tags, output_genre, output_tags, confidence, latency_ms)
            VALUES
                (%(game_id)s, %(provider)s, %(model)s, %(input_tags)s,
                 %(output_genre)s, %(output_tags)s, %(confidence)s, %(latency_ms)s)
        """
        self.execute(sql, log)

    # ── Library Nodes ────────────────────────────────────────────────────────

    def _sqlite_upsert_node(self, node: Dict[str, Any]) -> None:
        if not self._sqlite_conn:
            return
        sql = '''
            INSERT INTO library_nodes (
                node_id, name, hostname, ip, platform, status,
                auth_token_hash, clerk_id, auth_provider, storage_total, storage_used, storage_free,
                scan_paths, version, metadata, updated_at
            ) VALUES (
                :node_id, :name, :hostname, :ip, :platform, :status,
                :auth_token_hash, :clerk_id, :auth_provider, :storage_total, :storage_used, :storage_free,
                :scan_paths, :version, :metadata, CURRENT_TIMESTAMP
            ) ON CONFLICT(node_id) DO UPDATE SET
                auth_token_hash=COALESCE(:auth_token_hash, auth_token_hash),
                name=:name, hostname=:hostname, ip=:ip, status=:status,
                clerk_id=:clerk_id, auth_provider=:auth_provider, storage_total=:storage_total,
                storage_used=:storage_used, storage_free=:storage_free, scan_paths=:scan_paths,
                version=:version, metadata=:metadata, updated_at=CURRENT_TIMESTAMP
        '''
        sqlite_node = dict(node)
        sqlite_node["scan_paths"] = json.dumps(node.get("scan_paths") or [])
        sqlite_node["metadata"] = json.dumps(node.get("metadata") or {})
        try:
            self._sqlite_execute(sql, sqlite_node)
        except Exception as e:
            logger.warning("LibraryDB: Failed to snapshot node to SQLite: %s", e)

    def upsert_node(self, node: Dict[str, Any]) -> None:
        threading.Thread(target=self._sqlite_upsert_node, args=(node,), daemon=True).start()
        
        if self._active_tier >= 2:
            return

        sql = """
            INSERT INTO library_nodes (
                node_id, name, hostname, ip, platform, status,
                auth_token_hash, clerk_id, auth_provider, storage_total, storage_used, storage_free,
                scan_paths, last_heartbeat, last_sync, version, metadata, updated_at
            ) VALUES (
                %(node_id)s, %(name)s, %(hostname)s, %(ip)s, %(platform)s, %(status)s,
                %(auth_token_hash)s, %(clerk_id)s, %(auth_provider)s, %(storage_total)s, %(storage_used)s, %(storage_free)s,
                %(scan_paths)s::jsonb, NOW(), NOW(), %(version)s, %(metadata)s::jsonb, NOW()
            )
            ON CONFLICT (node_id) DO UPDATE SET
                auth_token_hash = COALESCE(EXCLUDED.auth_token_hash, library_nodes.auth_token_hash),
                name           = EXCLUDED.name,
                hostname       = EXCLUDED.hostname,
                ip             = EXCLUDED.ip,
                status         = EXCLUDED.status,
                clerk_id       = EXCLUDED.clerk_id,
                auth_provider  = EXCLUDED.auth_provider,
                storage_total  = EXCLUDED.storage_total,
                storage_used   = EXCLUDED.storage_used,
                storage_free   = EXCLUDED.storage_free,
                scan_paths     = EXCLUDED.scan_paths,
                last_heartbeat = NOW(),
                last_sync      = COALESCE(library_nodes.last_sync, NOW()),
                version        = EXCLUDED.version,
                metadata       = EXCLUDED.metadata,
                updated_at     = NOW()
        """
        self.execute(sql, node)

        # Sync normalized scan paths into node_scan_paths table without destroying existing user paths
        raw_paths = node.get("scan_paths")
        if isinstance(raw_paths, str):
            try:
                paths = json.loads(raw_paths)
            except Exception:
                paths = []
        elif isinstance(raw_paths, list):
            paths = raw_paths
        else:
            paths = []

        if paths:
            try:
                existing_rows = self.execute("SELECT path FROM node_scan_paths WHERE node_id = %(node_id)s", {"node_id": node["node_id"]}, fetch="all") or []
                existing_set = {str(r["path"]).lower().rstrip("\\/") for r in existing_rows if r.get("path")}

                for p in paths:
                    if p:
                        p_str = str(p).strip()
                        if not p_str or p_str.lower().rstrip("\\/") in existing_set:
                            continue
                        p_lower = p_str.lower()
                        store_hint = "local"
                        if "steam" in p_lower: store_hint = "steam"
                        elif "epic" in p_lower: store_hint = "epic"
                        elif "gog" in p_lower: store_hint = "gog"
                        elif "ea" in p_lower or "origin" in p_lower: store_hint = "ea"
                        elif "ubisoft" in p_lower or "uplay" in p_lower: store_hint = "ubisoft"
                        elif "xbox" in p_lower or "windowsapps" in p_lower: store_hint = "xbox"
                        elif "riot" in p_lower: store_hint = "riot"
                        elif "battle.net" in p_lower or "blizzard" in p_lower: store_hint = "battlenet"

                        self.execute(
                            "INSERT INTO node_scan_paths (node_id, path, store_hint, enabled) VALUES (%(node_id)s, %(path)s, %(store_hint)s, TRUE)",
                            {"node_id": node["node_id"], "path": p_str, "store_hint": store_hint}
                        )
                        existing_set.add(p_str.lower().rstrip("\\/"))
            except Exception as e:
                logger.warning("Failed to sync node_scan_paths: %s", e)

    def get_node(self, node_id: str) -> Optional[Dict]:
        if self._active_tier >= 2:
            return self._sqlite_execute("SELECT * FROM library_nodes WHERE node_id = :node_id", {"node_id": node_id}, fetch="one")
        return self.execute(
            "SELECT * FROM library_nodes WHERE node_id = %(node_id)s",
            {"node_id": node_id}, fetch="one"
        )

    def get_all_nodes(self, clerk_id: Optional[str] = None) -> List[Dict]:
        if self._active_tier >= 2:
            if clerk_id:
                return self._sqlite_execute(
                    "SELECT * FROM library_nodes WHERE (clerk_id = :clerk_id OR clerk_id = '' OR clerk_id IS NULL) ORDER BY name ASC",
                    {"clerk_id": clerk_id},
                    fetch="all"
                )
            return self._sqlite_execute("SELECT * FROM library_nodes ORDER BY name ASC", fetch="all")
            
        if clerk_id:
            return self.execute(
                "SELECT * FROM library_nodes WHERE (clerk_id = %(clerk_id)s OR clerk_id = '' OR clerk_id IS NULL) ORDER BY name ASC",
                {"clerk_id": clerk_id},
                fetch="all",
            )
        return self.execute("SELECT * FROM library_nodes ORDER BY name ASC", fetch="all")

    def heartbeat(self, node_id: str, storage_total: int, storage_used: int, storage_free: int, ip: str) -> None:
        if self._active_tier >= 2:
            sql = """
                UPDATE library_nodes SET
                    status         = 'online',
                    storage_total  = :total,
                    storage_used   = :used,
                    storage_free   = :free,
                    ip             = :ip,
                    last_heartbeat = CURRENT_TIMESTAMP,
                    updated_at     = CURRENT_TIMESTAMP
                WHERE node_id = :node_id
            """
            try:
                self._sqlite_execute(sql, {
                    "node_id": node_id,
                    "total": storage_total,
                    "used": storage_used,
                    "free": storage_free,
                    "ip": ip,
                })
            except Exception:
                pass
            return
        sql = """
            UPDATE library_nodes SET
                status         = 'online',
                storage_total  = %(total)s,
                storage_used   = %(used)s,
                storage_free   = %(free)s,
                ip             = %(ip)s,
                last_heartbeat = NOW(),
                updated_at     = NOW()
            WHERE node_id = %(node_id)s
        """
        self.execute(sql, {
            "node_id": node_id,
            "total": storage_total,
            "used": storage_used,
            "free": storage_free,
            "ip": ip,
        })

    def mark_offline(self, node_id: str) -> None:
        if self._active_tier >= 2:
            try:
                self._sqlite_execute("UPDATE library_nodes SET status = 'offline', updated_at = CURRENT_TIMESTAMP WHERE node_id = :id", {"id": node_id})
                self._sqlite_execute("UPDATE game_installations SET status = 'unavailable', updated_at = CURRENT_TIMESTAMP WHERE node_id = :id", {"id": node_id})
            except Exception:
                pass
            return
        self.execute(
            "UPDATE library_nodes SET status = 'offline', updated_at = NOW() WHERE node_id = %(id)s",
            {"id": node_id}
        )
        self.execute(
            "UPDATE game_installations SET status = 'unavailable', updated_at = NOW() WHERE node_id = %(id)s",
            {"id": node_id}
        )

    def delete_node(self, node_id: str) -> None:
        if self._active_tier >= 2:
            try:
                self._sqlite_execute("DELETE FROM library_nodes WHERE node_id = :id", {"id": node_id})
            except Exception:
                pass
            return
        self.execute(
            "DELETE FROM library_nodes WHERE node_id = %(id)s",
            {"id": node_id}
        )

    def verify_node_token(self, node_id: str, token: str) -> bool:
        if self._active_tier >= 2:
            row = self._sqlite_execute("SELECT auth_token_hash FROM library_nodes WHERE node_id = :id", {"id": node_id}, fetch="one")
            if not row:
                return False
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            return row.get("auth_token_hash") == token_hash
        row = self.execute(
            "SELECT auth_token_hash FROM library_nodes WHERE node_id = %(id)s",
            {"id": node_id}, fetch="one"
        )
        if not row:
            return False
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        return row["auth_token_hash"] == token_hash

    # ── Installations ────────────────────────────────────────────────────────

    def _sqlite_upsert_installation(self, inst: Dict[str, Any]) -> None:
        if not self._sqlite_conn:
            return
        sql = '''
            INSERT INTO game_installations (
                id, node_id, game_id, store, store_app_id, install_path, exe_path, version, size_bytes, status, updated_at
            ) VALUES (
                :id, :node_id, :game_id, :store, :store_app_id, :install_path, :exe_path, :version, :size_bytes, :status, CURRENT_TIMESTAMP
            ) ON CONFLICT(id) DO UPDATE SET
                node_id=:node_id, game_id=:game_id, store=:store, store_app_id=:store_app_id, install_path=:install_path,
                exe_path=:exe_path, version=:version, size_bytes=:size_bytes, status=:status, updated_at=CURRENT_TIMESTAMP
        '''
        try:
            self._sqlite_execute(sql, inst)
        except Exception as e:
            logger.warning("LibraryDB: Failed to snapshot installation to SQLite: %s", e)

    def upsert_installation(self, inst: Dict[str, Any]) -> None:
        threading.Thread(target=self._sqlite_upsert_installation, args=(inst,), daemon=True).start()
        if self._active_tier >= 2:
            return
            
        sql = _load_sql("upsert_installation")
        self.execute(sql, inst)

    def upsert_installations_bulk(self, installations: List[Dict[str, Any]]) -> int:
        saved = 0
        for inst in installations:
            self.upsert_installation(inst)
            saved += 1
        return saved

    def mark_node_installations_unavailable(self, node_id: str) -> None:
        if self._active_tier >= 2:
            try:
                self._sqlite_execute("UPDATE game_installations SET status = 'unavailable', updated_at = CURRENT_TIMESTAMP WHERE node_id = :id", {"id": node_id})
            except Exception:
                pass
            return
        self.execute(
            "UPDATE game_installations SET status = 'unavailable', updated_at = NOW() WHERE node_id = %(id)s",
            {"id": node_id}
        )

    def mark_node_installations_available(self, node_id: str) -> None:
        if self._active_tier >= 2:
            try:
                self._sqlite_execute("UPDATE game_installations SET status = 'available', updated_at = CURRENT_TIMESTAMP WHERE node_id = :id", {"id": node_id})
            except Exception:
                pass
            return
        self.execute(
            "UPDATE game_installations SET status = 'available', updated_at = NOW() WHERE node_id = %(id)s",
            {"id": node_id}
        )

    def _sqlite_get_stats(self, clerk_id: Optional[str] = None) -> Dict[str, Any]:
        return {
            "total_games": self._sqlite_execute("SELECT count(*) as c FROM canonical_games", fetch="one")["c"],
            "total_installations": self._sqlite_execute("SELECT count(*) as c FROM game_installations", fetch="one")["c"],
            "total_nodes": self._sqlite_execute("SELECT count(*) as c FROM library_nodes", fetch="one")["c"],
            "total_size_bytes": self._sqlite_execute("SELECT sum(size_bytes) as c FROM game_installations", fetch="one")["c"] or 0,
        }

    def get_stats(self, clerk_id: Optional[str] = None) -> Dict[str, Any]:
        if self._active_tier >= 2:
            return self._sqlite_get_stats(clerk_id)
            
        sql = _load_sql("stats")
        try:
            return self.execute(sql, {"clerk_id": clerk_id}, fetch="one") or {}
        except Exception:
            return self._sqlite_get_stats(clerk_id)

    # ── Offline Watchdog helper ──────────────────────────────────────────────

    def get_stale_nodes(self, timeout_seconds: int = 45) -> List[Dict]:
        if self._active_tier >= 2:
            try:
                sql = """
                    SELECT node_id FROM library_nodes
                    WHERE status = 'online'
                      AND (last_heartbeat IS NULL OR last_heartbeat < datetime('now', '-' || :timeout || ' seconds'))
                """
                return self._sqlite_execute(sql, {"timeout": timeout_seconds}, fetch="all") or []
            except Exception:
                return []
        """Return nodes that haven't sent a heartbeat recently and are still 'online'."""
        sql = """
            SELECT node_id FROM library_nodes
            WHERE status = 'online'
              AND (last_heartbeat IS NULL OR last_heartbeat < NOW() - %(timeout)s * INTERVAL '1 second')
        """
        return self.execute(sql, {"timeout": timeout_seconds}, fetch="all")

