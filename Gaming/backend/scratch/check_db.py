import glob
import os
import sqlite3

for db in glob.glob("**/*.db", recursive=True):
    try:
        c = sqlite3.connect(db)
        cur = c.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in cur.fetchall()]
        for t in tables:
            try:
                cur.execute(f"SELECT * FROM {t}")
                for row in cur.fetchall():
                    s = str(row)
                    if "Neural failure" in s or "list index out of range" in s:
                        print(f"FOUND IN DB {db} table {t}: {s[:200]}")
            except Exception:
                pass
    except Exception:
        pass

for root, dirs, files in os.walk("."):
    if ".venv" in root or "__pycache__" in root or "node_modules" in root or ".git" in root:
        continue
    for f in files:
        if f.endswith((".json", ".txt", ".jsonl", ".log")):
            p = os.path.join(root, f)
            try:
                with open(p, "r", encoding="utf-8", errors="ignore") as fp:
                    content = fp.read()
                    if "Neural failure" in content or "list index out of range" in content:
                        print(f"FOUND IN FILE: {p}")
            except Exception:
                pass
