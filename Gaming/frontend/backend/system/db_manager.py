"""
Supabase / PostgreSQL Database Manager
Persists and retrieves scanned game library entries, scoped per Clerk user_id.
Connection is configured via DATABASE_URL in the backend .env file.
"""
import json
import logging
import os
from pathlib import Path
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Attempt to import psycopg2 (installed as psycopg2-binary)
try:
    import psycopg2
    import psycopg2.extras
    _PSYCOPG2_AVAILABLE = True
except ImportError:
    _PSYCOPG2_AVAILABLE = False
    logger.warning(
        "psycopg2 not available. Install psycopg2-binary to enable Supabase/PostgreSQL support. "
        "Game library will fall back to local JSON cache."
    )


class DatabaseManager:
    """
    Manages a PostgreSQL connection to Supabase for the game library.

    Usage:
        db = DatabaseManager()
        if db.available:
            db.save_games(games, user_id)
            games = db.load_games(user_id)
    """

    def __init__(self, database_url: Optional[str] = None):
        self._conn = None
        self.available = False

        if not _PSYCOPG2_AVAILABLE:
            return

        url = database_url or os.getenv("DATABASE_URL", "")
        if not url:
            logger.warning(
                "DATABASE_URL not set. Supabase integration is disabled. "
                "Add DATABASE_URL to backend/.env to enable cloud persistence."
            )
            return

        try:
            self._conn = psycopg2.connect(url, connect_timeout=10)
            self._conn.autocommit = False
            self._ensure_schema()
            self.available = True
            logger.info("Supabase / PostgreSQL connection established.")
        except Exception as exc:
            logger.error("Failed to connect to Supabase PostgreSQL: %s", exc)
            self._conn = None

    # ──────────────────────────────────────────────────────────────────────────
    # Internal helpers
    # ──────────────────────────────────────────────────────────────────────────

    def _load_query(self, query_name: str) -> str:
        """Load SQL query text from backend/queries/<query_name>.sql."""
        try:
            queries_dir = Path(__file__).parent.parent / "queries"
            file_path = queries_dir / f"{query_name}.sql"
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read().strip()
        except Exception as exc:
            logger.error("Failed to load SQL query %s: %s", query_name, exc)
            raise

    def _ensure_schema(self):
        """Create the games table if it does not already exist."""
        try:
            query = self._load_query("create_games_table")
            with self._conn.cursor() as cur:
                cur.execute(query)
            self._conn.commit()
        except Exception as exc:
            self._conn.rollback()
            logger.error("Failed to create games schema: %s", exc)
            raise

    def _reconnect_if_needed(self) -> bool:
        """Attempt to reconnect if the connection was dropped."""
        if self._conn is None:
            return False
        
        # 1. Liveness Probe
        is_alive = False
        try:
            if not self._conn.closed:
                with self._conn.cursor() as cur:
                    cur.execute("SELECT 1")
                is_alive = True
        except (psycopg2.OperationalError, psycopg2.InterfaceError):
            pass # Socket is dead
        except Exception:
            pass
            
        if is_alive:
            return True

        # 2. Reconnect
        try:
            url = os.getenv("DATABASE_URL", "")
            if not url:
                return False
            self._conn = psycopg2.connect(url, connect_timeout=10)
            self._conn.autocommit = False
            self._ensure_schema()
            logger.info("Reconnected to Supabase PostgreSQL.")
            return True
        except Exception as exc:
            logger.error("Reconnect to Supabase failed: %s", exc)
            return False

    @staticmethod
    def _serialize(value: Any) -> Optional[str]:
        """JSON-encode a list/dict value for storage; pass through strings."""
        if value is None:
            return None
        if isinstance(value, (list, dict)):
            return json.dumps(value)
        return str(value)

    @staticmethod
    def _deserialize_list(value: Optional[str]) -> List:
        """Decode a JSON string back to a Python list."""
        if not value:
            return []
        try:
            result = json.loads(value)
            return result if isinstance(result, list) else []
        except Exception:
            return []

    # ──────────────────────────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────────────────────────

    def save_games(self, games: List[Dict[str, Any]], user_id: str) -> bool:
        """
        Upsert a list of game dicts for the given user_id.
        Updates existing games and deletes games no longer in the list.
        Returns True on success, False on failure.
        """
        if not self.available or not self._reconnect_if_needed():
            return False

        try:
            upsert_query = self._load_query("save_games_upsert")

            with self._conn.cursor() as cur:
                if games:
                    records = []
                    valid_ids = []
                    for g in games:
                        game_id = g.get("id", "")
                        valid_ids.append(game_id)
                        records.append((
                            game_id,
                            user_id,
                            g.get("name", ""),
                            g.get("platform", ""),
                            g.get("install_path"),
                            g.get("exe_path"),
                            g.get("icon"),
                            self._serialize(g.get("features", [])),
                            g.get("type"),
                            g.get("genre"),
                            self._serialize(g.get("tags", [])),
                            g.get("source"),
                            g.get("local_banner"),
                        ))

                    psycopg2.extras.execute_values(
                        cur,
                        upsert_query,
                        records,
                    )
                    
                    cur.execute(
                        "DELETE FROM games WHERE user_id = %s AND id != ALL(%s::varchar[])",
                        (user_id, valid_ids)
                    )
                else:
                    delete_query = self._load_query("save_games_delete")
                    cur.execute(delete_query, (user_id,))

            self._conn.commit()
            logger.info(
                "Saved %d games to Supabase for user %s", len(games), user_id
            )
            return True

        except Exception as exc:
            try:
                self._conn.rollback()
            except Exception:
                pass
            logger.error("Failed to save games to Supabase: %s", exc)
            return False

    def load_games(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Return all game dicts stored for the given user_id.
        Returns an empty list on error or if no games are stored.
        """
        if not self.available or not self._reconnect_if_needed():
            return []

        try:
            load_query = self._load_query("load_games")
            with self._conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                cur.execute(
                    load_query,
                    (user_id,),
                )
                rows = cur.fetchall()

            games = []
            for row in rows:
                games.append({
                    "id":           row["id"],
                    "name":         row["name"],
                    "platform":     row["platform"],
                    "install_path": row["install_path"],
                    "exe_path":     row["exe_path"],
                    "icon":         row["icon"],
                    "features":     self._deserialize_list(row["features"]),
                    "type":         row["type"],
                    "genre":        row["genre"],
                    "tags":         self._deserialize_list(row["tags"]),
                    "source":       row["source"],
                    "local_banner": row["local_banner"],
                })

            logger.info(
                "Loaded %d games from Supabase for user %s", len(games), user_id
            )
            return games

        except Exception as exc:
            logger.error("Failed to load games from Supabase: %s", exc)
            return []

    def delete_games(self, user_id: str) -> bool:
        """Delete all stored games for a given user."""
        if not self.available or not self._reconnect_if_needed():
            return False

        try:
            delete_query = self._load_query("delete_games")
            with self._conn.cursor() as cur:
                cur.execute(delete_query, (user_id,))
            self._conn.commit()
            return True
        except Exception as exc:
            try:
                self._conn.rollback()
            except Exception:
                pass
            logger.error("Failed to delete games from Supabase: %s", exc)
            return False

    def close(self):
        """Cleanly close the database connection."""
        if self._conn and not self._conn.closed:
            try:
                self._conn.close()
            except Exception:
                pass


# Module-level singleton — shared across the backend process lifetime
_db_instance: Optional[DatabaseManager] = None


def get_db() -> DatabaseManager:
    """Return the shared DatabaseManager singleton, creating it on first call."""
    global _db_instance
    if _db_instance is None:
        _db_instance = DatabaseManager()
    return _db_instance
