from system.db_manager import DatabaseManager
from dotenv import load_dotenv

load_dotenv()
db = DatabaseManager()

if db.available:
    print("Supabase connection is AVAILABLE.")
    games = db.load_games("test_user_123")
    print(f"Loaded {len(games)} games for test_user_123.")
    
    # Save a test game
    test_games = [{
        "id": "game_1",
        "name": "Super Test Game",
        "platform": "Steam",
        "exe_path": "C:\\Games\\Test\\game.exe",
        "features": ["DLSS"]
    }]
    
    print("Saving test game...")
    success = db.save_games(test_games, "test_user_123")
    print(f"Save success: {success}")
    
    games = db.load_games("test_user_123")
    print(f"Loaded {len(games)} games after save.")
else:
    print("Supabase connection is NOT AVAILABLE. Please check .env DATABASE_URL.")
