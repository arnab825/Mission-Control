import os
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

_env = Path(__file__).resolve().parent / ".env"
if _env.exists():
    load_dotenv(_env, override=False)

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

# 1. Add column launchers if it doesn't exist
cur.execute("ALTER TABLE canonical_games ADD COLUMN IF NOT EXISTS launchers TEXT[] DEFAULT ARRAY['Steam'];")

# 2. Populate launchers based on metadata & tags
cur.execute("""
UPDATE canonical_games
SET launchers = CASE
    WHEN metadata->>'store' = 'epic' THEN ARRAY['Epic Games']
    WHEN metadata->>'store' = 'gog' THEN ARRAY['GOG Galaxy']
    WHEN metadata->>'store' = 'xbox' THEN ARRAY['Xbox', 'PC Game Pass']
    WHEN metadata->>'store' = 'steam' THEN ARRAY['Steam']
    WHEN 'Epic Games' = ANY(raw_tags) THEN ARRAY['Epic Games']
    WHEN 'GOG' = ANY(raw_tags) THEN ARRAY['GOG Galaxy']
    WHEN 'Xbox' = ANY(raw_tags) THEN ARRAY['Xbox', 'PC Game Pass']
    ELSE ARRAY['Steam']
END
WHERE launchers IS NULL OR launchers = '{}';
""")

updated_count = cur.rowcount
conn.commit()
print(f"Added 'launchers' column to canonical_games and updated {updated_count} rows!")
