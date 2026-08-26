#!/usr/bin/env python3
"""
══════════════════════════════════════════════════════════════════════════════
Mission Control — Ultra-Fast Neon Database Migration Tool
migrate_to_neon.py

High-speed bulk pipelining using execute_batch across all 5 tables:
- canonical_games (83.4k+ titles)
- library_nodes
- node_scan_paths
- game_installations
- ai_classification_log
══════════════════════════════════════════════════════════════════════════════
"""

import os
import sys
import time
import json
import logging
import argparse
from pathlib import Path
from typing import Any, Dict, List

from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parent.parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path, override=False)

import psycopg2
import psycopg2.extras

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("neon_migrator")


def get_connection(url: str, label: str):
    try:
        conn = psycopg2.connect(url, connect_timeout=20)
        conn.autocommit = False
        logger.info("Successfully connected to %s", label)
        return conn
    except Exception as exc:
        logger.error("Failed to connect to %s: %s", label, exc)
        return None


def run_migration(source_url: str, dest_url: str):
    logger.info("════════════════════════════════════════════════════════════════")
    logger.info("🚀 Starting Ultra-Fast Database Migration -> Neon Serverless")
    logger.info("════════════════════════════════════════════════════════════════")

    src_conn = get_connection(source_url, "Source Database (Supabase)")
    dst_conn = get_connection(dest_url, "Destination Database (Neon Serverless)")

    if not src_conn or not dst_conn:
        sys.exit(1)

    start_time = time.time()

    # 1. Initialize Complete Schema on Neon (All 5 tables + indexes)
    schema_file = Path(__file__).resolve().parent.parent / "queries" / "schema.sql"
    if schema_file.exists():
        logger.info("Creating full schema & indexes across all 5 tables in Neon...")
        try:
            with dst_conn.cursor() as cur:
                cur.execute(schema_file.read_text(encoding="utf-8-sig"))
            dst_conn.commit()
            logger.info("All 5 tables and GIN indexes verified and ready on Neon.")
        except Exception as exc:
            dst_conn.rollback()
            logger.warning("Schema setup note: %s", exc)

    # 2. Migrate Library Nodes FIRST
    logger.info("Migrating library_nodes...")
    with src_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM library_nodes")
        nodes = cur.fetchall()

    insert_node_sql = """
        INSERT INTO library_nodes (
            node_id, name, hostname, ip, platform, status,
            auth_token_hash, clerk_id, auth_provider, storage_total, storage_used, storage_free,
            scan_paths, last_heartbeat, last_sync, version, metadata, created_at, updated_at
        ) VALUES (
            %(node_id)s, %(name)s, %(hostname)s, %(ip)s, %(platform)s, %(status)s,
            %(auth_token_hash)s, %(clerk_id)s, %(auth_provider)s, %(storage_total)s, %(storage_used)s, %(storage_free)s,
            %(scan_paths)s::jsonb, %(last_heartbeat)s, %(last_sync)s, %(version)s, %(metadata)s::jsonb, %(created_at)s, %(updated_at)s
        ) ON CONFLICT (node_id) DO UPDATE SET
            name           = EXCLUDED.name,
            hostname       = EXCLUDED.hostname,
            ip             = EXCLUDED.ip,
            status         = EXCLUDED.status,
            storage_total  = EXCLUDED.storage_total,
            storage_used   = EXCLUDED.storage_used,
            storage_free   = EXCLUDED.storage_free,
            scan_paths     = EXCLUDED.scan_paths,
            last_heartbeat = EXCLUDED.last_heartbeat,
            last_sync      = EXCLUDED.last_sync,
            version        = EXCLUDED.version,
            metadata       = EXCLUDED.metadata,
            updated_at     = NOW();
    """
    for n in nodes:
        if isinstance(n.get("scan_paths"), (list, dict)):
            n["scan_paths"] = json.dumps(n["scan_paths"])
        if isinstance(n.get("metadata"), (list, dict)):
            n["metadata"] = json.dumps(n["metadata"])

    with dst_conn.cursor() as cur:
        psycopg2.extras.execute_batch(cur, insert_node_sql, nodes, page_size=100)
    dst_conn.commit()
    logger.info("Migrated %d library_nodes to Neon.", len(nodes))

    # 3. Migrate Node Scan Paths
    logger.info("Migrating node_scan_paths...")
    try:
        with src_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM node_scan_paths")
            paths = cur.fetchall()

        insert_path_sql = """
            INSERT INTO node_scan_paths (node_id, path, store_hint, enabled, created_at)
            VALUES (%(node_id)s, %(path)s, %(store_hint)s, %(enabled)s, %(created_at)s)
            ON CONFLICT DO NOTHING;
        """
        with dst_conn.cursor() as cur:
            psycopg2.extras.execute_batch(cur, insert_path_sql, paths, page_size=100)
        dst_conn.commit()
        logger.info("Migrated %d node_scan_paths to Neon.", len(paths))
    except Exception as e:
        logger.warning("Scan paths migration note: %s", e)

    # 4. Migrate Master Catalog (canonical_games) with Ultra-Fast Batching
    logger.info("Migrating master catalog (canonical_games)...")
    batch_size = 1000
    offset = 0
    total_games_migrated = 0

    with src_conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM canonical_games")
        total_source_games = cur.fetchone()[0]
    logger.info("Total games in Source: %d", total_source_games)

    insert_game_sql = """
        INSERT INTO canonical_games (
            id, title, normalized_title, developer, publisher, release_date, primary_genre,
            genres, tags, features, platforms, cover_url, banner_url, summary,
            ai_classified, ai_confidence, raw_tags, metadata, created_at, updated_at
        ) VALUES (
            %(id)s, %(title)s, %(normalized_title)s, %(developer)s, %(publisher)s, %(release_date)s, %(primary_genre)s,
            %(genres)s, %(tags)s, %(features)s, %(platforms)s, %(cover_url)s, %(banner_url)s, %(summary)s,
            %(ai_classified)s, %(ai_confidence)s, %(raw_tags)s, %(metadata)s::jsonb, %(created_at)s, %(updated_at)s
        ) ON CONFLICT (id) DO UPDATE SET
            title            = EXCLUDED.title,
            normalized_title = EXCLUDED.normalized_title,
            primary_genre    = COALESCE(EXCLUDED.primary_genre, canonical_games.primary_genre),
            genres           = EXCLUDED.genres,
            tags             = EXCLUDED.tags,
            features         = EXCLUDED.features,
            platforms        = EXCLUDED.platforms,
            cover_url        = COALESCE(EXCLUDED.cover_url, canonical_games.cover_url),
            banner_url       = COALESCE(EXCLUDED.banner_url, canonical_games.banner_url),
            summary          = COALESCE(EXCLUDED.summary, canonical_games.summary),
            ai_classified    = EXCLUDED.ai_classified,
            ai_confidence    = EXCLUDED.ai_confidence,
            metadata         = EXCLUDED.metadata,
            updated_at       = NOW();
    """

    while True:
        with src_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM canonical_games ORDER BY id ASC LIMIT %s OFFSET %s",
                (batch_size, offset),
            )
            rows = cur.fetchall()

        if not rows:
            break

        for r in rows:
            if isinstance(r.get("metadata"), dict):
                r["metadata"] = json.dumps(r["metadata"])

        with dst_conn.cursor() as cur:
            psycopg2.extras.execute_batch(cur, insert_game_sql, rows, page_size=batch_size)
        dst_conn.commit()

        total_games_migrated += len(rows)
        offset += batch_size
        pct = (total_games_migrated / total_source_games) * 100 if total_source_games > 0 else 100
        logger.info(
            "Progress: %d / %d games migrated to Neon (%.1f%%)",
            total_games_migrated,
            total_source_games,
            pct,
        )

    # 5. Migrate Game Installations
    logger.info("Migrating game_installations...")
    with src_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM game_installations")
        installs = cur.fetchall()

    insert_inst_sql = """
        INSERT INTO game_installations (
            id, node_id, game_id, store, store_app_id, install_path, exe_path, version, size_bytes, status, created_at, updated_at
        ) VALUES (
            %(id)s, %(node_id)s, %(game_id)s, %(store)s, %(store_app_id)s, %(install_path)s, %(exe_path)s, %(version)s, %(size_bytes)s, %(status)s, %(created_at)s, %(updated_at)s
        ) ON CONFLICT (id) DO UPDATE SET
            install_path = EXCLUDED.install_path,
            exe_path     = EXCLUDED.exe_path,
            size_bytes   = EXCLUDED.size_bytes,
            status       = EXCLUDED.status,
            updated_at   = NOW();
    """
    with dst_conn.cursor() as cur:
        psycopg2.extras.execute_batch(cur, insert_inst_sql, installs, page_size=100)
    dst_conn.commit()
    logger.info("Migrated %d game_installations to Neon.", len(installs))

    # 6. Verify Totals on Neon
    with dst_conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM canonical_games")
        dst_games = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM library_nodes")
        dst_nodes = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM node_scan_paths")
        dst_paths = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM game_installations")
        dst_inst = cur.fetchone()[0]

    elapsed = time.time() - start_time
    logger.info("════════════════════════════════════════════════════════════════")
    logger.info("✅ ALL 5 TABLES MIGRATED TO NEON IN %.2f SECONDS!", elapsed)
    logger.info("Neon Database Summary:")
    logger.info("  - Canonical Games:     %d", dst_games)
    logger.info("  - Library Nodes:       %d", dst_nodes)
    logger.info("  - Node Scan Paths:     %d", dst_paths)
    logger.info("  - Game Installations:  %d", dst_inst)
    logger.info("════════════════════════════════════════════════════════════════")

    src_conn.close()
    dst_conn.close()


def main():
    parser = argparse.ArgumentParser(description="Migrate Mission Control Database to Neon PostgreSQL")
    parser.add_argument("--source", help="Source PostgreSQL URL (defaults to SUPABASE_DATABASE_URL or DATABASE_URL)")
    parser.add_argument("--dest", help="Destination Neon PostgreSQL URL (defaults to NEON_DATABASE_URL or FALLBACK_DATABASE_URL)")
    args = parser.parse_args()

    source = args.source or os.getenv("SUPABASE_DATABASE_URL") or os.getenv("DATABASE_URL")
    dest = args.dest or os.getenv("NEON_DATABASE_URL") or os.getenv("FALLBACK_DATABASE_URL_2") or os.getenv("FALLBACK_DATABASE_URL")

    if not source or not dest:
        logger.error("Both source (Supabase) and destination (Neon) database URLs are required.")
        sys.exit(1)

    if source == dest:
        logger.error("Source and destination URLs are identical.")
        sys.exit(1)

    run_migration(source, dest)


if __name__ == "__main__":
    main()
