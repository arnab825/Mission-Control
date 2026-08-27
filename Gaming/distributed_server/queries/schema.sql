-- 
-- Mission Control  Distributed Game Library Schema
-- Supabase / PostgreSQL
-- 
CREATE EXTENSION IF NOT EXISTS pg_trgm;

--  1. Master Canonical Games Catalog 
-- Stores ALL known games regardless of whether they are installed anywhere.
-- AI classification enriches primary_genre, tags, and features for each game.
CREATE TABLE IF NOT EXISTS canonical_games (
    id                VARCHAR(255)    PRIMARY KEY,
    title             VARCHAR(255)    NOT NULL,
    normalized_title  VARCHAR(255)    NOT NULL,
    slug              VARCHAR(255)    NOT NULL,
    source            VARCHAR(64)     NOT NULL,
    source_game_id    VARCHAR(255)    NOT NULL,
    developer         VARCHAR(255),
    publisher         VARCHAR(255),
    release_date      VARCHAR(64),
    primary_genre     VARCHAR(128),
    genres            TEXT[]          NOT NULL DEFAULT '{}',
    tags              TEXT[]          NOT NULL DEFAULT '{}',
    features          TEXT[]          NOT NULL DEFAULT '{}',
    platforms         TEXT[]          NOT NULL DEFAULT '{Windows}',
    cover_url         TEXT,
    banner_url        TEXT,
    description       TEXT,
    ai_classified     BOOLEAN         NOT NULL DEFAULT FALSE,
    ai_confidence     REAL            NOT NULL DEFAULT 0.0,
    raw_tags          TEXT[]          NOT NULL DEFAULT '{}',
    metadata          JSONB           NOT NULL DEFAULT '{}'::jsonb,
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    last_scanned_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE(source, source_game_id)
);
CREATE INDEX IF NOT EXISTS idx_cg_normalized_title  ON canonical_games (normalized_title);
CREATE INDEX IF NOT EXISTS idx_cg_slug              ON canonical_games (slug);
CREATE INDEX IF NOT EXISTS idx_cg_source_id         ON canonical_games (source, source_game_id);
CREATE INDEX IF NOT EXISTS idx_cg_trgm_title        ON canonical_games USING gin (normalized_title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cg_primary_genre     ON canonical_games (primary_genre);
CREATE INDEX IF NOT EXISTS idx_cg_ai_classified     ON canonical_games (ai_classified);
CREATE INDEX IF NOT EXISTS idx_cg_title_gin         ON canonical_games USING gin(to_tsvector('english', title));

--  2. Library Nodes Registry 
CREATE TABLE IF NOT EXISTS library_nodes (
    node_id           VARCHAR(64)     PRIMARY KEY,
    name              VARCHAR(255)    NOT NULL,
    hostname          VARCHAR(255)    NOT NULL,
    ip                VARCHAR(64)     NOT NULL,
    platform          VARCHAR(32)     NOT NULL DEFAULT 'windows',
    status            VARCHAR(32)     NOT NULL DEFAULT 'offline',
    auth_token_hash   VARCHAR(255)    NOT NULL,
    clerk_id          VARCHAR(255),
    auth_provider     VARCHAR(64),
    storage_total     BIGINT          NOT NULL DEFAULT 0,
    storage_used      BIGINT          NOT NULL DEFAULT 0,
    storage_free      BIGINT          NOT NULL DEFAULT 0,
    scan_paths        JSONB           NOT NULL DEFAULT '[]'::jsonb,
    last_heartbeat    TIMESTAMPTZ,
    last_sync         TIMESTAMPTZ,
    version           VARCHAR(32)     NOT NULL DEFAULT '1.0.0',
    metadata          JSONB           NOT NULL DEFAULT '{}'::jsonb,
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nodes_status           ON library_nodes (status);
CREATE INDEX IF NOT EXISTS idx_nodes_last_heartbeat   ON library_nodes (last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_nodes_clerk_id         ON library_nodes (clerk_id);

--  3. Game Installations 
CREATE TABLE IF NOT EXISTS game_installations (
    id                VARCHAR(255)    PRIMARY KEY,
    game_id           VARCHAR(255)    NOT NULL REFERENCES canonical_games(id) ON DELETE CASCADE,
    node_id           VARCHAR(64)     NOT NULL REFERENCES library_nodes(node_id) ON DELETE CASCADE,
    store             VARCHAR(64)     NOT NULL,
    store_app_id      VARCHAR(128),
    install_path      TEXT            NOT NULL,
    exe_path          TEXT,
    version           VARCHAR(64),
    size_bytes        BIGINT          NOT NULL DEFAULT 0,
    status            VARCHAR(32)     NOT NULL DEFAULT 'available',
    last_verified_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    last_scanned_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_game_node_store UNIQUE (game_id, node_id, store)
);
CREATE INDEX IF NOT EXISTS idx_install_game_id  ON game_installations (game_id);
CREATE INDEX IF NOT EXISTS idx_install_node_id  ON game_installations (node_id);
CREATE INDEX IF NOT EXISTS idx_install_status   ON game_installations (status);

--  4. Node Scan Paths 
CREATE TABLE IF NOT EXISTS node_scan_paths (
    id          SERIAL          PRIMARY KEY,
    node_id     VARCHAR(64)     NOT NULL REFERENCES library_nodes(node_id) ON DELETE CASCADE,
    path        TEXT            NOT NULL,
    store_hint  VARCHAR(64),
    enabled     BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nsp_node_id ON node_scan_paths (node_id);

-- 5. AI Classification Log 
CREATE TABLE IF NOT EXISTS ai_classification_log (
    id              SERIAL          PRIMARY KEY,
    game_id         VARCHAR(255)    NOT NULL REFERENCES canonical_games(id) ON DELETE CASCADE,
    provider        VARCHAR(64)     NOT NULL,
    model           VARCHAR(128)    NOT NULL,
    input_tags      TEXT[]          NOT NULL DEFAULT '{}',
    output_genre    VARCHAR(128),
    output_tags     TEXT[]          NOT NULL DEFAULT '{}',
    confidence      REAL            NOT NULL DEFAULT 0.0,
    latency_ms      INTEGER,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- 6. User Installed Games & Launcher Sync (Frontend / Desktop Sync)
CREATE TABLE IF NOT EXISTS games (
    id            VARCHAR(255)    NOT NULL,
    user_id       VARCHAR(255)    NOT NULL,
    name          VARCHAR(255),
    platform      VARCHAR(255),
    install_path  TEXT,
    exe_path      TEXT,
    icon          TEXT,
    features      TEXT,
    type          VARCHAR(64),
    genre         VARCHAR(128),
    tags          TEXT,
    source        VARCHAR(128),
    local_banner  TEXT,
    PRIMARY KEY (id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games (user_id);
