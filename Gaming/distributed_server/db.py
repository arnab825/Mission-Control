"""
Mission Control — Distributed Game Library Server
db.py: Supabase / PostgreSQL connection manager.

Uses the same DATABASE_URL as the existing backend (.env).
"""

import hashlib
import json
import logging
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

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


class LibraryDB:
    """
    Thread-safe PostgreSQL connection manager for the distributed library.
    Reconnects automatically on dropped connections.
    """

    def __init__(self, database_url: Optional[str] = None):
        self._url = database_url or os.getenv("DATABASE_URL", "")
        self._conn = None
        self.available = False
        if not _PSYCOPG2_AVAILABLE or not self._url:
            logger.warning("LibraryDB: psycopg2 or DATABASE_URL not available.")
            return
        
        # Normalize URI scheme if postgres:// is provided (standardize to postgresql://)
        if self._url.startswith("postgres://"):
            self._url = "postgresql://" + self._url[len("postgres://"):]

        # Ensure SSL is enabled for cloud-to-cloud connections (Render -> Supabase)
        if "sslmode" not in self._url:
            sep = "&" if "?" in self._url else "?"
            self._url = f"{self._url}{sep}sslmode=require"

        # Retry loop: Render cold starts can take 10-30s to establish the first connection
        for attempt in range(1, 4):
            self._connect()
            if self.available:
                break
            logger.warning("LibraryDB: Startup attempt %d/3 failed, retrying in 5s...", attempt)
            time.sleep(5)

    # ── Connection Management ────────────────────────────────────────────────

    def _connect(self):
        try:
            self._conn = psycopg2.connect(self._url, connect_timeout=15)
            self._conn.autocommit = False
            self._ensure_schema()
            self.available = True
            logger.info("LibraryDB: Connected to Supabase PostgreSQL.")
        except Exception as exc:
            logger.error("LibraryDB: Connection failed: %s", exc)
            self._conn = None
            self.available = False

    def _alive(self) -> bool:
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
            logger.info("LibraryDB: Reconnecting...")
            self._connect()
        return self.available

    def ping(self) -> bool:
        """Pings the database with an active SELECT 1 query to verify health and keep connections/Supabase alive."""
        if not self._conn:
            return self._ensure_connected()
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
            logger.info("LibraryDB: Schema verified/created.")
        except Exception as exc:
            if self._conn:
                try:
                    self._conn.rollback()
                except Exception:
                    pass
            logger.warning("LibraryDB: Schema setup notice (non-fatal, tables may already exist): %s", exc)

    # ── Generic Query Helpers ────────────────────────────────────────────────

    def execute(self, sql: str, params=None, fetch: str = "none") -> Any:
        """Execute a query and optionally fetch results. fetch: 'none'|'one'|'all'"""
        if not self._ensure_connected():
            raise RuntimeError("LibraryDB: Not connected.")
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
            logger.error("LibraryDB: Query failed: %s | SQL: %.200s", exc, sql)
            raise

    # ── Canonical Games ──────────────────────────────────────────────────────

    def upsert_game(self, game: Dict[str, Any]) -> None:
        sql = _load_sql("upsert_game")
        self.execute(sql, game)

    def upsert_games_bulk(self, games: List[Dict[str, Any]]) -> int:
        sql = _load_sql("upsert_game")
        saved = 0
        for g in games:
            try:
                self.execute(sql, g)
                saved += 1
            except Exception as exc:
                logger.warning("LibraryDB: Failed to upsert game %s: %s", g.get("id"), exc)
        return saved

    def get_game(self, game_id: str) -> Optional[Dict]:
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
        return self.execute(sql, {"id": game_id}, fetch="one")

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
    ) -> List[Dict]:
        sql = _load_sql("load_catalog")
        offset = 0 if last_seen_id else (page - 1) * limit
        return self.execute(sql, {
            "search": search or None,
            "search_like": (search or "").lower(),
            "genre": genre or None,
            "node_id": node_id or None,
            "clerk_id": clerk_id or None,
            "store": store or None,
            "installed_only": installed_only,
            "last_seen_id": last_seen_id,
            "limit": limit,
            "offset": offset,
        }, fetch="all")

    def get_installations_for_game(self, game_id: str, clerk_id: Optional[str] = None) -> List[Dict]:
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
        sql = """
            SELECT id, title, developer, publisher, raw_tags, genres, tags, metadata
            FROM canonical_games
            WHERE ai_classified = FALSE
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
        summary: Optional[str] = None,
        release_date: Optional[str] = None,
    ) -> None:
        sql = """
            UPDATE canonical_games SET
                primary_genre   = %(primary_genre)s,
                genres          = %(genres)s,
                tags            = %(tags)s,
                features        = CASE 
                                    WHEN array_length(%(features)s::text[], 1) > 0 THEN %(features)s 
                                    ELSE canonical_games.features 
                                  END,
                summary         = CASE 
                                    WHEN %(summary)s IS NOT NULL AND %(summary)s != '' AND LEFT(%(summary)s, 28) != 'An acclaimed game developed by' 
                                    THEN %(summary)s 
                                    ELSE canonical_games.summary 
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
        sql = """
            UPDATE canonical_games SET
                summary      = COALESCE(NULLIF(%(summary)s, ''), canonical_games.summary),
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
        sql = """
            INSERT INTO ai_classification_log
                (game_id, provider, model, input_tags, output_genre, output_tags, confidence, latency_ms)
            VALUES
                (%(game_id)s, %(provider)s, %(model)s, %(input_tags)s,
                 %(output_genre)s, %(output_tags)s, %(confidence)s, %(latency_ms)s)
        """
        self.execute(sql, log)

    # ── Library Nodes ────────────────────────────────────────────────────────

    def upsert_node(self, node: Dict[str, Any]) -> None:
        sql = """
            INSERT INTO library_nodes (
                node_id, name, hostname, ip, platform, status,
                auth_token_hash, clerk_id, auth_provider, storage_total, storage_used, storage_free,
                scan_paths, last_heartbeat, version, metadata, updated_at
            ) VALUES (
                %(node_id)s, %(name)s, %(hostname)s, %(ip)s, %(platform)s, %(status)s,
                %(auth_token_hash)s, %(clerk_id)s, %(auth_provider)s, %(storage_total)s, %(storage_used)s, %(storage_free)s,
                %(scan_paths)s::jsonb, NOW(), %(version)s, %(metadata)s::jsonb, NOW()
            )
            ON CONFLICT (node_id) DO UPDATE SET
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
                version        = EXCLUDED.version,
                metadata       = EXCLUDED.metadata,
                updated_at     = NOW()
        """
        self.execute(sql, node)

    def get_node(self, node_id: str) -> Optional[Dict]:
        return self.execute(
            "SELECT * FROM library_nodes WHERE node_id = %(node_id)s",
            {"node_id": node_id}, fetch="one"
        )

    def get_all_nodes(self, clerk_id: Optional[str] = None) -> List[Dict]:
        if clerk_id:
            return self.execute(
                "SELECT * FROM library_nodes WHERE clerk_id = %(clerk_id)s ORDER BY name ASC",
                {"clerk_id": clerk_id},
                fetch="all",
            )
        return self.execute("SELECT * FROM library_nodes ORDER BY name ASC", fetch="all")

    def heartbeat(self, node_id: str, storage_total: int, storage_used: int, storage_free: int, ip: str) -> None:
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
        """Mark a node offline and all its installations unavailable."""
        self.execute(
            "UPDATE library_nodes SET status = 'offline', updated_at = NOW() WHERE node_id = %(id)s",
            {"id": node_id}
        )
        self.execute(
            "UPDATE game_installations SET status = 'unavailable', updated_at = NOW() WHERE node_id = %(id)s",
            {"id": node_id}
        )

    def delete_node(self, node_id: str) -> None:
        self.execute(
            "DELETE FROM library_nodes WHERE node_id = %(id)s",
            {"id": node_id}
        )

    def verify_node_token(self, node_id: str, token: str) -> bool:
        """Verify a node's auth token against stored hash."""
        row = self.execute(
            "SELECT auth_token_hash FROM library_nodes WHERE node_id = %(id)s",
            {"id": node_id}, fetch="one"
        )
        if not row:
            return False
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        return row["auth_token_hash"] == token_hash

    # ── Installations ────────────────────────────────────────────────────────

    def upsert_installation(self, inst: Dict[str, Any]) -> None:
        sql = _load_sql("upsert_installation")
        self.execute(sql, inst)

    def upsert_installations_bulk(self, installations: List[Dict[str, Any]]) -> int:
        sql = _load_sql("upsert_installation")
        saved = 0
        for inst in installations:
            try:
                self.execute(sql, inst)
                saved += 1
            except Exception as exc:
                logger.warning("LibraryDB: Failed to upsert installation %s: %s", inst.get("id"), exc)
        return saved

    def mark_node_installations_unavailable(self, node_id: str) -> None:
        self.execute(
            "UPDATE game_installations SET status = 'unavailable', updated_at = NOW() WHERE node_id = %(id)s",
            {"id": node_id}
        )

    def mark_node_installations_available(self, node_id: str) -> None:
        self.execute(
            "UPDATE game_installations SET status = 'available', updated_at = NOW() WHERE node_id = %(id)s",
            {"id": node_id}
        )

    def get_stats(self, clerk_id: Optional[str] = None) -> Dict[str, Any]:
        sql = _load_sql("stats")
        return self.execute(sql, {"clerk_id": clerk_id}, fetch="one") or {}

    # ── Offline Watchdog helper ──────────────────────────────────────────────

    def get_stale_nodes(self, timeout_seconds: int = 45) -> List[Dict]:
        """Return nodes that haven't sent a heartbeat recently and are still 'online'."""
        sql = """
            SELECT node_id FROM library_nodes
            WHERE status = 'online'
              AND (last_heartbeat IS NULL OR last_heartbeat < NOW() - %(timeout)s * INTERVAL '1 second')
        """
        return self.execute(sql, {"timeout": timeout_seconds}, fetch="all")
