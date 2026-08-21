-- Aggregated library statistics (optionally filtered by clerk_id)
SELECT
    (SELECT COUNT(*) FROM canonical_games) AS total_master_games,
    (
        SELECT COUNT(DISTINCT i.game_id)
        FROM game_installations i
        JOIN library_nodes n ON n.node_id = i.node_id
        WHERE i.status = 'available'
          AND (%(clerk_id)s IS NULL OR n.clerk_id = %(clerk_id)s)
    ) AS total_installed_games,
    (SELECT COUNT(*) FROM library_nodes WHERE (%(clerk_id)s IS NULL OR clerk_id = %(clerk_id)s)) AS total_nodes,
    (SELECT COUNT(*) FROM library_nodes WHERE status = 'online' AND (%(clerk_id)s IS NULL OR clerk_id = %(clerk_id)s)) AS online_nodes,
    (SELECT COALESCE(SUM(storage_total), 0) FROM library_nodes WHERE status = 'online' AND (%(clerk_id)s IS NULL OR clerk_id = %(clerk_id)s)) AS total_storage_bytes,
    (SELECT COALESCE(SUM(storage_used), 0) FROM library_nodes WHERE status = 'online' AND (%(clerk_id)s IS NULL OR clerk_id = %(clerk_id)s)) AS used_storage_bytes,
    (SELECT COALESCE(SUM(storage_free), 0) FROM library_nodes WHERE status = 'online' AND (%(clerk_id)s IS NULL OR clerk_id = %(clerk_id)s)) AS free_storage_bytes,
    (
        SELECT json_agg(row_to_json(ns)) FROM (
            SELECT
                n.node_id, n.name, n.hostname, n.ip, n.status,
                n.storage_total, n.storage_used, n.storage_free,
                n.last_heartbeat,
                (SELECT COUNT(*) FROM game_installations gi WHERE gi.node_id = n.node_id AND gi.status = 'available') AS game_count
            FROM library_nodes n
            WHERE (%(clerk_id)s IS NULL OR n.clerk_id = %(clerk_id)s)
            ORDER BY n.name
        ) ns
    ) AS nodes,
    (
        SELECT json_object_agg(store, cnt) FROM (
            SELECT i.store, COUNT(*) AS cnt
            FROM game_installations i
            JOIN library_nodes n ON n.node_id = i.node_id
            WHERE i.status = 'available'
              AND (%(clerk_id)s IS NULL OR n.clerk_id = %(clerk_id)s)
            GROUP BY i.store
        ) sc
    ) AS store_distribution;
