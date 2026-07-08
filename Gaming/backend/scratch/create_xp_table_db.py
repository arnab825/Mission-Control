import os
import psycopg2
from dotenv import load_dotenv

# Load .env file
load_dotenv()

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("Error: DATABASE_URL not found in .env")
    exit(1)

# Read SQL file
sql_file_path = os.path.join(os.path.dirname(__file__), "..", "queries", "create_xp_table.sql")
with open(sql_file_path, "r") as f:
    sql = f.read()

print("Connecting to database...")
try:
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    with conn.cursor() as cur:
        print("Executing SQL query:")
        print(sql)
        cur.execute(sql)
    print("Table created successfully!")
    conn.close()
except Exception as e:
    print("Database connection/execution error:", e)
