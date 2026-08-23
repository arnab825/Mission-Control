-- Upsert a canonical game (insert or update on conflict)
INSERT INTO canonical_games (
    id, title, normalized_title, developer, publisher, release_date,
    primary_genre, genres, tags, features, platforms, launchers, cover_url, banner_url,
    summary, ai_classified, ai_confidence, raw_tags, metadata, updated_at
) VALUES (
    %(id)s, %(title)s, %(normalized_title)s, %(developer)s, %(publisher)s, %(release_date)s,
    %(primary_genre)s, %(genres)s, %(tags)s, %(features)s, %(platforms)s, %(launchers)s, %(cover_url)s, %(banner_url)s,
    %(summary)s, %(ai_classified)s, %(ai_confidence)s, %(raw_tags)s, %(metadata)s, NOW()
)
ON CONFLICT (id) DO UPDATE SET
    title             = EXCLUDED.title,
    normalized_title  = EXCLUDED.normalized_title,
    developer         = COALESCE(EXCLUDED.developer, canonical_games.developer),
    publisher         = COALESCE(EXCLUDED.publisher, canonical_games.publisher),
    release_date      = COALESCE(EXCLUDED.release_date, canonical_games.release_date),
    primary_genre     = COALESCE(EXCLUDED.primary_genre, canonical_games.primary_genre),
    genres            = CASE WHEN array_length(EXCLUDED.genres, 1) > 0 THEN EXCLUDED.genres ELSE canonical_games.genres END,
    tags              = CASE WHEN array_length(EXCLUDED.tags, 1) > 0 THEN EXCLUDED.tags ELSE canonical_games.tags END,
    features          = CASE WHEN array_length(EXCLUDED.features, 1) > 0 THEN EXCLUDED.features ELSE canonical_games.features END,
    platforms         = CASE WHEN array_length(EXCLUDED.platforms, 1) > 0 THEN EXCLUDED.platforms ELSE canonical_games.platforms END,
    launchers         = CASE WHEN array_length(EXCLUDED.launchers, 1) > 0 THEN EXCLUDED.launchers ELSE canonical_games.launchers END,
    cover_url         = COALESCE(EXCLUDED.cover_url, canonical_games.cover_url),
    banner_url        = COALESCE(EXCLUDED.banner_url, canonical_games.banner_url),
    summary           = COALESCE(EXCLUDED.summary, canonical_games.summary),
    ai_classified     = EXCLUDED.ai_classified OR canonical_games.ai_classified,
    ai_confidence     = GREATEST(EXCLUDED.ai_confidence, canonical_games.ai_confidence),
    raw_tags          = EXCLUDED.raw_tags,
    metadata          = canonical_games.metadata || EXCLUDED.metadata,
    updated_at        = NOW();
