import os
import re

gk_path = r"c:\GitHub\AiAssistant\Gaming\backend\ai_brain\game_knowledge.py"
dm_path = r"c:\GitHub\AiAssistant\Gaming\backend\ai_brain\decision_maker.py"

# --- Patch game_knowledge.py ---
with open(gk_path, "r", encoding="utf-8") as f:
    gk_content = f.read()

layer1_code = """    def query_knowledge(self, prompt: str, game_name: str, config: dict) -> dict:
        \"\"\"
        Layer 1 Unified Interface: Queries RAG (local docs) and Web Search (wiki, patch notes) concurrently.
        Returns a dict with 'rag_context' and 'web_context'.
        \"\"\"
        result = {"rag_context": "", "web_context": ""}
        
        from concurrent.futures import ThreadPoolExecutor, wait
        
        # Init RAG Engine lazily
        if not hasattr(self, "_rag_engine"):
            try:
                from ai_brain.rag_engine import GameRAGEngine
                base_dir = os.path.dirname(os.path.abspath(__file__))
                self._rag_engine = GameRAGEngine(
                    data_dir=os.path.join(base_dir, "rag_data"),
                    persist_dir=os.path.join(base_dir, "rag_index"),
                    nvidia_api_key=config.get("ai_agent", {}).get("nvidia_api_key")
                )
            except Exception as e:
                logger.error(f"Failed to initialize RAG Engine: {e}")
                self._rag_engine = None

        # Init Web Search Engine lazily
        if not hasattr(self, "_web_search"):
            try:
                from ai_brain.web_search import WebSearchEngine
                self._web_search = WebSearchEngine(config=config)
            except Exception as e:
                logger.error(f"Failed to initialize Web Search: {e}")
                self._web_search = None
                
        def run_rag():
            if self._rag_engine:
                try:
                    rag_res = self._rag_engine.query(prompt, k=4)
                    if rag_res and len(rag_res) > 20:
                        result["rag_context"] = f"\\n[RAG Context (Local Docs)]:\\n{rag_res}"
                except Exception as e:
                    logger.debug(f"RAG query failed: {e}")
                    
        def run_web():
            if self._web_search:
                try:
                    task = self._web_search.detect_task(prompt)
                    search_res = self._web_search.search(prompt, task=task, game_name=game_name)
                    if search_res and search_res.get("answer"):
                        result["web_context"] = f"\\n[Live Web Context ({search_res.get('source', 'web')}, {task})]:\\n{search_res['answer']}"
                except Exception as e:
                    logger.debug(f"Web query failed: {e}")

        executor = ThreadPoolExecutor(max_workers=2)
        futures = [executor.submit(run_rag), executor.submit(run_web)]
        wait(futures, timeout=8.0)
        executor.shutdown(wait=False)
        
        return result

"""

# Insert it before convenience accessors
if "def query_knowledge(" not in gk_content:
    gk_content = gk_content.replace("    # ── Convenience accessors", layer1_code + "    # ── Convenience accessors")
    with open(gk_path, "w", encoding="utf-8") as f:
        f.write(gk_content)
    print("Patched game_knowledge.py")


# --- Patch decision_maker.py ---
with open(dm_path, "r", encoding="utf-8") as f:
    dm_content = f.read()

# Replace RAG and Web logic in reply_to_prompt with Layer 1 call
old_rag_logic = """        rag_context = ""
        web_context = ""

        # --- CONCURRENT RAG AND WEB SEARCH ---"""

# We just find the concurrent executor block in reply_to_prompt and replace it.
# Actually, since the user already gave me the script method to use regex, I'll just use a regex to replace the ThreadPoolExecutor block in decision_maker.py.

executor_regex = re.compile(r'        rag_context = "".*?executor\.shutdown\(wait=False\)', re.DOTALL)

new_layer1_logic = """        # Layer 1: Query Knowledge Engine (RAG + Web Search)
        rag_context = ""
        web_context = ""
        try:
            from ai_brain.game_knowledge import get_knowledge_base
            kb = get_knowledge_base()
            knowledge = kb.query_knowledge(prompt, active_game, self.config)
            rag_context = knowledge.get("rag_context", "")
            web_context = knowledge.get("web_context", "")
        except Exception as e:
            logger.error(f"Layer 1 Knowledge Error: {e}")"""

if executor_regex.search(dm_content):
    dm_content = executor_regex.sub(new_layer1_logic, dm_content)
    with open(dm_path, "w", encoding="utf-8") as f:
        f.write(dm_content)
    print("Patched decision_maker.py")
else:
    print("Regex for ThreadPoolExecutor in decision_maker.py failed to match.")
