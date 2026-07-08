import os
import sys
import unittest
import threading
import time
import shutil
from unittest.mock import MagicMock, patch

# Ensure the backend directory is in the path
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from ai_brain.memory import GameMemory
from ai_brain.rag_engine import GameRAGEngine
from ai_brain.decision_maker import GameBrain
from langchain_core.documents import Document

class MockEmbeddings:
    def embed_query(self, text):
        return [0.1] * 1024
    def embed_documents(self, texts):
        return [[0.1] * 1024 for _ in texts]

class TestAgentMemoryComprehensive(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        cls.test_db_dir = os.path.join(os.path.dirname(__file__), "temp_test_data")
        os.makedirs(cls.test_db_dir, exist_ok=True)
        
    @classmethod
    def tearDownClass(cls):
        if os.path.exists(cls.test_db_dir):
            try:
                shutil.rmtree(cls.test_db_dir)
            except Exception:
                pass

    def setUp(self):
        self.db_path = os.path.join(self.test_db_dir, f"test_db_{int(time.time() * 1000)}.db")
        self.rag_data_dir = os.path.join(self.test_db_dir, "rag_data")
        self.rag_persist_dir = os.path.join(self.test_db_dir, "rag_index")
        os.makedirs(self.rag_data_dir, exist_ok=True)
        os.makedirs(self.rag_persist_dir, exist_ok=True)

    def tearDown(self):
        for ext in ["", "-shm", "-wal"]:
            path = self.db_path + ext
            if os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass
        if os.path.exists(self.rag_data_dir):
            try:
                shutil.rmtree(self.rag_data_dir)
            except Exception:
                pass
        if os.path.exists(self.rag_persist_dir):
            try:
                shutil.rmtree(self.rag_persist_dir)
            except Exception:
                pass

    def test_01_multi_user_isolation(self):
        """Test that Alice's and Bob's profiles and chat sessions are strictly isolated."""
        memory = GameMemory(save_path=self.db_path, config={})
        
        alice_sess = "session_alice_123"
        memory.create_chat_session(alice_sess, title="Alice's Adventure", user_id="Alice")
        memory.add_chat_message(alice_sess, "user", "Hello, I am Alice.", user_id="Alice")
        memory.add_chat_message(alice_sess, "agent", "Welcome, Alice!", user_id="Alice")
        
        bob_sess = "session_bob_456"
        memory.create_chat_session(bob_sess, title="Bob's Sandbox", user_id="Bob")
        memory.add_chat_message(bob_sess, "user", "Hi, this is Bob.", user_id="Bob")
        memory.add_chat_message(bob_sess, "agent", "Hey Bob!", user_id="Bob")
        
        alice_sessions = memory.get_chat_sessions(user_id="Alice")
        self.assertEqual(len(alice_sessions), 1)
        self.assertEqual(alice_sessions[0]["id"], alice_sess)
        self.assertEqual(alice_sessions[0]["title"], "Alice's Adventure")
        
        bob_sessions = memory.get_chat_sessions(user_id="Bob")
        self.assertEqual(len(bob_sessions), 1)
        self.assertEqual(bob_sessions[0]["id"], bob_sess)
        self.assertEqual(bob_sessions[0]["title"], "Bob's Sandbox")
        
        alice_history = memory.get_chat_history(alice_sess)
        self.assertEqual(len(alice_history), 2)
        self.assertEqual(alice_history[0]["content"], "Hello, I am Alice.")
        
        bob_history = memory.get_chat_history(bob_sess)
        self.assertEqual(len(bob_history), 2)
        self.assertEqual(bob_history[0]["content"], "Hi, this is Bob.")

    def test_02_multi_turn_chat_context(self):
        """Test chronological tracking of multi-turn chat context."""
        memory = GameMemory(save_path=self.db_path, config={})
        session_id = "test_multi_turn"
        
        turns = [
            ("user", "What is the capital of France?"),
            ("agent", "Paris is the capital of France."),
            ("user", "What is its population?"),
            ("agent", "About 2.1 million people live in Paris proper.")
        ]
        
        for role, content in turns:
            memory.add_chat_message(session_id, role, content, user_id="guest")
            time.sleep(0.01)
            
        history = memory.get_chat_history(session_id)
        self.assertEqual(len(history), 4)
        
        for i, (expected_role, expected_content) in enumerate(turns):
            self.assertEqual(history[i]["role"], expected_role)
            self.assertEqual(history[i]["content"], expected_content)
            if i > 0:
                self.assertTrue(history[i]["timestamp"] >= history[i-1]["timestamp"])

    def test_03_rag_metadata_isolation(self):
        """Test vector store metadata filtering constraints (game_id scopes)."""
        engine = GameRAGEngine(
            data_dir=self.rag_data_dir,
            persist_dir=self.rag_persist_dir,
            nvidia_api_key="mock_key"
        )
        engine.embeddings = MockEmbeddings()
        engine._initialize_vector_store()
        
        self.assertTrue(engine.is_ready)
        
        engine.add_text("Cyberpunk 2077 tips: Upgrade your cyberdeck early. Use quickhacks like Short Circuit.", source="guide_a", game_id="cyberpunk_2077")
        engine.add_text("GTA V advice: Steal the laser jet from Fort Zancudo by using a fast car.", source="guide_b", game_id="gta_v")
        
        res_cyberpunk = engine.query("quickhacks", k=5, game_id="cyberpunk_2077")
        self.assertIn("cyberdeck", res_cyberpunk)
        self.assertNotIn("Zancudo", res_cyberpunk)
        
        res_gta = engine.query("Fort Zancudo jet", k=5, game_id="gta_v")
        self.assertIn("Zancudo", res_gta)
        self.assertNotIn("cyberdeck", res_gta)
        
        res_all = engine.query("laser jet and quickhacks", k=5)
        self.assertIn("cyberdeck", res_all)
        self.assertIn("Zancudo", res_all)

    def test_04_privacy_and_encryption_transitions(self):
        """Test encryption transition: SQLite FTS plain searches vs fallback decrypted scans."""
        # A: Privacy Disabled. Normal FTS5 search.
        memory_plain = GameMemory(save_path=self.db_path, config={"privacy": {"enabled": False}})
        sess_plain = "session_plain"
        memory_plain.add_chat_message(sess_plain, "user", "Locate the hidden dragon cave in the mountains.", user_id="guest")
        
        res_plain = memory_plain.search_chat("dragon")
        self.assertEqual(len(res_plain), 1)
        self.assertEqual(res_plain[0]["content"], "Locate the hidden dragon cave in the mountains.")
        
        cur = memory_plain._conn.cursor()
        cur.execute("SELECT content FROM chat_messages WHERE session_id = ?", (sess_plain,))
        row = cur.fetchone()
        self.assertEqual(row["content"], "Locate the hidden dragon cave in the mountains.")
        
        memory_plain._conn.close()
        for ext in ["", "-shm", "-wal"]:
            if os.path.exists(self.db_path + ext):
                os.remove(self.db_path + ext)
                
        # B: Privacy Enabled. Plaintext FTS fails (stores ciphertext), Fallback decrypts and scans.
        memory_secure = GameMemory(save_path=self.db_path, config={"privacy": {"enabled": True}})
        sess_secure = "session_secure"
        memory_secure.add_chat_message(sess_secure, "user", "The top secret vault code is 4821.", user_id="guest")
        
        cur = memory_secure._conn.cursor()
        cur.execute("SELECT content FROM chat_messages WHERE session_id = ?", (sess_secure,))
        row = cur.fetchone()
        self.assertTrue(row["content"].startswith("ENC:"))
        
        res_secure = memory_secure.search_chat("secret")
        self.assertEqual(len(res_secure), 1)
        self.assertEqual(res_secure[0]["content"], "The top secret vault code is 4821.")
        
        memory_secure._conn.close()

    def test_05_thread_safety_concurrency(self):
        """Test concurrent DB writes/reads to verify thread safety (no OperationalError / deadlocks)."""
        memory = GameMemory(save_path=self.db_path, config={})
        
        num_threads = 8
        messages_per_thread = 15
        errors = []
        
        def worker(thread_idx):
            session_id = f"thread_session_{thread_idx}"
            try:
                for i in range(messages_per_thread):
                    memory.add_chat_message(session_id, "user", f"Message {i} from thread {thread_idx}")
                    memory.record_event("test_event", {"thread": thread_idx, "index": i})
                    memory.record_advice(f"Advice {i} for thread {thread_idx}", "medium", "test")
                    
                    history = memory.get_chat_history(session_id)
                    self.assertTrue(len(history) > 0)
                    
                    _ = memory.search_chat("Message")
                    
                    time.sleep(0.005)
            except Exception as e:
                errors.append(e)
                
        threads = []
        for i in range(num_threads):
            t = threading.Thread(target=worker, args=(i,))
            threads.append(t)
            t.start()
            
        for t in threads:
            t.join()
            
        self.assertEqual(errors, [], f"Concurrency errors encountered: {errors}")
        
        cur = memory._conn.cursor()
        cur.execute("SELECT count(*) as count FROM chat_messages")
        row = cur.fetchone()
        self.assertEqual(row["count"], num_threads * messages_per_thread)
        memory._conn.close()

    @patch("ai_brain.memory.MemoryClient")
    def test_06_mem0_integration(self, mock_mem0_client_class):
        """Verify Mem0 integration calls and semantic profile injection."""
        mock_client = MagicMock()
        mock_mem0_client_class.return_value = mock_client
        
        mock_client.get_all.return_value = [{"memory": "Alice likes stealth builds."}]
        mock_client.search.return_value = [{"memory": "Alice plays Cyberpunk."}]
        
        with patch.dict(os.environ, {"MEM0_API_KEY": "test_mem0_api_key"}):
            memory = GameMemory(save_path=self.db_path, config={})
            
            self.assertIsNotNone(memory.mem0_client)
            
            res_all = memory.get_semantic_memory(user_id="Alice", query="")
            mock_client.get_all.assert_called_once_with(filters={"user_id": "Alice"})
            self.assertEqual(res_all, "- Alice likes stealth builds.")
            
            res_search = memory.get_semantic_memory(user_id="Alice", query="Cyberpunk")
            mock_client.search.assert_called_once_with(query="Cyberpunk", filters={"user_id": "Alice"})
            self.assertEqual(res_search, "- Alice plays Cyberpunk.")
            
            session_id = "mem0_extract_sess"
            memory.add_chat_message(session_id, "user", "I prefer sniper rifles.", user_id="Alice")
            memory.add_chat_message(session_id, "agent", "A sniper rifle is perfect for stealth.", user_id="Alice")
            
            memory.extract_and_store_semantic_memory(session_id, user_id="Alice")
            mock_client.add.assert_called_once()
            add_args, add_kwargs = mock_client.add.call_args
            self.assertEqual(add_kwargs["user_id"], "Alice")
            self.assertEqual(len(add_args[0]), 2)
            self.assertEqual(add_args[0][0]["content"], "I prefer sniper rifles.")
            
            memory._conn.close()

    @patch("openai.OpenAI")
    def test_07_nim_integration_and_model_routing(self, mock_openai_class):
        """Test NIM completions routing, welcome messages, and prompt anonymization."""
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client
        
        mock_choice = MagicMock()
        mock_choice.message.content = "Tactical response mock."
        mock_completion = MagicMock()
        mock_completion.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_completion
        
        custom_config = {
            "ai_agent": {
                "nvidia_api_key": "mock_api_key",
                "model_id": "meta/llama-3.3-70b-instruct",
                "tactical_model": "meta/llama-3.3-tactical-mock",
                "prompts": {
                    "welcome_fallback": "Custom fallback greeting."
                }
            },
            "privacy": {
                "enabled": True,
                "anonymize": True
            }
        }
        
        with patch("system.hw_checker.check_internet", return_value=True):
            brain = GameBrain(config=custom_config)
            
        self.assertEqual(brain.task_models["strategic"], "meta/llama-3.3-70b-instruct")
        
        brain.client = None
        resp_welcome = brain.reply_to_prompt("greet the user", user_id="test_user")
        self.assertEqual(resp_welcome, "Custom fallback greeting.")
        
        brain.client = mock_client
        prompt_with_secrets = "Help me optimize GTA V on Windows 11 under C:\\Users\\johndoe\\Documents\\game.exe"
        
        _ = brain.reply_to_prompt(prompt_with_secrets, user_id="test_user")
        
        mock_client.chat.completions.create.assert_called_once()
        call_args, call_kwargs = mock_client.chat.completions.create.call_args
        sent_messages = call_kwargs["messages"]
        user_message_content = next(m["content"] for m in sent_messages if m["role"] == "user")
        
        self.assertNotIn("Windows 11", user_message_content)
        self.assertNotIn("johndoe", user_message_content)
        self.assertNotIn("C:\\Users\\johndoe\\Documents\\game.exe", user_message_content)
        self.assertTrue("<ANONYMOUS_OS>" in user_message_content or "<SYSTEM_USER>" in user_message_content or "game.exe" in user_message_content)


if __name__ == "__main__":
    unittest.main()
