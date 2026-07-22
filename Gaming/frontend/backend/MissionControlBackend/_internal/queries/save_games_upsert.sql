INSERT INTO games
    (id, user_id, name, platform, install_path, exe_path,
     icon, features, type, genre, tags, source, local_banner)
VALUES %s
ON CONFLICT (id, user_id) DO UPDATE SET
    name         = EXCLUDED.name,
    platform     = EXCLUDED.platform,
    install_path = EXCLUDED.install_path,
    exe_path     = EXCLUDED.exe_path,
    icon         = EXCLUDED.icon,
    features     = EXCLUDED.features,
    type         = EXCLUDED.type,
    genre        = EXCLUDED.genre,
    tags         = EXCLUDED.tags,
    source       = EXCLUDED.source,
    local_banner = EXCLUDED.local_banner;
