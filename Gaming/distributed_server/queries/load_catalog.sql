-- Load paginated catalog with aggregated installation info per game
SELECT
    g.id,
    g.title,
    g.developer,
    g.publisher,
    g.release_date,
    g.primary_genre,
    g.genres,
    g.tags,
    g.features,
    g.platforms,
    g.cover_url,
    g.banner_url,
    g.description AS summary,
    g.ai_classified,
    g.metadata,
    COALESCE(
        json_agg(
            json_build_object(
                'id',           i.id,
                'nodeId',       i.node_id,
                'nodeName',     n.name,
                'nodeStatus',   n.status,
                'store',        i.store,
                'storeAppId',   i.store_app_id,
                'installPath',  i.install_path,
                'exePath',      i.exe_path,
                'version',      i.version,
                'sizeBytes',    i.size_bytes,
                'status',       i.status
            ) ORDER BY n.name, i.store
        ) FILTER (WHERE i.id IS NOT NULL),
        '[]'::json
    ) AS installations
FROM canonical_games g
LEFT JOIN (
    game_installations i
    JOIN library_nodes n ON n.node_id = i.node_id AND (%(clerk_id)s IS NULL OR n.clerk_id = %(clerk_id)s)
) ON i.game_id = g.id
WHERE
    (%(search)s IS NULL OR to_tsvector('english', g.title) @@ plainto_tsquery('english', %(search)s)
     OR g.normalized_title ILIKE '%%' || %(search_like)s || '%%')
    AND (%(genre)s IS NULL OR g.primary_genre ILIKE %(genre)s OR %(genre)s = ANY(g.genres))
    AND (%(node_id)s IS NULL OR i.node_id = %(node_id)s)
    AND (%(store)s IS NULL OR i.store = %(store)s)
    AND (%(installed_only)s = FALSE OR i.id IS NOT NULL)
    AND (%(last_seen_id)s IS NULL OR g.id > %(last_seen_id)s)
GROUP BY g.id
ORDER BY g.id ASC
LIMIT %(limit)s OFFSET %(offset)s;
