import os
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

# Load local .env only if running locally and DATABASE_URL is not already set in production environment
_env_path = Path(__file__).resolve().parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path, override=False)

db_url = os.getenv("DATABASE_URL")
if not db_url:
    raise RuntimeError("DATABASE_URL environment variable is required.")

conn = psycopg2.connect(db_url)
cur = conn.cursor()
cur.execute("SELECT id, title, summary, features, release_date FROM canonical_games WHERE id IN ('theme-hospital', 'swat-4-gold', 'senua-s-saga-hellblade-2');")
for r in cur.fetchall():
    print("ID:", r[0])
    print("Title:", r[1])
    print("Summary:", r[2])
    print("Features:", r[3])
    print("Release Date:", r[4])
    print("-" * 60)
