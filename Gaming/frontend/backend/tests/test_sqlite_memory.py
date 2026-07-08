import logging
logging.basicConfig(level=logging.DEBUG)

from ai_brain.memory import GameMemory

def test_memory():
    print("Initializing GameMemory (SQLite)...")
    mem = GameMemory()
    print("Database path:", mem.save_path)
    
    print("Recording scene...")
    mem.record_scene("combat", 0.95)
    
    print("Recording event...")
    mem.record_event("combat_start", {"enemy_type": "boss", "health": 100})
    
    print("Recording advice...")
    mem.record_advice("Use fire against this enemy.", "high", "combat")
    
    print("Testing chat sessions...")
    mem.create_chat_session("sess_01", "Boss Fight Chat")
    mem.add_chat_message("sess_01", "user", "What is the boss's weakness?")
    mem.add_chat_message("sess_01", "agent", "The boss is weak to fire.")
    
    print("Chat History:")
    history = mem.get_chat_history("sess_01")
    for msg in history:
        print(f"  {msg['role']}: {msg['content']}")
        
    print("FTS Search for 'fire':")
    results = mem.search_chat("fire")
    for res in results:
        print(f"  Match: {res['role']} - {res['content']}")

if __name__ == "__main__":
    test_memory()
