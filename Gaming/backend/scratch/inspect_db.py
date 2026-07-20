import sqlite3
import os

db_path = r"E:\AiAssistant\Gaming\backend\rag_data\pcgw_features.db"
if not os.path.exists(db_path):
    print("Database path does not exist:", db_path)
    exit(1)

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Get tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cur.fetchall()
print("Tables in database:", tables)

for table in tables:
    t_name = table[0]
    cur.execute(f"SELECT COUNT(*) FROM {t_name}")
    count = cur.fetchone()[0]
    print(f"Table '{t_name}' has {count} rows")
    
    # Get columns
    cur.execute(f"PRAGMA table_info({t_name})")
    cols = cur.fetchall()
    print(f"Columns for '{t_name}':", [c[1] for c in cols])
    
    # Select first few rows
    cur.execute(f"SELECT * FROM {t_name} LIMIT 3")
    print(f"Sample data for '{t_name}':", cur.fetchall())

conn.close()
