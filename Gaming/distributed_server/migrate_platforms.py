import os
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

_env = Path(__file__).resolve().parent / ".env"
if _env.exists():
    load_dotenv(_env, override=False)

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

sql = "UPDATE canonical_games SET platforms = ARRAY['Windows', 'Linux'] WHERE platforms = ARRAY['Windows'] OR platforms IS NULL OR platforms = '{}';"
cur.execute(sql)
updated_count = cur.rowcount
conn.commit()

print(f"Updated {updated_count} games in canonical_games to include Linux support!")
