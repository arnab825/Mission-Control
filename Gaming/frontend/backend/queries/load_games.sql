SELECT id, name, platform, install_path, exe_path,
       icon, features, type, genre, tags, source, local_banner
FROM games
WHERE user_id = %s
ORDER BY name;
