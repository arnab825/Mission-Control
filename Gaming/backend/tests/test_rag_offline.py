import gc
import os
import shutil
import sys
import unittest
from dotenv import load_dotenv

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from ai_brain.rag_engine import GameRAGEngine
from langchain_core.documents import Document

class TestRAGEngine(unittest.TestCase):
    def setUp(self):
        # Load environment variables from .env file
        load_dotenv()
        
        # Create unique temp directories inside tests directory
        self.test_dir = os.path.dirname(__file__)
        self.temp_data_dir = os.path.join(self.test_dir, "temp_rag_data")
        self.temp_persist_dir = os.path.join(self.test_dir, "temp_rag_persist")
        
        os.makedirs(self.temp_data_dir, exist_ok=True)
        os.makedirs(self.temp_persist_dir, exist_ok=True)
        
        self.engine = None

    def tearDown(self):
        # Close chroma client if possible to release file handles
        if self.engine:
            if hasattr(self.engine, '_chroma_client') and self.engine._chroma_client:
                try:
                    if hasattr(self.engine._chroma_client, 'close'):
                        self.engine._chroma_client.close()
                    elif hasattr(self.engine._chroma_client, '_system') and hasattr(self.engine._chroma_client._system, 'stop'):
                        self.engine._chroma_client._system.stop()
                except Exception:
                    pass
            self.engine = None
        
        # Force garbage collection to release Windows file locks
        gc.collect()
        
        # Clean up temp directories
        if os.path.exists(self.temp_data_dir):
            shutil.rmtree(self.temp_data_dir, ignore_errors=True)
        if os.path.exists(self.temp_persist_dir):
            shutil.rmtree(self.temp_persist_dir, ignore_errors=True)

    def _verify_engine_flow(self, engine):
        """Helper to run the full index, query, and metadata isolation flow on an engine instance."""
        self.assertTrue(engine.is_ready, "RAG Engine should be ready.")
        self.assertIsNotNone(engine.embeddings, "Embeddings should be initialized.")
        
        # 1. Ingest documents for different games
        engine.add_text(
            "Cyberpunk 2077 has a dense urban environment called Night City, which is divided into six districts.",
            source="cyberpunk_guide.txt",
            game_id="cyberpunk_2077"
        )
        engine.add_text(
            "In The Witcher 3: Wild Hunt, Geralt of Rivia is a monster hunter searching for his adopted daughter Ciri.",
            source="witcher_guide.txt",
            game_id="witcher_3"
        )

        # Verify documents were added
        self.assertEqual(engine.document_count, 2, "Expected 2 documents in the collection.")

        # 2. Query with matching game_id filter
        res_cp = engine.query("Where does Cyberpunk take place?", game_id="cyberpunk_2077")
        self.assertIn("Night City", res_cp, "Query should return Cyberpunk-related text.")
        self.assertNotIn("Geralt of Rivia", res_cp, "Query filtered for Cyberpunk should not contain Witcher content.")

        # 3. Query with different game_id filter to test isolation
        res_cp_filtered = engine.query("Where is Geralt?", game_id="cyberpunk_2077")
        self.assertNotIn("Geralt of Rivia", res_cp_filtered, "Query filtered for Cyberpunk must not return Witcher content.")

        # 4. Query for Witcher with proper game_id filter
        res_witcher = engine.query("Who is the main protagonist in Witcher 3?", game_id="witcher_3")
        self.assertIn("Geralt of Rivia", res_witcher, "Query should return Witcher-related text.")
        self.assertNotIn("Night City", res_witcher, "Query filtered for Witcher should not contain Cyberpunk content.")

        # 5. Query without game_id filter (global query)
        res_global = engine.query("Geralt of Night City", k=2)
        self.assertIn("Geralt of Rivia", res_global, "Global query should match Witcher.")
        self.assertIn("Night City", res_global, "Global query should match Cyberpunk.")

    def test_nvidia_cloud_embeddings(self):
        """Test RAG engine using the high-quality NVIDIA cloud embeddings if the API key is present."""
        nvidia_key = os.environ.get("NVIDIA_API_KEY")
        if not nvidia_key:
            self.skipTest("NVIDIA_API_KEY not found in environment. Skipping NVIDIA Cloud Embeddings test.")
            
        print("\n[TEST] Running RAG test with NVIDIA Cloud Embeddings (1024-dim)...")
        self.engine = GameRAGEngine(
            data_dir=self.temp_data_dir,
            persist_dir=self.temp_persist_dir,
            nvidia_api_key=nvidia_key
        )
        self._verify_engine_flow(self.engine)

if __name__ == "__main__":
    unittest.main()
