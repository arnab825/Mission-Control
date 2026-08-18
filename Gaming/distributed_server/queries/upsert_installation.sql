-- Upsert a game installation record for a specific node
INSERT INTO game_installations (
    id, game_id, node_id, store, store_app_id,
    install_path, exe_path, version, size_bytes, status,
    last_scanned_at, updated_at
) VALUES (
    %(id)s, %(game_id)s, %(node_id)s, %(store)s, %(store_app_id)s,
    %(install_path)s, %(exe_path)s, %(version)s, %(size_bytes)s, %(status)s,
    NOW(), NOW()
)
ON CONFLICT (game_id, node_id, store) DO UPDATE SET
    store_app_id      = COALESCE(EXCLUDED.store_app_id, game_installations.store_app_id),
    install_path      = EXCLUDED.install_path,
    exe_path          = COALESCE(EXCLUDED.exe_path, game_installations.exe_path),
    version           = COALESCE(EXCLUDED.version, game_installations.version),
    size_bytes        = EXCLUDED.size_bytes,
    status            = EXCLUDED.status,
    last_verified_at  = NOW(),
    last_scanned_at   = NOW(),
    updated_at        = NOW();
