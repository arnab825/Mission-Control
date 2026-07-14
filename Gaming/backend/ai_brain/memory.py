import time
import json
import os
import logging
import sqlite3
import threading
from collections import deque
from typing import Optional
from mem0 import MemoryClient

logger = logging.getLogger(__name__)

def db_thread_safe(func):
    def wrapper(self, *args, **kwargs):
        if hasattr(self, "_db_lock"):
            with self._db_lock:
                return func(self, *args, **kwargs)
        return func(self, *args, **kwargs)
    return wrapper

class GameMemory:
    """
    Persistent memory for game sessions and chat history.
    Backed by SQLite with FTS5 search capabilities.
    Also integrated with Mem0 for Semantic/Episodic memory extraction.
    """

    def __init__(self, save_path=None, max_events=500, config=None):
        self.config = config or {}
        self._db_lock = threading.RLock()
        # Default to a local SQLite db if no path is given
        if not save_path:
            save_path = os.path.join("data", "agent_memory.db")
            
        # Ensure it has .db extension instead of .json
        if save_path.endswith('.json'):
            save_path = save_path.replace('.json', '.db')
            
        self.save_path = save_path
        
        self.mem0_api_key = os.environ.get("MEM0_API_KEY")
        if not self.mem0_api_key:
            try:
                from dotenv import load_dotenv
                cur_dir = os.path.dirname(os.path.abspath(__file__))
                backend_dir = os.path.dirname(cur_dir)
                env_paths = [
                    os.path.join(backend_dir, ".env"),
                    os.path.join(os.path.dirname(backend_dir), ".env"),
                ]
                for p in env_paths:
                    if os.path.exists(p):
                        load_dotenv(p, override=True)
                        break
                self.mem0_api_key = os.environ.get("MEM0_API_KEY")
            except ImportError:
                pass

        if self.mem0_api_key:
            self.mem0_client = MemoryClient(api_key=self.mem0_api_key)
        else:
            self.mem0_client = None
            logger.warning("MEM0_API_KEY not found. Semantic memory will be disabled.")
        
        self._stats = {
            "combat_encounters": 0,
            "dialogues_seen": 0,
            "deaths": 0,
            "session_start": time.time(),
            "total_frames": 0,
        }
        self._session_id = int(time.time())
        self._conn = None
        
        # In-memory caches for fast retrieval
        self._events = deque(maxlen=max_events)
        self._scene_timeline = deque(maxlen=200)
        self._advice_history = deque(maxlen=20)

        self._init_db()

    @db_thread_safe
    def _init_db(self, retrying=False):
        try:
            db_dir = os.path.dirname(self.save_path)
            if db_dir:
                os.makedirs(db_dir, exist_ok=True)
            self._conn = sqlite3.connect(self.save_path, check_same_thread=False)
            self._conn.row_factory = sqlite3.Row
            
            # Enable WAL mode for better concurrency
            self._conn.execute("PRAGMA journal_mode=WAL")
            
            with self._conn:
                # Schema for agent game events
                self._conn.execute('''
                    CREATE TABLE IF NOT EXISTS events (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        session_id INTEGER,
                        type TEXT,
                        data TEXT,
                        timestamp REAL
                    )
                ''')
                self._conn.execute('''
                    CREATE TABLE IF NOT EXISTS scene_timeline (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        session_id INTEGER,
                        scene TEXT,
                        confidence REAL,
                        timestamp REAL
                    )
                ''')
                self._conn.execute('''
                    CREATE TABLE IF NOT EXISTS advice_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        session_id INTEGER,
                        advice TEXT,
                        priority TEXT,
                        category TEXT,
                        timestamp REAL
                    )
                ''')
                # Schema for Chat sessions
                self._conn.execute('''
                    CREATE TABLE IF NOT EXISTS chat_sessions (
                        id TEXT PRIMARY KEY,
                        title TEXT,
                        start_time REAL,
                        end_time REAL,
                        user_id TEXT
                    )
                ''')
                cursor = self._conn.execute("PRAGMA table_info(chat_sessions)")
                columns = [row[1] for row in cursor.fetchall()]
                if "user_id" not in columns:
                    try:
                        self._conn.execute('ALTER TABLE chat_sessions ADD COLUMN user_id TEXT')
                        logger.info("Migrated SQLite schema: added 'user_id' column to 'chat_sessions' table.")
                    except sqlite3.OperationalError as e:
                        logger.error(f"Failed to add 'user_id' column to 'chat_sessions' table: {e}")
                self._conn.execute('''
                    CREATE TABLE IF NOT EXISTS chat_messages (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        session_id TEXT,
                        role TEXT,
                        content TEXT,
                        timestamp REAL
                    )
                ''')
                # FTS5 Virtual Table for Chat Messages Search
                self._conn.execute('''
                    CREATE VIRTUAL TABLE IF NOT EXISTS chat_messages_fts 
                    USING fts5(content, content='chat_messages', content_rowid='id')
                ''')
                # Triggers to keep FTS updated
                self._conn.execute('''
                    CREATE TRIGGER IF NOT EXISTS chat_messages_ai AFTER INSERT ON chat_messages BEGIN
                      INSERT INTO chat_messages_fts(rowid, content) VALUES (new.id, new.content);
                    END;
                ''')
                self._conn.execute('''
                    CREATE TRIGGER IF NOT EXISTS chat_messages_ad AFTER DELETE ON chat_messages BEGIN
                      INSERT INTO chat_messages_fts(chat_messages_fts, rowid, content) VALUES('delete', old.id, old.content);
                    END;
                ''')
                self._conn.execute('''
                    CREATE TRIGGER IF NOT EXISTS chat_messages_au AFTER UPDATE ON chat_messages BEGIN
                      INSERT INTO chat_messages_fts(chat_messages_fts, rowid, content) VALUES('delete', old.id, old.content);
                      INSERT INTO chat_messages_fts(rowid, content) VALUES (new.id, new.content);
                    END;
                ''')
                # Schema for Post-Game Session Performance Dashboard (Feature 4)
                self._conn.execute('''
                    CREATE TABLE IF NOT EXISTS game_sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        game_name TEXT,
                        start_time REAL,
                        end_time REAL,
                        duration_secs REAL,
                        summary TEXT,
                        user_id TEXT,
                        machine_id TEXT,
                        machine_name TEXT
                    )
                ''')
                
                # Migrations: Add machine_id and machine_name if database exists but doesn't have them
                for col in ["machine_id", "machine_name"]:
                    try:
                        self._conn.execute(f"ALTER TABLE game_sessions ADD COLUMN {col} TEXT")
                        logger.info(f"Database migration: added {col} column to game_sessions")
                    except Exception:
                        pass
                
                # Schema for explicit user feedback (Helpful/Not Helpful)
                self._conn.execute('''
                    CREATE TABLE IF NOT EXISTS user_feedback (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        session_id TEXT,
                        user_id TEXT,
                        prompt_text TEXT,
                        response_text TEXT,
                        is_helpful INTEGER,
                        reason TEXT,
                        game_metadata TEXT,
                        timestamp REAL
                    )
                ''')
                
                # Schema for local games cache (E2EE safe backup)
                self._conn.execute('''
                    CREATE TABLE IF NOT EXISTS local_games_cache (
                        user_id TEXT PRIMARY KEY,
                        data TEXT,
                        timestamp REAL
                    )
                ''')
                
                # Create indexes for optimized retrieval of sessions and messages
                self._conn.execute('CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id)')
                self._conn.execute('CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id)')
                
            self._load_cache_from_db(retrying=retrying)
        except Exception as e:
            logger.error(f"Failed to initialize SQLite memory DB: {e}")
            if not retrying and ("malformed" in str(e).lower() or "corrupt" in str(e).lower()):
                self._handle_corrupt_db()
                self._init_db(retrying=True)

    def _handle_corrupt_db(self):
        logger.warning(f"Database at {self.save_path} is malformed or corrupted. Attempting to recover by recreation.")
        if self._conn:
            try:
                self._conn.close()
            except Exception:
                pass
            self._conn = None
        
        # Rename or delete the corrupt file
        if os.path.exists(self.save_path):
            try:
                corrupt_backup = self.save_path + ".corrupt"
                if os.path.exists(corrupt_backup):
                    os.remove(corrupt_backup)
                os.rename(self.save_path, corrupt_backup)
                logger.info(f"Renamed corrupted database to {corrupt_backup}")
            except Exception as e:
                logger.error(f"Failed to rename corrupted database: {e}")
                # If rename fails, try to delete it
                try:
                    os.remove(self.save_path)
                    logger.info("Deleted corrupted database file")
                except Exception as del_e:
                    logger.error(f"Failed to delete corrupted database: {del_e}")

        # Also remove WAL/SHM files if they exist
        for suffix in ["-wal", "-shm"]:
            side_file = self.save_path + suffix
            if os.path.exists(side_file):
                try:
                    os.remove(side_file)
                except Exception:
                    pass

    def _is_read_only(self):
        return self.config.get("memory", {}).get("mode") == "read_only"

    def _encrypt(self, text: str) -> str:
        if not text: return text
        if self.config.get("privacy", {}).get("enabled", False):
            try:
                from ai_brain.secure_crypt import get_system_token, encrypt_data
                key = get_system_token()
                return "ENC:" + encrypt_data(text, key)
            except Exception:
                pass
        return text

    def _decrypt(self, text: str) -> str:
        if not text: return text
        if text.startswith("ENC:"):
            try:
                from ai_brain.secure_crypt import get_system_token, get_fallback_tokens, decrypt_data
                key = get_system_token()
                try:
                    return decrypt_data(text[4:], key)
                except Exception:
                    # Fallback to legacy MAC-based keys if the active network interface changed
                    fallback_keys = get_fallback_tokens()
                    for f_key in fallback_keys:
                        if f_key == key: continue
                        try:
                            return decrypt_data(text[4:], f_key)
                        except Exception:
                            pass
                    
                    # If all fallback keys fail, check privacy setting
                    privacy_enabled = self.config.get("privacy", {}).get("enabled", False)
                    if not privacy_enabled:
                        # Privacy disabled: don't show encrypted garbage, return empty
                        logger.debug(f"Decryption failed and privacy is disabled - hiding encrypted data")
                        return ""
                    else:
                        # Privacy enabled: show placeholder for failed decryption
                        if not getattr(self, "_decryption_warning_logged", False):
                            logger.warning("Decryption failed for one or more encrypted messages: all fallback keys exhausted (likely encrypted on a different system/session).")
                            self._decryption_warning_logged = True
                        return "[Encrypted Message - Unable to decrypt]"
            except Exception as e:
                logger.error(f"Critical error during decryption setup: {e}")
                return "[Encrypted Message - Unable to decrypt]"
        return text

    def set_save_path(self, new_path):
        if new_path.endswith('.json'):
            new_path = new_path.replace('.json', '.db')
        if new_path == self.save_path:
            return
        logger.info(f"Memory path migration: {self.save_path} -> {new_path}")
        if self._conn:
            self._conn.close()
        self.save_path = new_path
        self._init_db()

    @db_thread_safe
    def record_event(self, event_type, data=None):
        ts = time.time()
        event = {
            "type": event_type,
            "time": ts,
            "data": data or {}
        }
        self._events.append(event)
        
        if event_type == "combat_start":
            self._stats["combat_encounters"] += 1
        elif event_type == "dialogue":
            self._stats["dialogues_seen"] += 1

        if not self._is_read_only() and self._conn:
            try:
                payload = self._encrypt(json.dumps(data or {}))
                with self._conn:
                    self._conn.execute(
                        "INSERT INTO events (session_id, type, data, timestamp) VALUES (?, ?, ?, ?)",
                        (self._session_id, event_type, payload, ts)
                    )
            except Exception as e:
                logger.error(f"Failed to record event to DB: {e}")

    @db_thread_safe
    def record_scene(self, scene_type, confidence):
        ts = time.time()
        self._scene_timeline.append({
            "scene": scene_type,
            "confidence": confidence,
            "time": ts
        })
        self._stats["total_frames"] += 1

        if not self._is_read_only() and self._conn:
            try:
                with self._conn:
                    self._conn.execute(
                        "INSERT INTO scene_timeline (session_id, scene, confidence, timestamp) VALUES (?, ?, ?, ?)",
                        (self._session_id, scene_type, confidence, ts)
                    )
            except Exception as e:
                pass

    def get_recent_events(self, count=10, event_type=None):
        events = list(self._events)
        if event_type:
            events = [e for e in events if e["type"] == event_type]
        return events[-count:]

    @db_thread_safe
    def record_advice(self, advice, priority, category):
        ts = time.time()
        self._advice_history.append({
            "advice": advice,
            "priority": priority,
            "category": category,
            "time": ts
        })
        
        if not self._is_read_only() and self._conn:
            try:
                payload = self._encrypt(advice)
                with self._conn:
                    self._conn.execute(
                        "INSERT INTO advice_history (session_id, advice, priority, category, timestamp) VALUES (?, ?, ?, ?, ?)",
                        (self._session_id, payload, priority, category, ts)
                    )
            except Exception as e:
                pass

    def get_recent_advice(self, count=5):
        return list(self._advice_history)[-count:]

    def get_scene_distribution(self, last_n=100):
        recent = list(self._scene_timeline)[-last_n:]
        if not recent:
            return {}
        counts = {}
        for s in recent:
            scene = s["scene"]
            counts[scene] = counts.get(scene, 0) + 1
        total = len(recent)
        return {k: round(v / total * 100, 1) for k, v in counts.items()}

    def get_session_duration(self):
        return time.time() - self._stats["session_start"]

    @property
    def stats(self):
        return dict(self._stats)

    def save(self):
        # With SQLite, we save implicitly on each record_*.
        # We can just keep this method for backward compatibility.
        pass

    def _load(self):
        # Handled by _load_cache_from_db
        pass

    @db_thread_safe
    def _load_cache_from_db(self, retrying=False):
        if not self._conn: return
        try:
            # We just load stats heuristics based on rows
            cur = self._conn.cursor()
            cur.execute("SELECT count(*) as c FROM events WHERE type='combat_start'")
            row = cur.fetchone()
            if row: self._stats["combat_encounters"] = row['c']
            
            cur.execute("SELECT count(*) as c FROM events WHERE type='dialogue'")
            row = cur.fetchone()
            if row: self._stats["dialogues_seen"] = row['c']
            
            cur.execute("SELECT * FROM advice_history ORDER BY timestamp DESC LIMIT 20")
            for row in reversed(cur.fetchall()):
                self._advice_history.append({
                    "advice": self._decrypt(row["advice"]),
                    "priority": row["priority"],
                    "category": row["category"],
                    "time": row["timestamp"]
                })
        except Exception as e:
            logger.error(f"Failed to load cache from DB: {e}")
            if not retrying and ("malformed" in str(e).lower() or "corrupt" in str(e).lower()):
                self._handle_corrupt_db()
                self._init_db(retrying=True)

    # --- Chat Session Memory API ---

    @db_thread_safe
    def create_chat_session(self, session_id: str, title: str = "New Chat", user_id: str = "guest"):
        if not self._conn: return
        try:
            with self._conn:
                cur = self._conn.cursor()
                cur.execute("SELECT id FROM chat_sessions WHERE id = ?", (session_id,))
                if cur.fetchone():
                    self._conn.execute("UPDATE chat_sessions SET title = ?, user_id = ? WHERE id = ?", (title, user_id, session_id))
                else:
                    self._conn.execute(
                        "INSERT INTO chat_sessions (id, title, start_time, user_id) VALUES (?, ?, ?, ?)",
                        (session_id, title, time.time(), user_id)
                    )
        except Exception as e:
            logger.error(f"Failed to create chat session: {e}")

    @db_thread_safe
    def get_chat_sessions(self, user_id: str = "guest"):
        if not self._conn: return []
        try:
            cur = self._conn.cursor()
            query = """
                SELECT 
                    s.id, 
                    s.title, 
                    s.start_time, 
                    s.end_time,
                    m.content AS last_content,
                    m.timestamp AS last_timestamp
                FROM chat_sessions s
                LEFT JOIN chat_messages m ON m.id = (
                    SELECT id FROM chat_messages 
                    WHERE session_id = s.id 
                    ORDER BY timestamp DESC 
                    LIMIT 1
                )
                WHERE s.user_id = ?
                ORDER BY s.start_time DESC
            """
            cur.execute(query, (user_id,))
            sessions = []
            for row in cur.fetchall():
                preview = "New session started..."
                time_str = "Just now"
                msg_time = row["start_time"]
                
                if row["last_timestamp"] is not None:
                    raw_content = self._decrypt(row["last_content"])
                    clean_content = raw_content.replace('🎙️ ', '').split('\u200b')[0] if raw_content else ""
                    preview = clean_content[:30] + "..." if len(clean_content) > 30 else clean_content
                    msg_time = row["last_timestamp"]
                
                # Robust relative time calculation supporting seconds, minutes, hours, days, weeks, months, and years
                delta = time.time() - msg_time
                if delta < 10:
                    time_str = "Just now"
                elif delta < 60:
                    time_str = f"{int(delta)}s ago"
                elif delta < 3600:
                    time_str = f"{int(delta // 60)}m ago"
                elif delta < 86400:
                    time_str = f"{int(delta // 3600)}h ago"
                elif delta < 604800:
                    time_str = f"{int(delta // 86400)}d ago"
                elif delta < 2592000:
                    time_str = f"{int(delta // 604800)}w ago"
                elif delta < 31536000:
                    time_str = f"{int(delta // 2592000)}mo ago"
                else:
                    time_str = f"{int(delta // 31536000)}y ago"
                        
                sessions.append({
                    "id": row["id"],
                    "title": row["title"],
                    "time": time_str,
                    "preview": preview,
                    "start_time": row["start_time"],
                    "timestamp": msg_time
                })
            return sessions
        except Exception as e:
            logger.error(f"Failed to get chat sessions: {e}")
            return []

    @db_thread_safe
    def update_chat_session_title(self, session_id: str, title: str, user_id: str = "guest"):
        if not self._conn: return
        try:
            with self._conn:
                self._conn.execute(
                    "UPDATE chat_sessions SET title = ? WHERE id = ?",
                    (title, session_id)
                )
        except Exception as e:
            logger.error(f"Failed to update chat session title: {e}")

    @db_thread_safe
    def delete_chat_session(self, session_id: str, user_id: str = "guest"):
        if not self._conn or not session_id: return
        try:
            with self._conn:
                # Delete messages first, then session
                self._conn.execute("DELETE FROM chat_messages WHERE session_id = ?", (session_id,))
                self._conn.execute("DELETE FROM chat_sessions WHERE id = ?", (session_id,))
                logger.debug(f"Deleted session {session_id} and its messages")
        except Exception as e:
            logger.error(f"Failed to delete chat session {session_id}: {e}")

    @db_thread_safe
    def clear_all_chat_sessions(self, user_id: str = "guest"):
        if not self._conn: return
        try:
            with self._conn:
                self._conn.execute("DELETE FROM chat_messages WHERE session_id IN (SELECT id FROM chat_sessions WHERE user_id = ?)", (user_id,))
                self._conn.execute("DELETE FROM chat_sessions WHERE user_id = ?", (user_id,))
                # Wipe the global game events to ensure neural history doesn't linger
                self._conn.execute("DELETE FROM events")
                self._conn.execute("DELETE FROM scene_timeline")
                self._conn.execute("DELETE FROM advice_history")
            self._events.clear()
            self._scene_timeline.clear()
            self._advice_history.clear()
        except Exception as e:
            logger.error(f"Failed to clear chat sessions and neural history: {e}")

    @db_thread_safe
    def _chat_session_exists(self, session_id: str):
        if not self._conn or not session_id:
            return False
        cur = self._conn.cursor()
        cur.execute("SELECT 1 FROM chat_sessions WHERE id = ? LIMIT 1", (session_id,))
        return cur.fetchone() is not None

    @db_thread_safe
    def add_chat_message(self, session_id: str, role: str, content: str, user_id: str = "guest"):
        if not self._conn: return
        if not session_id:
            return
        try:
            payload = self._encrypt(content)
            with self._conn:
                if not self._chat_session_exists(session_id):
                    self._conn.execute(
                        "INSERT OR IGNORE INTO chat_sessions (id, title, start_time, user_id) VALUES (?, ?, ?, ?)",
                        (session_id, "New Chat", time.time(), user_id or "guest")
                    )
                
                # Check for near-duplicate messages (same role + content within last 5 seconds)
                # to prevent race condition duplicates from concurrent threads
                # CRITICAL: Compare DECRYPTED content, not encrypted (encryption uses random IV each time)
                recent_threshold = time.time() - 5
                cur = self._conn.cursor()
                cur.execute(
                    "SELECT content FROM chat_messages WHERE session_id = ? AND role = ? AND timestamp > ? ORDER BY timestamp DESC LIMIT 1",
                    (session_id, role, recent_threshold)
                )
                last_msg = cur.fetchone()
                if last_msg:
                    # Decrypt the last message and compare plaintext, not ciphertext
                    last_msg_decrypted = self._decrypt(last_msg["content"])
                    # Only skip if we got a valid, non-empty decryption that matches
                    # Empty string means decryption failed with privacy disabled, so allow re-add
                    if last_msg_decrypted and last_msg_decrypted == content:
                        logger.debug(f"Skipping duplicate message to {session_id} from {role}")
                        return
                
                self._conn.execute(
                    "INSERT INTO chat_messages (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)",
                    (session_id, role, payload, time.time())
                )
        except Exception as e:
            logger.error(f"Failed to add chat message: {e}")

    @db_thread_safe
    def get_chat_history(self, session_id: str):
        if not self._conn: return []
        try:
            cur = self._conn.cursor()
            cur.execute("SELECT id, role, content, timestamp FROM chat_messages WHERE session_id = ? ORDER BY timestamp ASC", (session_id,))
            messages = []
            for row in cur.fetchall():
                dec_content = self._decrypt(row["content"])
                if dec_content and "[Encrypted Message" not in dec_content:
                    messages.append({
                        "id": row["id"],
                        "role": row["role"],
                        "content": dec_content,
                        "timestamp": row["timestamp"]
                    })
            return messages
        except Exception as e:
            logger.error(f"Failed to get chat history: {e}")
            return []

    @db_thread_safe
    def delete_messages_from_id(self, session_id: str, message_id: int):
        if not self._conn: return
        try:
            with self._conn:
                self._conn.execute(
                    "DELETE FROM chat_messages WHERE session_id = ? AND id >= ?",
                    (session_id, message_id)
                )
                logger.info(f"Deleted messages from session {session_id} starting from ID {message_id}")
        except Exception as e:
            logger.error(f"Failed to delete messages from ID: {e}")

    @db_thread_safe
    def find_message_id_by_content(self, session_id: str, role: str, content: str) -> Optional[int]:
        if not self._conn: return None
        try:
            cur = self._conn.cursor()
            cur.execute(
                "SELECT id, content FROM chat_messages WHERE session_id = ? AND role = ? ORDER BY timestamp DESC",
                (session_id, role)
            )
            for row in cur.fetchall():
                decrypted = self._decrypt(row["content"])
                if decrypted and decrypted.strip() == content.strip():
                    return row["id"]
        except Exception as e:
            logger.error(f"Failed to find message ID by content: {e}")
        return None

    @db_thread_safe
    def save_local_games(self, user_id: str, games: list):
        if not self._conn: return
        try:
            payload = json.dumps(games)
            encrypted_payload = self._encrypt(payload)
            with self._conn:
                self._conn.execute(
                    "INSERT OR REPLACE INTO local_games_cache (user_id, data, timestamp) VALUES (?, ?, ?)",
                    (user_id or "guest", encrypted_payload, time.time())
                )
            logger.info(f"Saved {len(games)} games to local SQLite cache for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to save local games cache to SQLite: {e}")

    @db_thread_safe
    def load_local_games(self, user_id: str) -> list:
        if not self._conn: return []
        try:
            cur = self._conn.cursor()
            cur.execute(
                "SELECT data FROM local_games_cache WHERE user_id = ?",
                (user_id or "guest",)
            )
            row = cur.fetchone()
            if row:
                decrypted_payload = self._decrypt(row["data"])
                if decrypted_payload:
                    try:
                        return json.loads(decrypted_payload)
                    except json.JSONDecodeError:
                        logger.warning("Local games cache JSON invalid (likely encrypted data placeholder). Resetting.")
                        return []
        except Exception as e:
            logger.error(f"Failed to load local games cache from SQLite: {e}")
        return []

    @db_thread_safe
    def search_chat(self, query: str):
        """Full Text Search across chat messages"""
        if not self._conn: return []
        try:
            privacy_enabled = self.config.get("privacy", {}).get("enabled", False)
            if privacy_enabled:
                cur = self._conn.cursor()
                cur.execute('SELECT session_id, role, content, timestamp FROM chat_messages')
                results = []
                query_lower = query.lower()
                for row in cur.fetchall():
                    decrypted_content = self._decrypt(row["content"])
                    if query_lower in decrypted_content.lower():
                        results.append({
                            "session_id": row["session_id"],
                            "role": row["role"],
                            "content": decrypted_content,
                            "timestamp": row["timestamp"]
                        })
                results.sort(key=lambda x: x["timestamp"], reverse=True)
                return results[:20]
            else:
                cur = self._conn.cursor()
                # FTS5 MATCH
                cur.execute('''
                    SELECT m.session_id, m.role, m.content, m.timestamp 
                    FROM chat_messages_fts f
                    JOIN chat_messages m ON f.rowid = m.id
                    WHERE chat_messages_fts MATCH ?
                    ORDER BY rank LIMIT 20
                ''', (query,))
                results = []
                for row in cur.fetchall():
                    results.append({
                        "session_id": row["session_id"],
                        "role": row["role"],
                        "content": self._decrypt(row["content"]),
                        "timestamp": row["timestamp"]
                    })
                return results
        except Exception as e:
            logger.error(f"Failed to search chat: {e}")
            return []

    # --- Game Session API (Feature 4) ---

    @db_thread_safe
    def save_game_session(self, summary_dict: dict, user_id: str = "guest"):
        """Persist a post-game session summary to the database."""
        if not self._conn or self._is_read_only():
            return
        try:
            from ai_brain.secure_crypt import get_system_token
            import socket
            machine_id = get_system_token()
            try:
                machine_name = socket.gethostname()
            except Exception:
                machine_name = "Unknown Machine"
                
            with self._conn:
                self._conn.execute(
                    "INSERT INTO game_sessions (game_name, start_time, end_time, duration_secs, summary, user_id, machine_id, machine_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        summary_dict.get("game_name", "Unknown"),
                        summary_dict.get("start_time", 0),
                        summary_dict.get("end_time", 0),
                        summary_dict.get("duration_secs", 0),
                        json.dumps(summary_dict),
                        user_id,
                        machine_id,
                        machine_name,
                    )
                )
        except Exception as e:
            logger.error(f"Failed to save game session: {e}")

    @db_thread_safe
    def get_game_sessions(self, user_id: str = "guest", limit: int = 20) -> list:
        """Retrieve past game session summaries."""
        if not self._conn:
            return []
        try:
            cur = self._conn.cursor()
            cur.execute(
                "SELECT id, game_name, start_time, end_time, duration_secs, summary, machine_id, machine_name FROM game_sessions WHERE user_id = ? ORDER BY start_time DESC LIMIT ?",
                (user_id, limit)
            )
            sessions = []
            for row in cur.fetchall():
                try:
                    summary = json.loads(row["summary"]) if row["summary"] else {}
                except (json.JSONDecodeError, TypeError):
                    summary = {}
                sessions.append({
                    "id": row["id"],
                    "game_name": row["game_name"],
                    "start_time": row["start_time"],
                    "end_time": row["end_time"],
                    "duration_secs": row["duration_secs"],
                    "summary": summary,
                    "machine_id": row["machine_id"] if "machine_id" in row.keys() else "unknown_machine",
                    "machine_name": row["machine_name"] if "machine_name" in row.keys() else "Unknown Machine",
                })
            return sessions
        except Exception as e:
            logger.error(f"Failed to get game sessions: {e}")
            return []

    # --- User Feedback API ---

    @db_thread_safe
    def record_user_feedback(self, session_id: str, user_id: str, prompt_text: str, response_text: str, is_helpful: bool, reason: str = "", game_metadata: str = ""):
        """Persist explicit user feedback for AI response adaptation."""
        if not self._conn or self._is_read_only():
            return
        try:
            with self._conn:
                self._conn.execute(
                    "INSERT INTO user_feedback (session_id, user_id, prompt_text, response_text, is_helpful, reason, game_metadata, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        session_id,
                        user_id,
                        self._encrypt(prompt_text),
                        self._encrypt(response_text),
                        1 if is_helpful else 0,
                        self._encrypt(reason),
                        self._encrypt(game_metadata),
                        time.time()
                    )
                )
            logger.info(f"Recorded user feedback (helpful={is_helpful}) for session {session_id}")
        except Exception as e:
            logger.error(f"Failed to record user feedback: {e}")

    @db_thread_safe
    def get_recent_feedback(self, user_id: str = "guest", limit: int = 5) -> dict:
        """Retrieve recent positive and negative feedback for contextual learning."""
        if not self._conn:
            return {"helpful": [], "unhelpful": []}
        try:
            cur = self._conn.cursor()
            
            # Fetch recent helpful feedback
            cur.execute(
                "SELECT prompt_text, response_text FROM user_feedback WHERE user_id = ? AND is_helpful = 1 ORDER BY timestamp DESC LIMIT ?",
                (user_id, limit)
            )
            helpful = []
            for row in cur.fetchall():
                helpful.append({
                    "prompt": self._decrypt(row["prompt_text"]),
                    "response": self._decrypt(row["response_text"])
                })
                
            # Fetch recent unhelpful feedback
            cur.execute(
                "SELECT prompt_text, response_text, reason FROM user_feedback WHERE user_id = ? AND is_helpful = 0 ORDER BY timestamp DESC LIMIT ?",
                (user_id, limit)
            )
            unhelpful = []
            for row in cur.fetchall():
                unhelpful.append({
                    "prompt": self._decrypt(row["prompt_text"]),
                    "response": self._decrypt(row["response_text"]),
                    "reason": self._decrypt(row["reason"])
                })
                
            return {"helpful": helpful, "unhelpful": unhelpful}
        except Exception as e:
            logger.error(f"Failed to get recent feedback: {e}")
            return {"helpful": [], "unhelpful": []}

    # --- Semantic/Episodic Memory API (Mem0) ---
    def extract_and_store_semantic_memory(self, session_id: str, user_id: str):
        """Extracts facts from a chat session and stores them in Mem0."""
        if not self.mem0_client:
            return
            
        privacy_enabled = self.config.get("privacy", {}).get("enabled", False)
        if privacy_enabled:
            logger.debug("Privacy Shield active: Skipping cloud semantic memory extraction.")
            return
        
        history = self.get_chat_history(session_id)
        if not history:
            return
            
        messages = []
        for msg in history:
            role = "assistant" if msg["role"] == "agent" else msg["role"]
            messages.append({"role": role, "content": msg["content"]})
            
        try:
            self.mem0_client.add(messages, user_id=user_id)
            logger.info(f"Stored semantic memory in Mem0 for user {user_id}")
        except Exception as e:
            logger.error(f"Mem0 add failed: {e}")

    def get_semantic_memory(self, user_id: str, query: str = "") -> str:
        """Retrieves semantic facts from Mem0 for context injection."""
        if not self.mem0_client:
            return ""
            
        privacy_enabled = self.config.get("privacy", {}).get("enabled", False)
        if privacy_enabled:
            logger.debug("Privacy Shield active: Skipping cloud semantic memory retrieval.")
            return ""
            
        try:
            # If query is blank/empty, call get_all to retrieve all memories.
            # Otherwise, call search with the query.
            if not query or not query.strip():
                logger.info(f"Retrieving all semantic memories for user {user_id} via get_all")
                results = self.mem0_client.get_all(filters={"user_id": user_id})
            else:
                logger.info(f"Searching semantic memories for user {user_id} with query '{query}'")
                results = self.mem0_client.search(query=query, filters={"user_id": user_id})
                
            if not results:
                return ""
                
            if isinstance(results, dict):
                results = results.get("results", [])
                
            facts = []
            for res in results:
                if isinstance(res, dict) and "memory" in res:
                    facts.append(f"- {res['memory']}")
                elif hasattr(res, "memory"):
                    facts.append(f"- {res.memory}")
            return "\n".join(facts)
        except Exception as e:
            logger.error(f"Mem0 search failed: {e}")
            return ""
