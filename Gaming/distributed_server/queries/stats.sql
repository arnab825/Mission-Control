-- Aggregated library statistics
SELECT
    (SELECT COUNT(*) FROM canonical_games) AS total_master_games,
    (SELECT COUNT(DISTINCT game_id) FROM game_installations WHERE status = 'available') AS total_installed_games,
    (SELECT COUNT(*) FROM library_nodes) AS total_nodes,
    (SELECT COUNT(*) FROM library_nodes WHERE status = 'online') AS online_nodes,
    (SELECT COALESCE(SUM(storage_total), 0) FROM library_nodes WHERE status = 'online') AS total_storage_bytes,
    (SELECT COALESCE(SUM(storage_used), 0) FROM library_nodes WHERE status = 'online') AS used_storage_bytes,
    (SELECT COALESCE(SUM(storage_free), 0) FROM library_nodes WHERE status = 'online') AS free_storage_bytes,
    (
        SELECT json_agg(row_to_json(ns)) FROM (
            SELECT
                n.node_id, n.name, n.hostname, n.ip, n.status,
                n.storage_total, n.storage_used, n.storage_free,
                n.last_heartbeat,
                (SELECT COUNT(*) FROM game_installations gi WHERE gi.node_id = n.node_id AND gi.status = 'available') AS game_count
            FROM library_nodes n
            ORDER BY n.name
        ) ns
    ) AS nodes,
    (
        SELECT json_object_agg(store, cnt) FROM (
            SELECT store, COUNT(*) AS cnt
            FROM game_installations
            WHERE status = 'available'
            GROUP BY store
        ) sc
    ) AS store_distribution;
