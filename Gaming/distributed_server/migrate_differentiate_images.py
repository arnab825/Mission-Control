import os
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path, override=False)

db_url = os.getenv("DATABASE_URL")
if not db_url:
    raise RuntimeError("DATABASE_URL is required.")

conn = psycopg2.connect(db_url)
cur = conn.cursor()

# 1. For all Steam games where cover_url has header.jpg, change to portrait library_600x900_2x.jpg
sql_steam_covers = """
UPDATE canonical_games
SET cover_url = REPLACE(cover_url, '/header.jpg', '/library_600x900_2x.jpg')
WHERE cover_url LIKE '%/header.jpg%' AND cover_url LIKE '%steamstatic.com%';
"""

# 2. For all Steam games where banner_url has header.jpg, change to wide library_hero.jpg
sql_steam_banners = """
UPDATE canonical_games
SET banner_url = REPLACE(banner_url, '/header.jpg', '/library_hero.jpg')
WHERE banner_url LIKE '%/header.jpg%' AND banner_url LIKE '%steamstatic.com%';
"""

# 3. For any games where cover_url and banner_url are identical and contain app id, differentiate them
sql_differentiate = """
UPDATE canonical_games
SET 
    cover_url = REGEXP_REPLACE(cover_url, '/(header|library_hero)\.jpg', '/library_600x900_2x.jpg'),
    banner_url = REGEXP_REPLACE(banner_url, '/(header|library_600x900_2x)\.jpg', '/library_hero.jpg')
WHERE (cover_url = banner_url OR cover_url LIKE '%/header.jpg%')
  AND cover_url LIKE '%steamstatic.com%';
"""

print("Running image URL differentiation migration on canonical_games...")
cur.execute(sql_steam_covers)
covers_updated = cur.rowcount
print(f"Updated {covers_updated} cover URLs to Portrait (library_600x900_2x.jpg).")

cur.execute(sql_steam_banners)
banners_updated = cur.rowcount
print(f"Updated {banners_updated} banner URLs to Wide Hero (library_hero.jpg).")

cur.execute(sql_differentiate)
diff_updated = cur.rowcount
print(f"Updated {diff_updated} identical cover/banner pairs.")

conn.commit()
print("Migration completed successfully!")
