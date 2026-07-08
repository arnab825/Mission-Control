import sqlite3

conn = sqlite3.connect('data/agent_memory.db')
cur = conn.cursor()

# Check all messages
cur.execute("SELECT COUNT(*) FROM chat_messages")
total = cur.fetchone()[0]
print(f"Total messages: {total}")

# Check encrypted ones
cur.execute("SELECT COUNT(*) FROM chat_messages WHERE content LIKE 'ENC:%'")
encrypted = cur.fetchone()[0]
print(f"Encrypted (ENC:) messages: {encrypted}")

# Show first plaintext message
cur.execute("SELECT content FROM chat_messages WHERE content NOT LIKE 'ENC:%' LIMIT 1")
row = cur.fetchone()
if row:
    print(f"Sample plaintext: {repr(row[0][:80])}")

# Show first encrypted message if any
cur.execute("SELECT content FROM chat_messages WHERE content LIKE 'ENC:%' LIMIT 1")
row = cur.fetchone()
if row:
    print(f"Sample encrypted: {repr(row[0][:80])}")
else:
    print("No encrypted messages found")

# Get a count breakdown
cur.execute("SELECT SUM(CASE WHEN content LIKE 'ENC:%' THEN 1 ELSE 0 END), SUM(CASE WHEN content NOT LIKE 'ENC:%' THEN 1 ELSE 0 END) FROM chat_messages")
enc_count, plain_count = cur.fetchone()
print(f"\nBreakdown: {enc_count or 0} encrypted, {plain_count or 0} plaintext")

conn.close()
