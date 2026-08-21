"""
Mission Control — Distributed Game Library Server
models.py: Pydantic v2 models for API request/response validation.
"""

from __future__ import annotations

import hashlib
import re
import secrets
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


# ── Helpers ──────────────────────────────────────────────────────────────────

def slugify(title: str) -> str:
    """Produce a URL-safe slug from a game title."""
    s = title.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s)
    s = re.sub(r"-+", "-", s)
    return s.strip("-")


def normalize_title(title: str) -> str:
    """Lowercase, strip punctuation and extra whitespace for matching."""
    s = title.lower()
    s = re.sub(r"[^\w\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def generate_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


# ── Game Models ───────────────────────────────────────────────────────────────

class GameInstallationInfo(BaseModel):
    """Installation details as returned in game catalog responses."""
    node_id: str
    node_name: str
    node_status: str  # 'online' | 'offline'
    store: str
    store_app_id: Optional[str] = None
    install_path: str
    exe_path: Optional[str] = None
    version: Optional[str] = None
    size_bytes: int = 0
    status: str = "available"


class CanonicalGameResponse(BaseModel):
    """Full canonical game entry returned by the API."""
    id: str
    title: str
    developer: Optional[str] = None
    publisher: Optional[str] = None
    release_date: Optional[str] = None
    primary_genre: Optional[str] = None
    genres: List[str] = []
    tags: List[str] = []
    features: List[str] = []
    platforms: List[str] = ["Windows"]
    cover_url: Optional[str] = None
    banner_url: Optional[str] = None
    summary: Optional[str] = None
    ai_classified: bool = False
    metadata: Dict[str, Any] = {}
    installations: List[GameInstallationInfo] = []


class CatalogResponse(BaseModel):
    games: List[CanonicalGameResponse]
    total: int
    page: int
    limit: int
    pages: int


# ── Node Models ───────────────────────────────────────────────────────────────

class StorageInfo(BaseModel):
    """Real drive storage (from shutil.disk_usage, never random)."""
    total: int = Field(..., ge=0, description="Total drive capacity in bytes")
    used: int = Field(..., ge=0, description="Used space in bytes")
    free: int = Field(..., ge=0, description="Free space in bytes")


class NodeRegisterRequest(BaseModel):
    node_id: Optional[str] = None     # Server may auto-assign if absent
    clerk_id: Optional[str] = None    # Binds node to user account
    auth_provider: Optional[str] = None # E.g., 'Google', 'Discord'
    name: str
    hostname: str
    ip: str
    platform: str = "windows"
    version: str = "1.0.0"
    storage: StorageInfo
    scan_paths: List[str] = []
    metadata: Dict[str, Any] = {}


class NodeRegisterResponse(BaseModel):
    node_id: str
    token: str   # Plaintext token — shown ONCE, then hashed on server
    message: str = "Node registered successfully."


class NodeHeartbeatRequest(BaseModel):
    ip: str
    storage: StorageInfo
    status: str = "online"


class NodeHeartbeatResponse(BaseModel):
    received: bool = True
    command: Optional[str] = None  # e.g. 'scan' — server can trigger remote scan


class NodeResponse(BaseModel):
    node_id: str
    clerk_id: Optional[str] = None
    auth_provider: Optional[str] = None
    name: str
    hostname: str
    ip: str
    platform: str
    status: str
    storage_total: int
    storage_used: int
    storage_free: int
    scan_paths: List[str] = []
    last_heartbeat: Optional[str] = None
    last_sync: Optional[str] = None
    version: str
    metadata: Dict[str, Any] = {}


# ── Sync Models ───────────────────────────────────────────────────────────────

class RawInstallationPayload(BaseModel):
    """Raw game installation as reported by a node during sync."""
    title: str
    store: str  # 'steam' | 'epic' | 'gog' | 'ubisoft' | 'ea' | 'rockstar' | 'xbox' | 'battlenet' | 'manual'
    store_app_id: Optional[str] = None
    install_path: str
    exe_path: Optional[str] = None
    version: Optional[str] = None
    size_bytes: int = 0         # Real bytes from manifest or os.scandir
    developer: Optional[str] = None
    publisher: Optional[str] = None
    release_date: Optional[str] = None
    genres: List[str] = []      # Raw genres from web/store (may be noisy)
    tags: List[str] = []        # Raw tags (may be misplaced — AI will refine)
    features: List[str] = []
    cover_url: Optional[str] = None
    banner_url: Optional[str] = None
    summary: Optional[str] = None
    metadata: Dict[str, Any] = {}


class SyncRequest(BaseModel):
    installations: List[RawInstallationPayload]


class SyncResponse(BaseModel):
    synced: int
    new_games: int
    updated_games: int
    ai_queued: int      # Games queued for AI genre classification
    errors: int = 0


# ── Search & Stats Models ─────────────────────────────────────────────────────

class SearchResult(BaseModel):
    id: str
    title: str
    primary_genre: Optional[str] = None
    cover_url: Optional[str] = None
    installations: List[GameInstallationInfo] = []


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    total: int


class NodeStatEntry(BaseModel):
    node_id: str
    name: str
    hostname: str
    ip: str
    status: str
    storage_total: int
    storage_used: int
    storage_free: int
    last_heartbeat: Optional[str] = None
    game_count: int = 0


class LibraryStatsResponse(BaseModel):
    total_master_games: int        # All games in canonical catalog
    total_installed_games: int     # Games with at least one available installation
    total_nodes: int
    online_nodes: int
    total_storage_bytes: int
    used_storage_bytes: int
    free_storage_bytes: int
    nodes: List[NodeStatEntry] = []
    store_distribution: Dict[str, int] = {}


# ── AI Classifier Models ──────────────────────────────────────────────────────

class ClassifyRequest(BaseModel):
    game_id: Optional[str] = None
    title: str
    developer: Optional[str] = None
    publisher: Optional[str] = None
    raw_tags: List[str] = []
    summary: Optional[str] = None


class ClassifyResponse(BaseModel):
    game_id: Optional[str]
    title: str
    primary_genre: str
    genres: List[str]
    tags: List[str]
    features: List[str]
    confidence: float
    provider: str
    model: str


# ── Web Discovery & Seeding Models ───────────────────────────────────────────

class DiscoverItem(BaseModel):
    id: str
    title: str
    developer: Optional[str] = None
    publisher: Optional[str] = None
    release_date: Optional[str] = None
    primary_genre: Optional[str] = None
    genres: List[str] = []
    tags: List[str] = []
    cover_url: Optional[str] = None
    banner_url: Optional[str] = None
    summary: Optional[str] = None
    store: Optional[str] = "steam"
    store_app_id: Optional[str] = None
    launchers: List[str] = []
    in_catalog: bool = False
    ai_classified: bool = False
    installations: List[GameInstallationInfo] = []


class DiscoverResponse(BaseModel):
    query: str
    results: List[DiscoverItem]
    total: int
    newly_ingested: int = 0


class SeedRequest(BaseModel):
    limit_per_launcher: int = Field(default=30, ge=5, le=100)
    classify_immediately: bool = True


class SeedResponse(BaseModel):
    harvested: int
    inserted: int
    skipped_existing: int
    classified: int
