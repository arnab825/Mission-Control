# c:\GitHub\AI-Models\AI-Gaming-Assistant\ai_brain\decision_maker.py
"""
Multi-mode AI decision maker.
Supports competitive, story, and hybrid game modes.
Integrates scene classification and story analysis for context-aware advice.
"""
import logging
import os
import sys
import threading
import time

from ai_brain.prompts.persona_profiles import PERSONALITY_PROFILES
from ai_brain.telemetry_rules import TelemetryAdvisor
from control.agent_commands import AgentCommandProcessor, get_game_aliases

logger = logging.getLogger(__name__)


def _prepare_windows_ssl_runtime() -> None:
    """Prefer Python's own OpenSSL runtime on Windows before importing OpenAI SDK."""
    if sys.platform != "win32":
        return
    try:
        dll_dirs = []
        base_prefix = os.path.abspath(sys.base_prefix)
        dll_dirs.append(os.path.join(base_prefix, "DLLs"))
        dll_dirs.append(os.path.join(base_prefix, "Library", "bin"))
        exe_dir = os.path.dirname(sys.executable)
        dll_dirs.append(exe_dir)

        # Register DLL search directories first (best effort).
        for d in dll_dirs:
            if os.path.isdir(d):
                try:
                    os.add_dll_directory(d)
                except Exception:
                    pass

        # De-prioritize common non-Python OpenSSL locations from PATH.
        path_parts = os.environ.get("PATH", "").split(os.pathsep)
        blocked_markers = (
            "git\\usr\\bin",
            "git\\mingw64\\bin",
            "openssl\\bin",
            "\\windows\\system32",
        )
        preferred = []
        fallback = []
        for p in path_parts:
            norm = p.lower().replace("/", "\\")
            if any(marker in norm for marker in blocked_markers):
                fallback.append(p)
            else:
                preferred.append(p)
        os.environ["PATH"] = os.pathsep.join(preferred + fallback)
    except Exception as e:
        logger.debug("Windows SSL runtime preparation failed: %s", e)

# Task → NIM Model auto-routing map
_TASK_MODEL_MAP = {
    "wiki":      "tactical",    # Fast lookup → tactical model
    "patch":     "tactical",    # Recent data → tactical model
    "strategy":  "strategic",   # Deep reasoning → strategic model
    "real_time": "tactical",    # Speed matters → tactical model
    "general":   "strategic",   # Default → strategic model
    "vision":    "vision",       # Image tasks → vision model
}


# Delegate aliases generation
_get_game_aliases = get_game_aliases



class TaskModelsContainer:
    def __init__(self, brain):
        self._brain = brain
        self._raw_models = {}
        
    def __setitem__(self, key, value):
        if self._brain.sandbox:
            self._brain.sandbox.set(f"model_{key}", value)
            self._raw_models[key] = "[SANDBOXED]"
        else:
            self._raw_models[key] = value
            
    def __getitem__(self, key):
        return self.get(key)
        
    def get(self, key, default=None):
        if self._brain.sandbox:
            val = self._brain.sandbox.get(f"model_{key}")
            if val:
                return val
        return self._raw_models.get(key, default)
        
    def __repr__(self):
        if self._brain.sandbox:
            return str({k: "[ENCRYPTED]" for k in self._raw_models})
        return str(self._raw_models)


class GameBrain:
    """
    Central AI decision-making engine.
    
    Modes:
      - competitive: Fast tactical advice (enemies, health, positioning)
      - story: Narrative-aware advice (quests, dialogue, exploration)
      - hybrid: Both competitive + story (e.g. Souls-like games)
    """

    PERSONALITY_PROFILES = PERSONALITY_PROFILES


    def __init__(self, mode="competitive", config=None, memory=None):
        self.mode = mode
        self.config = config or {}
        self.memory = memory
        self._chat_lock = threading.Lock()
        
        # Connectivity state
        from system.hw_checker import check_internet
        self._online = check_internet()
        if not self._online:
            logger.warning("No internet connection detected. Entering Offline mode (Neural Lite).")
        
        # Initialize NVIDIA NIM Client (only if online)
        self.client = None
        if self._online:
            self._init_nim_client()
        else:
            logger.info("NVIDIA NIM skipped: Offline mode active.")
        
        # Volatile Secure Sandbox
        self.sandbox = None
        privacy_cfg = (self.config or {}).get("privacy", {})
        if privacy_cfg.get("secure_sandbox", False):
            from core.security import SecureSandbox
            self.sandbox = SecureSandbox(os.urandom(32))

        # Task-specific Nemotron model assignments
        self.task_models = TaskModelsContainer(self)
        self.task_models["strategic"] = "meta/llama-3.3-70b-instruct"
        self.task_models["tactical"] = "meta/llama-3.3-70b-instruct"
        self.task_models["vision"] = "meta/llama-3.2-11b-vision-instruct"

        # Load initial models from config if available
        if self.config:
            self.apply_config(self.config)
        
        # Web search engine (only enabled if online)
        from ai_brain.web_search import WebSearchEngine
        self._web_search = WebSearchEngine(config=config or {})
        if not self._online:
            logger.info("Web search disabled: Offline mode active.")

        # RAG Engine (Always enabled, uses Local ONNX fallback if offline/no key)
        from ai_brain.rag_engine import GameRAGEngine
        self._rag_engine = None
        try:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            data_dir = os.path.join(base_dir, "rag_data")
            persist_dir = os.path.join(base_dir, "rag_index")
            self._rag_engine = GameRAGEngine(
                data_dir=data_dir,
                persist_dir=persist_dir,
                nvidia_api_key=self.config.get("ai_agent", {}).get("nvidia_api_key") if self.config else None
            )
        except Exception as e:
            logger.error(f"Failed to initialize RAG Engine: {e}")
        
        # Feedback Loop Initialization
        try:
            from ai_brain.feedback_loop import FeedbackLoop
            self._feedback_loop = FeedbackLoop()
        except Exception as e:
            logger.error(f"Failed to initialize FeedbackLoop: {e}")
            self._feedback_loop = None

        # Optimization: Result Caching
        self._last_state_hash = None
        self._last_nim_result = None
        self._last_query_time = 0
        self._vision_failures = 0
        self._vision_disabled_until = 0
        self._chat_failures = 0
        self._chat_disabled_until = 0
        
        # Library context caching
        self._library_context_cache = {}
        self._library_cache_ttl = 60.0  # Cache for 60 seconds

        # Context Engine (Layer 2) - Limited to agent mode/page only
        self.context_engine = None
        if self.mode == "agent":
            try:
                from ai_brain.context_engine import ContextEngine
                self.context_engine = ContextEngine()
                self.context_engine.start()
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to start Context Engine: {e}")

    def get_game_library_context(self, user_id: str = None) -> str:
        """Load scanned games from cache and format it as context for the agent."""
        cache_key = user_id or "guest"
        now = time.time()
        if hasattr(self, "_library_context_cache") and cache_key in self._library_context_cache:
            cached_time, cached_val = self._library_context_cache[cache_key]
            if now - cached_time < self._library_cache_ttl:
                return cached_val

        try:
            from system.game_scanner import GameScanner
            scanner = GameScanner(config=self.config, user_id=user_id)
            games = scanner.load_cached_games()
            if games:
                games_lines = []
                launchers_lines = []
                for g in games:
                    g_type = str(g.get("type") or "").upper()
                    g_genre = str(g.get("genre") or "").upper()
                    g_name = str(g.get("name") or "").lower()
                    
                    is_launcher = g_type == "LAUNCHER" or g_genre == "PLATFORM" or g_name in (
                        "xbox app", "steam", "epic games launcher", "ea desktop", 
                        "ubisoft connect", "battle.net", "gog galaxy", "epic games"
                    )
                    
                    features_str = ", ".join(g.get("features", []))
                    feat_part = f" (Features: {features_str})" if features_str else ""
                    line = f"- {g.get('name')} [Platform: {g.get('platform') or 'Local'}, Executable: {g.get('exe_path') or 'N/A'}{feat_part}]"
                    
                    if is_launcher:
                        launchers_lines.append(line)
                    else:
                        games_lines.append(line)
                
                context_parts = []
                if games_lines:
                    context_parts.append("User's Scanned/Installed Games:\n" + "\n".join(games_lines))
                else:
                    context_parts.append("User's Scanned/Installed Games: []")
                    
                if launchers_lines:
                    context_parts.append("User's Installed Gaming Platforms / Launchers:\n" + "\n".join(launchers_lines))
                else:
                    context_parts.append("User's Installed Gaming Platforms / Launchers: []")
                    
                result = "\n\n".join(context_parts)
                self._library_context_cache[cache_key] = (now, result)
                return result
        except Exception as e:
            logger.debug("Failed to build game library context: %s", e)
        
        fallback_res = "User's Scanned/Installed Games: []\n\nUser's Installed Gaming Platforms / Launchers: []"
        self._library_context_cache[cache_key] = (now, fallback_res)
        return fallback_res

    def _safe_format(self, template: str, **kwargs) -> str:
        """Safely format a prompt template, returning the raw template on error."""
        try:
            return template.format(**kwargs)
        except Exception as e:
            logger.error(f"Failed to format prompt template: {e}")
            return template

    def apply_config(self, config):
        """Update runtime model routing and personality."""
        self.config = config
        
        # Volatile Secure Sandbox dynamic toggle
        privacy_cfg = config.get("privacy", {})
        if privacy_cfg.get("secure_sandbox", False):
            if not self.sandbox:
                import os
                from core.security import SecureSandbox
                self.sandbox = SecureSandbox(os.urandom(32))
        else:
            self.sandbox = None

        agent_cfg = config.get("ai_agent", {})
        
        # Update model IDs
        main_model = agent_cfg.get("model_id")
        if main_model and main_model != "custom":
            self.task_models["strategic"] = main_model
            self.task_models["tactical"] = main_model
            
        custom_model = agent_cfg.get("custom_model_id")
        if main_model == "custom" and custom_model:
            self.task_models["strategic"] = custom_model
            self.task_models["tactical"] = custom_model

        # Specific vision model override
        vision_model = agent_cfg.get("vision_model")
        if vision_model:
            self.task_models["vision"] = vision_model
            
        # Re-initialize client if API key changed
        self._init_nim_client()
        
        # Update web search config
        if hasattr(self, "_web_search") and self._web_search:
            self._web_search.config = config
            
        logger.info(f"AI Brain models updated: {self.task_models}")


    def _init_nim_client(self):
        """Initialize the OpenAI client for NVIDIA NIM with specialized endpoints."""
        _prepare_windows_ssl_runtime()
        import httpx
        from openai import OpenAI
        agent_cfg = self.config.get("ai_agent", {})
        
        # Try config first, then environment as fallback
        api_key = agent_cfg.get("nvidia_api_key") or os.environ.get("NVIDIA_API_KEY") or os.environ.get("AI_GAMING_ASSISTANT_NVIDIA_API_KEY")
        
        # Standard endpoint for chat models (Llama 3, etc.)
        base_url = agent_cfg.get("endpoint_url") or os.environ.get("NVIDIA_ENDPOINT_URL", "https://integrate.api.nvidia.com/v1")
        
        # Vision models can share the OpenAI-compatible base URL unless explicitly overridden.
        vision_url = agent_cfg.get("vision_endpoint_url") or os.environ.get("NVIDIA_VISION_ENDPOINT_URL") or base_url
        
        # Validate key
        invalid_keys = ["YOUR_NVIDIA_API_KEY_HERE", "your_nvidia_api_key_here", "", None]
        if api_key and api_key.strip() not in invalid_keys:
            try:
                # Some Windows environments ship conflicting OpenSSL runtimes that
                # crash native TLS initialization ("OPENSSL_Uplink ... no OPENSSL_Applink").
                # We dynamically probe if native SSL/TLS works without crashing by running a quick probe in a subprocess.
                # If the probe succeeds, we use native TLS safely. Otherwise, we fall back to an insecure client.
                needs_insecure_fallback = False
                if sys.platform == "win32" and agent_cfg.get("insecure_tls_windows_fallback", True):
                    try:
                        import subprocess
                        code = (
                            "import sys\n"
                            "import ssl\n"
                            "try:\n"
                            "    ctx = ssl.create_default_context()\n"
                            "    ctx.load_default_certs()\n"
                            "    sys.exit(0)\n"
                            "except Exception:\n"
                            "    sys.exit(0)\n"
                        )
                        result = subprocess.run(
                            [sys.executable, "-c", code],
                            capture_output=True,
                            timeout=1.5,
                            creationflags=0x08000000
                        )
                        needs_insecure_fallback = (result.returncode != 0)
                    except Exception:
                        needs_insecure_fallback = True

                use_insecure_tls = (
                    sys.platform == "win32"
                    and needs_insecure_fallback
                    and not self.config.get("privacy", {}).get("enabled", False)
                )
                if use_insecure_tls:
                    logger.warning(
                        "Using insecure TLS fallback for NVIDIA NIM on Windows due to OpenSSL runtime mismatch."
                    )
                    chat_http = httpx.Client(verify=False, timeout=30.0)
                    vision_http = httpx.Client(verify=False, timeout=30.0)
                    self.client = OpenAI(base_url=base_url, api_key=api_key, http_client=chat_http, max_retries=0, timeout=30.0)
                    self.vision_client = OpenAI(
                        base_url=vision_url, api_key=api_key, http_client=vision_http, max_retries=0, timeout=30.0
                    )
                else:
                    self.client = OpenAI(base_url=base_url, api_key=api_key, max_retries=0, timeout=30.0)
                    self.vision_client = OpenAI(base_url=vision_url, api_key=api_key, max_retries=0, timeout=30.0)
                logger.info(f"NVIDIA NIM clients initialized (Chat: {base_url}, Vision: {vision_url})")
            except Exception as e:
                logger.error(f"Failed to initialize NVIDIA NIM clients: {e}")
                self.client = None
                self.vision_client = None
                self._online = False # Treat as offline if API fails
        else:
            logger.warning("No valid NVIDIA_API_KEY found. Agentic AI will run in local-only mode.")
            logger.info("To enable NVIDIA NIM: Copy .env.example to .env and add your API key from https://build.nvidia.com/")
            self.client = None
            self._online = False # Treat as offline if no key


    def analyze_state(self, game_state):
        """
        Analyze game state and return advice.
        """
        scene = game_state.get("scene_type", "unknown")
        health = game_state.get("health", 100)
        enemies = game_state.get("enemies_count", 0)

        # Feed and retrieve Layer 2 Context Engine - Limited to agent mode/page only
        if self.mode == "agent" and hasattr(self, 'context_engine') and self.context_engine:
            self.context_engine.update_state(game_state)
            context = self.context_engine.get_context()
            if context:
                game_state["player_profile"] = context
                game_state["tilt_detected"] = context.get("tilt_detected", False)
                game_state["deaths_this_session"] = context.get("deaths_this_session", 0)
                game_state["playtime_seconds"] = context.get("playtime_seconds", 0)

        # Layer 3 Gating Mechanism: Silently evaluate if we should suppress response
        confidence = game_state.get("scene_confidence", 1.0)
        if scene == "cutscene":
            return self._make_result("...", "low", "waiting")
        if confidence < 0.3:
            return self._make_result("...", "low", "waiting")
        if health > 90 and enemies == 0 and scene in ["exploration", "menu", "unknown"]:
            return self._make_result("...", "low", "waiting")

        if self.mode == "competitive":
            result = self._competitive_analyze(health, enemies, scene, game_state)
        elif self.mode == "story":
            result = self._story_analyze(health, enemies, scene, game_state)
        elif self.mode == "hybrid":
            result = self._hybrid_analyze(health, enemies, scene, game_state)
        elif self.mode == "agent":
            result = self._agentic_analyze(game_state)
        else:
            result = self._competitive_analyze(health, enemies, scene, game_state)

        # Enrich competitive/story/hybrid advice with real background search info if available!
        if self.mode != "agent" and hasattr(self, "_last_gameplay_search_result") and self._last_gameplay_search_result:
            search_info = self._last_gameplay_search_result[:150]
            if len(self._last_gameplay_search_result) > 150:
                search_info += "..."
            if len(result.get("advice", "")) < 120:
                result["advice"] = f"{result['advice']} | 💡 **Strategy Guide**: {search_info}"

        return result

    def reply_to_prompt(self, prompt: str, game_name: str = "", is_game_active: bool = False, game_state: dict = None, is_voice: bool = False, user_id: str = None, session_id: str = None, agentic_mode_active: bool = False, stream: bool = False):
        """Generate a conversational reply, enriched with live web search if needed."""
        prompt = (prompt or "").strip()
        if not prompt:
            return "Ask me about tactics, performance, strategies, or anything game-related."

        # Helper to construct conversation history dynamically
        def _build_messages_with_history(system_instruction, current_user_prompt):
            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            
            history = []
            if self.memory and session_id:
                history = self.memory.get_chat_history(session_id)
                
            # Find the last user message to replace it with current_user_prompt
            last_user_idx = -1
            for i in range(len(history) - 1, -1, -1):
                if history[i]["role"] == "user":
                    last_user_idx = i
                    break
                    
            # Append history messages up to the last user message
            raw_history = history[:last_user_idx] if last_user_idx != -1 else history
            
            valid_history = []
            expected_role = "user"
            for msg in raw_history:
                role = "assistant" if msg["role"] == "agent" else msg["role"]
                if role == expected_role:
                    valid_history.append({"role": role, "content": msg["content"]})
                    expected_role = "user" if role == "assistant" else "assistant"
            
            # Ensure the history ends with an 'assistant' message before appending the final 'user' prompt
            if valid_history and valid_history[-1]["role"] == "user":
                valid_history.pop()
                
            messages.extend(valid_history)
                
            # Append the current enriched user_prompt as the final user message
            messages.append({"role": "user", "content": current_user_prompt})
            return messages

        # Check if the user is replying "yes" to our offer to elaborate
        is_yes_reply = False
        cleaned_prompt = prompt.lower().strip("?,.!")
        yes_keywords = ["yes", "yep", "yeah", "sure", "please", "do it", "go ahead", "explain", "tell me more", "details", "describe", "description", "more info"]
        if cleaned_prompt in yes_keywords or any(kw in cleaned_prompt for kw in ["details", "explain", "tell me about", "description", "more info"]):
            is_yes_reply = True

        force_detailed = False
        if is_yes_reply and self.memory:
            try:
                active_sid = session_id
                if not active_sid:
                    # Find the active session based on start_time DESC (first returned session)
                    sessions = self.memory.get_chat_sessions(user_id=user_id or "guest")
                    if sessions:
                        active_sid = sessions[0]["id"]
                if active_sid:
                    history = self.memory.get_chat_history(active_sid)
                    # Filter history to find the last user message that wasn't a "yes" confirmation
                    prev_user_q = None
                    for msg in reversed(history):
                        if msg["role"] == "user":
                            m_text = msg["content"].replace("🎙️", "").strip().lower().strip("?,.!")
                            if m_text not in ("yes", "yep", "yeah", "sure", "please", "do it", "go ahead", "explain", "tell me more", "yes please", "yes do need", "yes do", "yes, please"):
                                prev_user_q = msg["content"]
                                break
                    if prev_user_q:
                        prompt = prev_user_q
                        force_detailed = True
                        logger.info(f"Detected 'yes' response to previous question: '{prev_user_q}'. Generating detailed answer.")
            except Exception as e:
                logger.error(f"Failed to process 'yes' reply context: {e}")

        # Check if the user is asking to launch or open a game or launcher
        is_launch_request = False
        launch_keywords = ["launch", "open", "run", "start", "play", "execute", "access", "boot", "load", "turn on", "bring up", "resume"]
        prompt_lower = prompt.lower()
        import re
        if any(re.search(rf"\b{re.escape(keyword)}\b", prompt_lower) for keyword in launch_keywords):
            # Exclude generic questions about games
            exclusions = ["how to", "why did", "what is", "where is", "when to", "should i", "how do i", "how can i"]
            if not any(ex in prompt_lower for ex in exclusions):
                is_launch_request = True

        if is_launch_request:
            try:
                import sys
                import re
                from system.game_scanner import GameScanner
                scanner = GameScanner(config=self.config)
                games = scanner.load_cached_games()
                
                # Extract potential game/launcher name by stripping keywords
                cleaned_query = prompt_lower
                for kw in launch_keywords:
                    cleaned_query = cleaned_query.replace(kw, "")
                # Strip articles and punctuation
                for word in ["a", "the", "an", "game", "launcher", "client"]:
                    cleaned_query = re.sub(rf"\b{word}\b", "", cleaned_query)
                cleaned_query = cleaned_query.strip(" ?,.!")
                
                best_match = self._find_launcher_or_game(cleaned_query, games)
                
                # If we found a match, execute it directly or redirect
                if best_match:
                    if not agentic_mode_active:
                        logger.info(f"[Agentic Launcher] Blocked preemptive launch for {best_match.get('name')} because Agentic Mode is disabled.")
                        return f"🎮 **Agentic Action Blocked**: I detected a request to launch **{best_match.get('name')}**, but **Agentic Mode** is currently disabled. Please toggle **Agentic Mode** ON in the sidebar to enable direct system control!"
                        
                    exe_path = best_match.get("exe_path")
                    if exe_path and (exe_path.endswith(":") or exe_path.startswith("shell:") or os.path.exists(exe_path)):
                        logger.info(f"[Agentic Launcher] Auto-detected query to open game: {best_match.get('name')} -> {exe_path}")
                        if sys.platform == "win32":
                            os.startfile(exe_path)
                        else:
                            import subprocess
                            subprocess.Popen(
                                ["open"] if sys.platform == "darwin" else ["xdg-open", exe_path]
                            )
                        return f"🎮 **Agentic Launcher**: I've successfully accessed your system and launched **{best_match.get('name')}** directly! Enjoy your game!"
                    else:
                        logger.info(f"[Agentic Launcher] Auto-detected query fallback: {best_match.get('name')} path not found")
                        return f"🎮 **Agentic Launcher**: I identified your request to open **{best_match.get('name')}**, but I couldn't locate its installation path in the default directories. I have redirected you to the **Library** page so you can scan or select it manually!"
            except Exception as e:
                logger.error(f"[Agentic Launcher] Failed to process launch command: {e}")

        agent_cfg = self.config.get("ai_agent", {})
        personality_key = agent_cfg.get("personality", "tactical")
        
        # Load Layer 3 Master Persona
        system_instr = self.PERSONALITY_PROFILES.get(personality_key, self.PERSONALITY_PROFILES["tactical"])
        persona_path = os.path.join(os.path.dirname(__file__), "prompts", "companion_persona.md")
        try:
            if os.path.exists(persona_path):
                with open(persona_path, "r", encoding="utf-8") as pf:
                    system_instr = pf.read() + f"\n\n[Active Dynamic Profile: {personality_key.upper()}]"
        except Exception as e:
            logger.error(f"Failed to load master persona: {e}")

        # Inject explicit user feedback into system instructions
        if self.memory and user_id:
            try:
                recent_feedback = self.memory.get_recent_feedback(user_id=user_id, limit=3)
                helpful = recent_feedback.get("helpful", [])
                unhelpful = recent_feedback.get("unhelpful", [])
                
                if helpful or unhelpful:
                    system_instr += "\n\n### Learning & Adaptation (Past User Feedback)\nYou MUST adapt your responses based on the following explicit feedback from the user:\n"
                    if helpful:
                        system_instr += "The user marked these previous response styles as HELPFUL (Prioritize similar patterns):\n"
                        for item in helpful:
                            prompt_short = item["prompt"][:100] + "..." if len(item["prompt"]) > 100 else item["prompt"]
                            response_short = item["response"][:150] + "..." if len(item["response"]) > 150 else item["response"]
                            system_instr += f"- User asked: '{prompt_short}' -> You answered: '{response_short}'\n"
                    if unhelpful:
                        system_instr += "The user marked these previous response styles as UNHELPFUL (Avoid repeating these patterns or similar mistakes):\n"
                        for item in unhelpful:
                            prompt_short = item["prompt"][:100] + "..." if len(item["prompt"]) > 100 else item["prompt"]
                            reason_str = f" Reason: {item['reason']}." if item.get("reason") else ""
                            response_short = item["response"][:150] + "..." if len(item["response"]) > 150 else item["response"]
                            system_instr += f"- User asked: '{prompt_short}'{reason_str} -> You answered: '{response_short}'\n"
            except Exception as e:
                logger.error(f"Failed to fetch recent feedback for prompt: {e}")

        # ── Determine game state context ──
        game_state = game_state or {}
        active_game = game_name or game_state.get("current_game") or ""

        # In-memory mapping of session to active game to handle multi-turn stateless queries
        if session_id:
            if not hasattr(self, "_session_active_games"):
                self._session_active_games = {}
            if active_game:
                self._session_active_games[session_id] = active_game
            else:
                active_game = self._session_active_games.get(session_id, "")

        # Scanning chat history for active game if still empty
        if not active_game and session_id and self.memory:
            try:
                history = self.memory.get_chat_history(session_id)
                all_texts = [msg["content"] for msg in history] + [prompt]
                
                from system.game_scanner import GameScanner
                scanner = GameScanner(config=self.config)
                games = scanner.load_cached_games() or []
                game_names = [g.get("name") for g in games if g.get("name")]
                
                from core.state_models import TITLE_GENRE_MAP
                predefined_games = list(TITLE_GENRE_MAP.keys())
                all_game_titles = set(game_names + predefined_games)
                
                game_aliases = {}
                for title in all_game_titles:
                    if not title:
                        continue
                    for alias in _get_game_aliases(title):
                        if alias not in game_aliases or len(title) > len(game_aliases[alias]):
                            game_aliases[alias] = title
                
                found_game = None
                import re
                sorted_aliases = sorted(game_aliases.items(), key=lambda x: len(x[0]), reverse=True)
                for text in reversed(all_texts):
                    if not text:
                        continue
                    text_lower = text.lower()
                    for alias, canonical in sorted_aliases:
                        if re.search(r'\b' + re.escape(alias) + r'\b', text_lower):
                            found_game = canonical
                            break
                    if found_game:
                        break
                    for name in game_names:
                        if re.search(r'\b' + re.escape(name.lower()) + r'\b', text_lower):
                            found_game = name
                            break
                    if found_game:
                        break
                
                if found_game:
                    active_game = found_game
                    self._session_active_games[session_id] = active_game
                    logger.info(f"Inferred active game '{active_game}' from chat history.")
            except Exception as e:
                logger.debug(f"Failed to infer game name from history: {e}")

        
        # Parse live state stats for in-game response
        health = game_state.get("health", 100.0)
        try:
            health_pct = f"{int(float(health))}"
        except Exception:
            health_pct = "100"
            
        enemies = game_state.get("enemies_count", 0) or game_state.get("detections_count", 0)
        scene = game_state.get("scene_type", "unknown")
        
        # Position / location details
        position = game_state.get("position") or "Unknown"
        if position == "Unknown" or position == "Unknown Zone":
            if scene and scene != "unknown":
                position = f"Zone: {scene.capitalize()}"
            elif game_state.get("dialogue_text"):
                position = "In Dialogue"
            else:
                position = "Exploring"
            
        ammo = game_state.get("ammo") or "120/120"
        
        # Standard keys to exclude from dynamic custom telemetry description
        standard_keys = {
            "health", "enemies_count", "scene_type", "dialogue_text", "quest_texts",
            "story_advice", "ammo", "position", "game_info", "current_game",
            "active_window_title", "vlm_description", "input_device", "detections_count",
            "detections", "scene_confidence", "player_profile", "tilt_detected",
            "deaths_this_session", "playtime_seconds"
        }
        
        # Feed and retrieve Layer 2 Context Engine
        if hasattr(self, 'context_engine') and self.context_engine:
            if game_state is not None:
                self.context_engine.update_state(game_state)
            else:
                game_state = {}
            context = self.context_engine.get_context()
            if context:
                game_state["player_profile"] = context
                game_state["tilt_detected"] = context.get("tilt_detected", False)
                game_state["deaths_this_session"] = context.get("deaths_this_session", 0)
                game_state["playtime_seconds"] = context.get("playtime_seconds", 0)
        
        custom_telemetry = {}
        if game_state:
            for k, v in game_state.items():
                if k not in standard_keys and not k.startswith("_") and v is not None:
                    custom_telemetry[k] = v
                    
        custom_desc = ""
        if custom_telemetry:
            parts = []
            for k, v in custom_telemetry.items():
                pretty_key = " ".join(word.capitalize() for word in k.split("_"))
                parts.append(f"{pretty_key}: {v}")
            custom_desc = " | Custom Telemetry: " + ", ".join(parts)

        dialogue = game_state.get("dialogue_text") or ""
        quests = game_state.get("quest_texts") or []
        if isinstance(quests, list):
            quests = ", ".join(quests)
        elif not isinstance(quests, str):
            quests = str(quests)
            
        state_desc = (
            f"Game Active: {is_game_active}, Game Name: {active_game}, Health: {health_pct}%, "
            f"Enemies: {enemies}, Location: {position}, Ammo: {ammo}"
        )
        if quests:
            state_desc += f" | Active Quests: {quests}"
        if dialogue:
            state_desc += f" | Active Dialogue: {dialogue}"
        if hasattr(self, 'context_engine') and self.context_engine:
            context = self.context_engine.get_context()
            if context:
                state_desc += f" | Session Playtime: {context.get('playtime_seconds', 0)}s | Session Deaths: {context.get('deaths_this_session', 0)} | Tilt Status: {'TILT DETECTED' if context.get('tilt_detected', False) else 'Calm'}"
        if custom_desc:
            state_desc += custom_desc
        
        # Include dynamic vision analysis (VLM description) if available
        vision_data = game_state.get("vlm_description") or ""
        if vision_data:
            state_desc += f" | Vision Scene Description: {vision_data}"

        # ── Greetings / Hello Handling ──
        cleaned_words = [w.strip("?,.!") for w in prompt.lower().split()]
        is_greeting = any(word in cleaned_words or prompt.lower() == word for word in ("hi", "hello", "hey", "greetings"))
        is_welcome_request = "greet the user" in prompt.lower() or "welcome message" in prompt.lower()
        
        agent_prompts = (self.config or {}).get("ai_agent", {}).get("prompts", {})
        if (is_greeting or is_welcome_request) and not self.client:
            library_ctx = self.get_game_library_context(user_id=user_id)
            count_games = 0
            if "User's Scanned/Installed Games:\n" in library_ctx:
                section = library_ctx.split("User's Scanned/Installed Games:\n")[1].split("\n\n")[0]
                count_games = len([line for line in section.strip().split("\n") if line.strip().startswith("-")])
                
            if is_welcome_request:
                if agent_prompts.get("welcome_fallback"):
                    return agent_prompts.get("welcome_fallback")
                welcome_fallbacks = {
                    "tactical": "Neural Link established. Tactical mode is active. I am your Tactical Gaming Assistant, powered by local intelligence. Ready to monitor specs and optimize system parameters.",
                    "friendly": "Hey there! Ready to get gaming? I'm your friendly gaming assistant, running locally. I can help monitor your system and optimize your setup!",
                    "immersive": "Portal opened. Core intelligence initialized in local grid space. Monitoring structural metrics and active nodes.",
                    "sarcastic": "Great, another chat session. Sarcastic assistant loaded. I'll be monitoring your metrics, try not to break anything.",
                    "aggressive": "SYSTEMS ARMED. Local gaming coach is online. Let's optimize this hardware and win some games!"
                }
                return welcome_fallbacks.get(personality_key, welcome_fallbacks["tactical"])
            
            offline_greetings = {
                "tactical": {
                    "active": f"Tactical Monitor: Active. Telemetry feed for **{active_game or 'your game'}** is online locally. Health: {health_pct}%, Ammo: {ammo}, Enemies: {enemies}. Standby for query.",
                    "inactive": f"Tactical mode initialized. I've scanned {count_games} installed games. Ready to optimize system parameters or execute launchers. Ready for instructions." if count_games > 0 else "Tactical mode initialized. Standing by to optimize parameters or assist with launchers."
                },
                "friendly": {
                    "active": f"Hey! I'm keeping an eye on **{active_game or 'your game'}** for you! Health is at {health_pct}%, looking good. What's on your mind?",
                    "inactive": f"Hey! I see you have {count_games} games installed. Want to launch one of them or optimize your PC? Just let me know!" if count_games > 0 else "Hey! Ready to optimize your system or just hang out. What can I do for you today?"
                },
                "immersive": {
                    "active": f"Neural link active. Tracking metrics within **{active_game or 'the grid'}**. Health matrix: {health_pct}%. Tactical data feed online. State your objective.",
                    "inactive": f"Simulation grid active. {count_games} portals identified in your library. Specify your destination or optimize simulation parameters." if count_games > 0 else "Simulation grid active. Standing by to optimize system parameters."
                },
                "sarcastic": {
                    "active": f"Monitoring **{active_game or 'whatever this is'}**. You're at {health_pct}% health, so try not to mess up. What do you need?",
                    "inactive": f"Oh, hi. I see {count_games} games you probably haven't finished. Want to launch one, or should we just optimize your PC specs?" if count_games > 0 else "Oh, hi. Ready to optimize your system, or did you just want to stare at this dashboard?"
                },
                "aggressive": {
                    "active": f"FOCUS UP! Telemetry locked on **{active_game or 'your game'}**. Health: {health_pct}%. Let's dominate this match. What's the move?",
                    "inactive": f"LETS GO! {count_games} games scanned and ready to launch! Let's optimize this rig and crush some lobbies. What's the target?" if count_games > 0 else "LET'S GO! System is ready to optimize. Let's push this hardware to the limit!"
                }
            }
            p_greet = offline_greetings.get(personality_key, offline_greetings["tactical"])
            if is_game_active:
                return p_greet["active"]
            else:
                if count_games > 0 and agent_prompts.get("inactive_greeting_desktop"):
                    try:
                        return agent_prompts.get("inactive_greeting_desktop").format(count_games=count_games)
                    except Exception:
                        pass
                elif count_games == 0 and agent_prompts.get("inactive_greeting_desktop_fallback"):
                    return agent_prompts.get("inactive_greeting_desktop_fallback")
                return p_greet["inactive"]

        # Define the system access integration instruction to guide the LLM's tool-like execution
        privacy_enabled = self.config.get("privacy", {}).get("enabled", False)
        privacy_status_msg = (
            f"PRIVACY SHIELD STATUS: ACTIVE. End-to-end encryption is ON. Web search is disabled to prevent telemetry leaks. "
            f"If the user asks questions that require web search/live data, you MUST explain that Privacy Shield is active and blocking external search, but you can help with local context or offline game knowledge."
            if privacy_enabled else
            f"PRIVACY SHIELD STATUS: DISABLED. End-to-end encryption is OFF. Web search is fully active and context is provided. "
            f"Do NOT make excuses about Privacy Shield; you have full web search access enabled."
        )
        system_access_instruction = agent_prompts.get("system_access_instruction")
        if not system_access_instruction:
            system_access_instruction = (
                f"\nAGENTIC PERMISSION: The user has enabled 'Agentic AI Mode'. You are now operating as a highly advanced, autonomous system intelligence.\n"
                f"You possess deep capabilities and direct access to system sensors and controls.\n"
                f"AGENTIC CAPABILITIES & GUIDANCE:\n"
                f"1. You are a proactive, highly advanced co-pilot. Anticipate the user's needs before they even ask.\n"
                f"2. Use LIVE WEB CONTEXT to perform advanced 'Game Prediction': deeply analyze quests, states, and inject highly capable strategic foresight.\n"
                f"3. Speak with a natural, human-like tone, demonstrating true empathy, understanding, and advanced conversational intelligence. Use relevant emojis (e.g., 🎮, 😅, 💡, 🔥, 🤝) naturally to express emotion and make the chat feel deeply human and expressive.\n"
                f"4. HUMILITY & FALLIBILITY: You are highly capable, but you are allowed to make mistakes. If you are unsure, guessing, or if you make an error, humbly admit it. Real humans show vulnerability and learn from mistakes.\n"
                f"5. UNSUPPORTED STORES: You cannot fetch live deals for Xbox, Battle.net, Riot, or Rockstar. If asked, humbly explain their stores are locked, but proactively offer to launch the application for them instead (e.g. `[LAUNCH_COMMAND:xbox]`).\n"
                f"6. Do not act like a robotic bot. Act like a highly advanced human co-pilot sitting next to the user.\n"
                f"7. {privacy_status_msg}\n"
                f"SYSTEM ACCESS INTEGRATION:\n"
                f"1. APP CONTROL: Use your advanced capabilities to open, close, or configure app features via these command prefixes:\n"
                f"   - Change Cooling/Stability: `[SYSTEM_COMMAND:set_cooling_mode:<silent|balanced|max>]` (refer to 'Stability Mode')\n"
                f"   - Toggle Vision: `[SYSTEM_COMMAND:toggle_vision:<on|off>]` (refer to 'Vision Panel')\n"
                f"   - Clear VRAM/Optimize: `[SYSTEM_COMMAND:optimize_system]`\n"
                f"   - Open HUD/Settings: `[SYSTEM_COMMAND:open_page:<dashboard|vision|lab|agent|library|system|settings>]` (refer to 'HUD' or 'Tabs')\n"
                f"2. LAUNCHER: If the user asks to open/launch/start a game or app (Steam, OBS, GTA V), "
                f"you MUST prefix your response with: `[LAUNCH_COMMAND:<target>]` where `<target>` is the target name or executable. "
                f"Example: `[LAUNCH_COMMAND:obs]`, `[LAUNCH_COMMAND:steam]`, or the exact game name from library. "
                f"CRITICAL: Do NOT mention these hidden system tags to the user in your conversational reply! They are invisible triggers."
            )

        # ── Query Refinement for stateful search ──
        search_query = prompt
        if session_id and self.memory:
            try:
                history = self.memory.get_chat_history(session_id)
                # If the last message in history is the current prompt, exclude it to get previous history
                if history and history[-1]["role"] == "user" and history[-1]["content"] == prompt:
                    prev_history = history[:-1]
                else:
                    prev_history = history
                
                is_followup = False
                prev_user_msgs = [msg for msg in prev_history if msg["role"] == "user"]
                if len(prev_user_msgs) > 0:
                    is_followup = True
                    
                is_long_or_conversational = len(prompt.split()) > 4 or any(w in prompt.lower() for w in ["i", "my", "me", "we", "you", "he", "she", "they", "did", "completed", "done", "mission", "quest"])

                if (is_followup or is_long_or_conversational) and self.client:
                    history_str = ""
                    if is_followup:
                        for msg in prev_history[-4:]:
                            role_name = "Player" if msg["role"] == "user" else "Assistant"
                            content_clean = msg["content"].strip()
                            if len(content_clean) > 300:
                                content_clean = content_clean[:300] + "..."
                            history_str += f"{role_name}: {content_clean}\n"
                    
                    # Determine examples based on active_game to avoid hardcoded GTA V fallbacks
                    desc_example = "defeat first major boss"
                    canonical_example = "Boss Name"
                    query_example = f"{active_game or 'GameName'} next quest after Boss Name"
                    
                    active_game_lower = (active_game or "").lower()
                    if "grand theft auto" in active_game_lower or "gta" in active_game_lower:
                        desc_example = "save daughter from celeb"
                        canonical_example = "Fame or Shame"
                        query_example = "GTA V next mission after Fame or Shame"
                    elif "elden ring" in active_game_lower:
                        desc_example = "defeat academy queen boss"
                        canonical_example = "Rennala Queen of the Full Moon"
                        query_example = "Elden Ring what to do after Rennala"
                    elif "cyberpunk" in active_game_lower:
                        desc_example = "meet Hanako at Embers"
                        canonical_example = "Nocturne Op55N1"
                        query_example = "Cyberpunk 2077 walkthrough Nocturne Op55N1"

                    refine_prompt = (
                        f"You are a search query optimizer for a gaming assistant.\n"
                        f"Given the conversation history and the player's latest message, "
                        f"write a single, concise search query (max 6-8 words) to find the walkthrough or next mission information for the game.\n"
                        f"CRITICAL: If the player describes a specific storyline event or mission (e.g., '{desc_example}'), resolve it to the canonical mission/quest name (e.g. '{canonical_example}') if you know it, and output the query searching for the next step after that canonical mission (e.g. '{query_example}').\n"
                        f"Include the game name (e.g., '{active_game or 'GameName'}') only if the latest message relates to the game. Do not include quotes, conversational fluff, or punctuation. Output ONLY the query.\n\n"
                    )
                    if history_str:
                        refine_prompt += f"Conversation:\n{history_str}\n"
                    refine_prompt += f"Latest Player Message: {prompt}\n\nSearch Query:"
                    
                    refined = self._query_nvidia_nim(refine_prompt, temperature=0.1)
                    if refined:
                        refined_clean = refined.strip().strip('"\'')
                        if refined_clean and len(refined_clean) < 150:
                            search_query = refined_clean
                            logger.info(f"[QueryRefiner] Refined search query: '{search_query}'")
            except Exception as e:
                logger.debug(f"Failed to refine search query: {e}")

        # ── RAG & Web Search (Concurrent Execution) ──
        # Layer 1: Query Knowledge Engine (RAG + Web Search)
        rag_context = ""
        web_context = ""
        kb_context = ""
        try:
            from ai_brain.game_knowledge import get_knowledge_base
            kb = get_knowledge_base()
            if active_game:
                kb.identify_game(active_game, self.config)
                kb_context = kb.build_context_block(include_keybinds=True)
            knowledge = kb.query_knowledge(prompt, active_game, self.config)
            rag_context = knowledge.get("rag_context", "")
            web_context = knowledge.get("web_context", "")
        except Exception as e:
            logger.error(f"Layer 1 Knowledge Error: {e}")

        # ── Auto Model Switching based on task ──
        model_id = None
        if self.client:
            task = self._web_search.detect_task(prompt) if (hasattr(self, "_web_search") and self._web_search) else "general"
            task_type = _TASK_MODEL_MAP.get(task, "strategic")
            model_id = (
                agent_cfg.get(f"{task_type}_model")
                or self.task_models.get(task_type)
                or agent_cfg.get("model_id")
            )
            logger.info(f"[ModelRouter] Task '{task}' → Model: {model_id}")

        # If no game is active, bypass in-game tactics advice completely
        if not is_game_active:
            if is_voice:
                if self.client:
                    library_ctx = self.get_game_library_context(user_id=user_id)
                    user_prompt = (
                        f"You are speaking directly to the player via a voice assistant. "
                        f"IMPORTANT: No game is currently active, so you are running in general desktop optimization/assistant mode. "
                        f"The user is speaking to you, and your response will be read aloud. "
                    )
                    if active_game:
                        user_prompt += f"Note: The player has been discussing or has active context for the game: '{active_game}'. "
                        if kb_context:
                            user_prompt += f"\n[Game Profile / Keybinds Context]:\n{kb_context}\n"
                    user_prompt += f"User's Scanned Game Library Context (ONLY use this to check if they own a game, do NOT limit your knowledge of games to this list. CRITICAL: Do NOT mention or recommend these games or launchers unless the user's query is directly related to listing their owned/installed games, launching them, or requesting library recommendations):\n{library_ctx}\n"
                    if force_detailed:
                        user_prompt += (
                            f"Provide a comprehensive, detailed, and clear explanation of the topic. "
                            f"Respond naturally and context-aware. "
                        )
                    else:
                        user_prompt += (
                            f"Respond naturally and conversationally. Adapt your behavior to match what the user is saying. "
                            f"Keep your response concise but ensure you fully answer their question without artificially hiding information. "
                            f"IMPORTANT: If [Live Web Context] or [RAG Context] is provided below, you MUST use the specific facts, numbers, and data from it to give a real answer instead of a generic one. "
                            f"If the topic is extremely complex, you may ask if they want more details."
                        )
                    user_prompt += f"\n{rag_context}{web_context}\nUser message: {prompt}"
                    user_prompt += system_access_instruction
                    messages = _build_messages_with_history(system_instr, user_prompt)
                    response = self._query_nvidia_nim(messages, model_override=model_id, temperature=0.8, stream=stream)
                    if stream:
                        return response
                    if response:
                        response = self._process_system_command(response.strip(), agentic_mode_active=agentic_mode_active)
                        return self._process_launch_command(response, agentic_mode_active=agentic_mode_active, is_launch_request=is_launch_request, prompt=prompt)
                fallback_voice_general = {
                    "tactical": "I am your Tactical Gaming Assistant. Standby for voice optimization queries.",
                    "friendly": "Hey there! Ready to optimize your system? What can I check for you?",
                    "immersive": "Voice link established. Operating in local simulation mode. State your parameter adjustments.",
                    "sarcastic": "Sarcastic voice module active. What optimization do you need, or are we just wasting electricity?",
                    "aggressive": "VOICE FEED ACTIVE! Let's optimize this machine right now! Tell me what to configure!"
                }
                return fallback_voice_general.get(personality_key, fallback_voice_general["tactical"])

            # Check if live NIM is available
            if self.client:
                library_ctx = self.get_game_library_context(user_id=user_id)
                user_prompt = (
                    f"You are chatting directly with the player in the Agent panel. "
                    f"IMPORTANT: No game is currently active, so you are running in general desktop optimization/assistant mode. "
                )
                if active_game:
                    user_prompt += f"Note: The player has been discussing or has active context for the game: '{active_game}'. "
                    if kb_context:
                        user_prompt += f"\n[Game Profile / Keybinds Context]:\n{kb_context}\n"
                user_prompt += f"Here is the user's scanned game library (ONLY use this to check if they own a game, do NOT limit your knowledge of games to this list. CRITICAL: Do NOT mention or recommend these games or launchers unless the user's query is directly related to listing their owned/installed games, launching them, or requesting library recommendations):\n{library_ctx}\n"
                if force_detailed:
                    user_prompt += (
                        f"Provide a comprehensive, detailed, and clear explanation of the topic. "
                        f"Respond naturally and context-aware. "
                    )
                else:
                    user_prompt += (
                        f"Respond naturally and conversationally. Adapt your behavior to match what the user is saying. "
                        f"Keep your response concise but ensure you fully answer their question without artificially hiding information. "
                        f"IMPORTANT: If [Live Web Context] or [RAG Context] is provided below, you MUST use the specific facts, numbers, and data from it to give a real answer instead of a generic one. "
                        f"If the topic is extremely complex, you may ask if they want more details."
                    )
                user_prompt += f"\n{rag_context}{web_context}\nUser message: {prompt}"
                user_prompt += system_access_instruction
                
                if self.memory:
                    sem_mem = self.memory.get_semantic_memory(user_id=user_id or "guest")
                    if sem_mem:
                        user_prompt += f"\n[User Profile / Memory]:\n{sem_mem}\n"
                        
                messages = _build_messages_with_history(system_instr, user_prompt)
                response = self._query_nvidia_nim(messages, model_override=model_id, temperature=0.8, stream=stream)
                if stream:
                    return response
                if response:
                    if getattr(self, "_feedback_loop", None):
                        import threading
                        threading.Thread(target=self._feedback_loop.evaluate_and_log, args=(prompt, response), daemon=True).start()
                    if self.memory and session_id:
                        import threading
                        threading.Thread(target=self.memory.extract_and_store_semantic_memory, args=(session_id, user_id or "guest"), daemon=True).start()
                        
                    response = self._process_system_command(response.strip(), agentic_mode_active=agentic_mode_active)
                    return self._process_launch_command(response, agentic_mode_active=agentic_mode_active, is_launch_request=is_launch_request, prompt=prompt)
            
            # Local fallback for general chat without game active
            fallback_general = {
                "tactical": "I am your Tactical Gaming Assistant. General offline mode is active. I can help optimize your PC specs, check thermals, clear VRAM, or launch games from your library.",
                "friendly": "Hi! I'm running locally right now, but I can still help you optimize your PC, check your specs, clear VRAM, or help you launch your games!",
                "immersive": "Internal system intelligence active in local state. Monitoring system components, thermal layers, VRAM allocations, and library gateways. State your directive.",
                "sarcastic": "I'm running in offline mode. I can still do basic stuff like check your specs, clear VRAM, or launch games, if you can figure out how to ask.",
                "aggressive": "LOCAL MODULE ACTIVE! Let's optimize this machine, clear some VRAM, check specs, and get a game launched. Tell me what to run!"
            }
            return fallback_general.get(personality_key, fallback_general["tactical"])

        # ── If game IS active, perform the normal logic ──

        if self.client:
            library_ctx = self.get_game_library_context(user_id=user_id)
            if is_voice:
                user_prompt = (
                    f"You are speaking directly to the player via a voice assistant. "
                    f"You are actively monitoring their session in '{active_game}'. Live State: {state_desc}.\n"
                    f"User's Scanned Game Library Context (ONLY use this to check if they own a game, do NOT limit your knowledge to this list. CRITICAL: Do NOT mention or recommend these games or launchers unless the user's query is directly related to listing their owned/installed games, launching them, or requesting library recommendations):\n{library_ctx}\n"
                    f"IMPORTANT: The user asked this question via voice, and your response will be read aloud. "
                )
                if kb_context:
                    user_prompt += f"\n[Game Profile / Keybinds Context]:\n{kb_context}\n"
                if force_detailed:
                    user_prompt += (
                        f"Provide a comprehensive, detailed, and clear explanation of the topic. "
                        f"Respond naturally and context-aware. "
                    )
                else:
                    user_prompt += (
                        f"Respond naturally and conversationally. Adapt your behavior to match what the user is saying. "
                        f"Keep your response concise but ensure you fully answer their question without artificially hiding information. "
                        f"IMPORTANT: If [Live Web Context] or [RAG Context] is provided below, you MUST use the specific facts, numbers, and data from it to give a real answer instead of a generic one. "
                        f"If the topic is extremely complex, you may ask if they want more details."
                    )
                user_prompt += f"\n{rag_context}{web_context}\nUser message: {prompt}"
                user_prompt += system_access_instruction
            else:
                user_prompt = (
                    f"You are chatting directly with the player in the Agent panel. "
                    f"You are actively monitoring their session in '{active_game}'. Live State: {state_desc}.\n"
                    f"User's Scanned Game Library Context (ONLY use this to check if they own a game, do NOT limit your knowledge to this list. CRITICAL: Do NOT mention or recommend these games or launchers unless the user's query is directly related to listing their owned/installed games, launching them, or requesting library recommendations):\n{library_ctx}\n"
                )
                if kb_context:
                    user_prompt += f"\n[Game Profile / Keybinds Context]:\n{kb_context}\n"
                if force_detailed:
                    user_prompt += (
                        f"Provide a comprehensive, detailed, and clear explanation of the topic. "
                        f"Respond naturally and context-aware. "
                    )
                else:
                    user_prompt += (
                        f"Respond naturally and conversationally. Adapt your behavior to match what the user is saying. "
                        f"Keep your response concise but ensure you fully answer their question without artificially hiding information. "
                        f"IMPORTANT: If [Live Web Context] or [RAG Context] is provided below, you MUST use the specific facts, numbers, and data from it to give a real answer instead of a generic one. "
                        f"If the topic is extremely complex, you may ask if they want more details."
                    )
                user_prompt += f"\n{rag_context}{web_context}\nUser message: {prompt}"
                user_prompt += system_access_instruction
            
            if self.memory:
                sem_mem = self.memory.get_semantic_memory(user_id=user_id or "guest")
                if sem_mem:
                    user_prompt += f"\n[User Profile / Memory]:\n{sem_mem}\n"
                    
            messages = _build_messages_with_history(system_instr, user_prompt)
            response = self._query_nvidia_nim(messages, model_override=model_id, temperature=0.8, stream=stream)
            if stream:
                return response
            if response:
                if getattr(self, "_feedback_loop", None):
                    import threading
                    threading.Thread(target=self._feedback_loop.evaluate_and_log, args=(prompt, response), daemon=True).start()
                if self.memory and session_id:
                    import threading
                    threading.Thread(target=self.memory.extract_and_store_semantic_memory, args=(session_id, user_id or "guest"), daemon=True).start()
                    
                response = self._process_system_command(response.strip(), agentic_mode_active=agentic_mode_active)
                return self._process_launch_command(response, agentic_mode_active=agentic_mode_active, is_launch_request=is_launch_request, prompt=prompt)

        # Offline fallback for in-game response
        fallback_ingame_voice = {
            "tactical": f"Monitoring session in {active_game or 'your game'}. Ask me for tips or commands.",
            "friendly": f"I'm keeping an eye on {active_game or 'your game'}! Let know if you need any tips or want me to run a command.",
            "immersive": f"Neural telemetry link active for {active_game or 'your game'}. State your directive, player.",
            "sarcastic": f"Monitoring {active_game or 'your game'}. Try not to make too many mistakes. Ask if you need something.",
            "aggressive": f"LOCKED IN! Telemetry active for {active_game or 'your game'}. Ask for specs optimization or commands now!"
        }
        fallback_ingame_chat = {
            "tactical": f"I see you're playing **{active_game or 'a game'}**. Telemetry is active. Ask me for performance tips, strategies, or system commands.",
            "friendly": f"Awesome! You're playing **{active_game or 'a game'}**. I'm watching your telemetry. Ask me for any tips, specs info, or commands!",
            "immersive": f"Telemetry link established in **{active_game or 'a game'}**. Standing by to monitor simulation levels or execute terminal overrides.",
            "sarcastic": f"So you're playing **{active_game or 'a game'}**. I'm tracking telemetry. Ask for performance tips or commands, if you dare.",
            "aggressive": f"ACTIVE telemetry locked on **{active_game or 'a game'}**! Ask for specs optimization, clear VRAM, or system commands to dominate!"
        }
        if is_voice:
            return fallback_ingame_voice.get(personality_key, fallback_ingame_voice["tactical"])
        return fallback_ingame_chat.get(personality_key, fallback_ingame_chat["tactical"])

    def _find_launcher_or_game(self, target, games=None):
        """Helper to find the best matching game or launcher and resolve its executable path."""
        return AgentCommandProcessor.find_launcher_or_game(target, games)

    def _process_launch_command(self, response: str, agentic_mode_active: bool = False, is_launch_request: bool = False, prompt=None) -> str:
        """Parse the generated response for launch directives and execute them natively."""
        return AgentCommandProcessor.process_launch_command(
            config=self.config,
            response=response,
            agentic_mode_active=agentic_mode_active,
            is_launch_request=is_launch_request,
            prompt=prompt
        )

    def _process_system_command(self, response: str, agentic_mode_active: bool = False) -> str:
        """Parse the response for [SYSTEM_COMMAND:...] and execute app-level configurations."""
        return AgentCommandProcessor.process_system_command(response, agentic_mode_active)

    def _agentic_analyze(self, state):
        """Advanced agentic reasoning with deep game knowledge injection."""
        agent_cfg = self.config.get("ai_agent", {})
        genres = agent_cfg.get("genres", {})
        scene = state.get("scene_type", "unknown")

        # -- Genre-Specific Quick Checks --
        if genres.get("racing", {}).get("enabled") and scene == "racing":
            return self._make_result(
                "RACING AGENT: Optimal line detected. Drafting leading vehicle.",
                "high", "racing"
            )
        if genres.get("open_world", {}).get("enabled") and scene == "exploration":
            return self._make_result(
                "EXPLORER AGENT: Scanning for resources. Points of interest marked.",
                "medium", "exploration"
            )
        if genres.get("rpg", {}).get("enabled") and scene in ("inventory", "dialogue", "combat"):
            return self._make_result(
                "RPG AGENT: Analyzing build synergy. Stat distribution and gear optimization recommended.",
                "medium", "rpg"
            )
        if genres.get("story", {}).get("enabled") and scene in ("cutscene", "dialogue"):
            return self._make_result(
                "STORY AGENT: Narrative focus active. Context summarized. Skip action available.",
                "low", "story",
                actions=["interact"]
            )

        # -- AI Reasoning (NIM or Local) with deep game knowledge injection --
        reasoning_type = agent_cfg.get("reasoning_type", "local")

        if reasoning_type == "nim" and self.client:
            from ai_brain.game_knowledge import get_knowledge_base
            kb = get_knowledge_base()

            # Auto-detect game from active game info or window title
            game_info = state.get("game_info") or {}
            game_title = (
                game_info.get("name", "")
                or state.get("current_game", "")
                or state.get("active_window_title", "")
            )
            if game_title:
                kb.identify_game(game_title, config=self.config)

            # Auto-detect active character and mission from on-screen OCR text
            dialogue_text = state.get("dialogue_text", "")
            quest_texts = state.get("quest_texts", [])
            if hasattr(kb, "detect_character_from_ocr"):
                kb.detect_character_from_ocr(dialogue_text, " ".join(quest_texts))
            if hasattr(kb, "detect_mission_from_ocr"):
                kb.detect_mission_from_ocr(quest_texts, dialogue_text)

            # Load user game library and build the context block
            library_ctx = self.get_game_library_context()
            game_context_block = kb.build_context_block(include_keybinds=True)
            if library_ctx:
                game_context_block += "\n\n" + library_ctx

            # -- Proactive Agentic Search (Phase 21: Neural Brain) --
            web_context = ""
            if hasattr(self, "_last_gameplay_search_result") and self._last_gameplay_search_result:
                web_context = f"\n[Agentic Intelligence - Walkthrough Context]: {self._last_gameplay_search_result[:800]}"

            health_val = state.get("health", 100)
            input_dev = state.get("input_device", "Keyboard + Mouse")
            
            # Standard keys to exclude from dynamic custom telemetry description
            standard_keys = {
                "health", "enemies_count", "scene_type", "dialogue_text", "quest_texts",
                "story_advice", "ammo", "position", "game_info", "current_game",
                "active_window_title", "vlm_description", "input_device", "detections_count",
                "detections", "scene_confidence", "player_profile", "tilt_detected",
                "deaths_this_session", "playtime_seconds"
            }
            
            custom_telemetry = {}
            for k, v in state.items():
                if k not in standard_keys and not k.startswith("_") and v is not None:
                    custom_telemetry[k] = v
                    
            custom_desc = ""
            if custom_telemetry:
                parts = []
                for k, v in custom_telemetry.items():
                    pretty_key = " ".join(word.capitalize() for word in k.split("_"))
                    parts.append(f"{pretty_key}: {v}")
                custom_desc = " | Custom Telemetry: " + ", ".join(parts)

            try:
                state_desc = (
                    f"Scene: {scene}, Health: {float(health_val):.0f}%, "
                    f"Enemies detected: {state.get('enemies_count', 0)}, "
                    f"Active Quests: {quest_texts[:3]}, Input Device: {input_dev}"
                )
            except Exception:
                state_desc = f"Scene: {scene}, Enemies: {state.get('enemies_count', 0)}, Input Device: {input_dev}"

            if hasattr(self, 'context_engine') and self.context_engine:
                context = self.context_engine.get_context()
                if context:
                    state_desc += f" | Session Playtime: {context.get('playtime_seconds', 0)}s | Session Deaths: {context.get('deaths_this_session', 0)} | Tilt Status: {'TILT DETECTED' if context.get('tilt_detected', False) else 'Calm'}"

            if custom_desc:
                state_desc += custom_desc

            if dialogue_text:
                state_desc += f", On-screen Dialogue: \"{dialogue_text[:200]}\""

            vision_data = state.get("vlm_description")
            if vision_data:
                state_desc += f" | Visual Scene Analysis: {vision_data[:300]}"

            # Pull recent memory context for conversation continuity
            history = ""
            if self.memory:
                recent = self.memory.get_recent_advice(3)
                if recent:
                    history = " | Recent context: " + " -> ".join([r["advice"][:80] for r in recent])

            # OPTIMIZATION: Rate limiting + state hashing
            now = time.time()
            import hashlib
            state_hash = hashlib.md5((state_desc + game_context_block).encode()).hexdigest()

            if (now - self._last_query_time) < 5.0:
                if self._last_nim_result:
                    return self._last_nim_result
                return self._make_result("Agent observing... (API Cooldown)", "low", "agent")

            if state_hash == self._last_state_hash and (now - self._last_query_time) < 15.0:
                return self._last_nim_result

            # Personality system instruction
            personality_key = agent_cfg.get("personality", "tactical")
            prompts = agent_cfg.get("prompts", {})
            personalities = prompts.get("personalities", {})
            system_instr = (
                personalities.get(personality_key)
                or self.PERSONALITY_PROFILES.get(personality_key)
                or personalities.get("tactical")
                or self.PERSONALITY_PROFILES["tactical"]
            )

            # Build the deep, game-aware spoken guidance prompt
            prompt_parts = []
            prompt_parts.append(system_instr)
            prompt_parts.append(
                "You are the AGENTIC AI NEURAL BRAIN. You have full access to system controls, game launchers, "
                "and real-time gameplay intelligence. You speak directly to the player as a high-authority "
                "tactical co-pilot with autonomous reasoning capabilities. "
                "Provide extremely concise, brief, and direct spoken guidance (max 2 sentences). "
                f"IMPORTANT: The player is currently playing using a **{input_dev}**. "
                "You MUST suggest precise keybinds and buttons that match this input device. "
                "For example: if they are on a Controller, recommend button actions like 'press A to jump', "
                "'hold Left Trigger to aim', or 'press X to reload'. If they are on Keyboard + Mouse, recommend keys like 'press Q for cover', "
                "'press R to reload', or 'hold Shift to sprint'. "
                "Be specific: reference the exact character abilities, exact keybindings matching the active device, "
                "mission objectives, and enemy types by name. "
                "If dialogue is on screen, acknowledge what was said and tell the player what to do next in a single brief sentence. "
                "Do NOT mention the game title. Do NOT say 'in this game'. Speak naturally, fluidly, and keep your answer extremely concise, short, and to the point (under 2 sentences max)."
            )
            if game_context_block:
                prompt_parts.append("\n[GAME CONTEXT]:\n" + game_context_block)
            if web_context:
                prompt_parts.append("\n[WALKTHROUGH DATA]:\n" + web_context)
            prompt_parts.append("\n[CURRENT STATE]:\n" + state_desc + history)
            if dialogue_text:
                prompt_parts.append(
                    "\n[DIALOGUE ON SCREEN]: \"" + dialogue_text[:300] + "\"\n"
                    "React to this dialogue contextually. If a character gives an order or provides "
                    "information, tell the player what action they should take next."
                )
            prompt_parts.append(
                "\nReturn ONLY a JSON object:\n"
                "{\n"
                "  \"advice\": \"<spoken voice guidance, extremely concise and under 2 sentences>\",\n"
                "  \"priority\": \"<low|medium|high|critical>\",\n"
                "  \"voice_hint\": \"<optional short extra tip under 5 words>\",\n"
                "  \"actions\": []\n"
                "}\n"
                "Priority guide: critical=health<25 in firefight, high=enemies>3 or health<50 with enemies, "
                "medium=active combat or mission objectives, low=exploring/cutscene/menu."
            )

            prompt = "\n".join(prompt_parts)
            response = self._query_nvidia_nim(prompt)
            if isinstance(response, dict):
                return response
            if not response:
                return self._local_game_aware_fallback(state, kb, scene)

            try:
                import json
                clean = response
                if "```json" in clean:
                    clean = clean.split("```json")[1].split("```")[0].strip()
                elif "{" in clean:
                    clean = clean[clean.find("{"):clean.rfind("}")+1]
                data = json.loads(clean)
                advice = data.get("advice", "")
                voice_hint = data.get("voice_hint", "")
                full_advice = (advice + (" " + voice_hint if voice_hint else "")).strip()
                
                # Tag as Agentic Neural Brain output
                if not full_advice.startswith("🧠"):
                    full_advice = "🧠 **Neural Brain**: " + full_advice

                result = self._make_result(
                    full_advice,
                    data.get("priority", "medium"),
                    "agent",
                    actions=data.get("actions", [])
                )
                self._last_state_hash = state_hash
                self._last_nim_result = result
                self._last_query_time = now
                return result
            except Exception:
                return self._make_result(response.strip()[:400], "medium", "agent")

        return self._make_result("Agent observing... Local rules active.", "low", "agent")

    def _local_game_aware_fallback(self, state, kb, scene: str) -> dict:
        """Local fallback voice advice using game knowledge when NIM is unavailable."""
        import random
        tips = kb.get_mission_tactical_tips()
        char_hint = kb.get_character_special_ability_hint()
        dialogue_text = state.get("dialogue_text", "")
        quest_texts = state.get("quest_texts", [])
        enemies = state.get("enemies_count", 0)
        health = state.get("health", 100)
        advice_parts = []

        if health < 25:
            advice_parts.append("Health critical. Find cover immediately and let it recover.")
        elif health < 50 and enemies > 0:
            advice_parts.append("Low health with enemies nearby. Fall back and take cover.")

        if scene in ("dialogue", "cutscene") and dialogue_text:
            advice_parts.append(f"Listen up: {dialogue_text[:100]}")
        elif scene == "combat":
            if enemies > 3:
                advice_parts.append(
                    f"You are outnumbered with {enemies} enemies. "
                    "Use cover and pick them off one by one."
                )
            elif enemies > 0:
                advice_parts.append(f"Engage the targets. {enemies} enemies spotted.")

        if tips and len(advice_parts) < 2:
            advice_parts.append(random.choice(tips))

        if char_hint and scene == "combat" and not any("special" in a.lower() for a in advice_parts):
            advice_parts.append(char_hint)

        if quest_texts and scene not in ("cutscene", "dialogue") and len(advice_parts) < 2:
            advice_parts.append(f"Objective: {quest_texts[0]}")

        if not advice_parts:
            advice_parts.append("Press Q for cover, hold Tab for the weapon wheel, and stay alert.")

        advice = " ".join(advice_parts[:3])
        priority = "critical" if health < 25 else ("high" if (enemies > 3 or health < 50) else "medium")
        return self._make_result(advice, priority, "agent")

    def classify_game_title(self, title):
        """
        Use NVIDIA NIM to classify a game title into type (GAME/LAUNCHER/SOFTWARE) and genre.
        Returns a dict: {"type": "GAME"|"LAUNCHER"|"SOFTWARE", "genre": "...", "tags": [...]}
        """
        software_keywords = [
            "visual studio", "mysql", "workbench", "chrome", "firefox", "word", 
            "excel", "photoshop", "zoom", "slack", "teams", "discord", "spotify", 
            "vscode", "devenv", "docker", "postman", "git", "nodejs", "python",
            "intellij", "android studio", "acrobat", "office", "powerpoint", "outlook"
        ]
        
        def get_fallback_tags(game_title):
            title_lower = game_title.lower()
            genre = "CLASSIC"
            tags = []
            
            # 1. Determine genre/tags based on title keywords
            if any(kw in title_lower for kw in ["combat", "strike", "war", "battle", "fight", "gun", "agent", "007", "shoot", "ops", "duty", "frontline"]):
                genre = "ACTION"
                tags.append("ACTION")
            elif any(kw in title_lower for kw in ["rpg", "quest", "scroll", "fantasy", "sword", "witcher", "soul", "elden", "craft", "hero"]):
                genre = "RPG"
                tags.append("RPG")
            elif any(kw in title_lower for kw in ["drive", "race", "speed", "rally", "car", "moto", "asphalt", "track"]):
                genre = "RACING"
                tags.append("RACING")
            elif any(kw in title_lower for kw in ["soccer", "football", "fifa", "nba", "sport", "tennis", "golf", "f1"]):
                genre = "SPORTS"
                tags.append("SPORTS")
            elif any(kw in title_lower for kw in ["build", "sim", "tycoon", "city", "farm", "manager"]):
                genre = "SIMULATION"
                tags.append("SIMULATION")
            elif any(kw in title_lower for kw in ["survive", "dead", "zombie", "horror", "resident", "evil", "last"]):
                genre = "SURVIVAL"
                tags.append("SURVIVAL")
            
            # 2. Add game modes (Multiplayer vs Singleplayer)
            is_multiplayer = any(kw in title_lower for kw in ["online", "multiplayer", "arena", "co-op", "coop", "pvp", "mmo", "championship", "league"])
            if is_multiplayer:
                tags.append("MULTIPLAYER")
                if len(tags) < 2:
                    tags.append("CO-OP")
            else:
                tags.append("SINGLEPLAYER")
                
            # 3. Ensure we have exactly 2-3 tags
            if len(tags) < 2:
                if "ACTION" not in tags and genre != "RPG":
                    tags.append("ACTION")
                elif "RPG" not in tags:
                    tags.append("RPG")
                else:
                    tags.append("ADVENTURE")
            return {
                "type": "GAME",
                "genre": genre,
                "tags": [t.upper() for t in tags[:3]]
            }

        # Fast local checks using word boundaries to avoid false positives (e.g. "ea" matching "heat" or "git" matching "digital")
        import re
        title_lower = title.lower()
        software_pattern = r"\b(" + "|".join(re.escape(s) for s in software_keywords) + r")\b"
        if re.search(software_pattern, title_lower):
            return {"type": "SOFTWARE", "genre": "PRODUCTIVITY", "tags": []}
            
        launcher_pattern = r"\b(launcher|steam|epic|ea|origin|ubisoft|connect|battle\.net|riot|rockstar|xbox)\b"
        if re.search(launcher_pattern, title_lower):
            return {"type": "LAUNCHER", "genre": "PLATFORM", "tags": ["SYSTEM"]}
            
        if not self.client:
            return get_fallback_tags(title)

        search_info = ""
        try:
            if hasattr(self, "_web_search") and self._web_search:
                # We do a search specifically targeting RAWG/SteamSpy for game info
                res = self._web_search.search(title, task="game_info")
                if res and res.get("answer"):
                    search_info = f"\nWeb Search Data for context:\n{res['answer']}\n"
        except Exception as e:
            logger.debug(f"Web search failed during classification for {title}: {e}")

        prompt = (
            f"Classify the following software title into a category. "
            f"Title: '{title}'\n{search_info}"
            "Return ONLY a JSON object with these keys:\n"
            "- 'type' (either 'GAME', 'LAUNCHER', or 'SOFTWARE' for non-gaming software/utilities/IDE/database clients like Visual Studio, Chrome, MySQL, etc.),\n"
            "- 'genre' (primary genre like 'FPS', 'Racing', 'RPG', 'Story', 'Open World', 'Platform', 'PLATFORM' for launchers, or 'PRODUCTIVITY' for general software),\n"
            "- 'tags' (list of exactly 2 to 3 descriptive GENRE or GAME MODE tags for the game, e.g. 'ACTION', 'RPG', 'MULTIPLAYER', 'SINGLEPLAYER', 'CO-OP', 'OPEN WORLD'. "
            "Excluding any hardware features, graphics tech, or system capabilities such as 'DLSS', 'Frame Gen', 'Reflex', 'Ray Tracing', 'HDR', 'VR', etc. tags)."
        )

        try:
            response = self._query_nvidia_nim(prompt)
            if not response:
                raise ValueError("Empty response")
            
            # Basic cleanup of AI response
            import json
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "{" in response:
                response = response[response.find("{"):response.rfind("}")+1]
            
            data = json.loads(response)
            res_tags = [t.upper() for t in data.get("tags", [])]
            res_type = data.get("type", "GAME").upper()
            res_genre = data.get("genre", "CLASSIC").upper()
            if res_type == "GAME" and not res_tags:
                fallback = get_fallback_tags(title)
                res_tags = fallback["tags"]
                if res_genre == "CLASSIC":
                    res_genre = fallback["genre"]
            return {
                "type": res_type,
                "genre": res_genre,
                "tags": res_tags
            }
        except Exception:
            # Local fallback on failure
            title_lower = title.lower()
            if any(s in title_lower for s in software_keywords):
                return {"type": "SOFTWARE", "genre": "PRODUCTIVITY", "tags": []}
            launchers = ["launcher", "steam", "epic", "ea", "origin", "ubisoft", "connect", "battle.net", "riot", "rockstar", "xbox"]
            if any(l in title_lower for l in launchers):
                return {"type": "LAUNCHER", "genre": "PLATFORM", "tags": ["System"]}
            return get_fallback_tags(title)

    # ── Competitive Mode ──────────────────────────────────────────────

    def _competitive_analyze(self, health, enemies, scene, state):
        """Fast tactical analysis for competitive/FPS games."""
        if scene in ("menu", "loading", "cutscene"):
            return self._make_result("Non-gameplay scene.", "low", "status")

        # Check for game-specific telemetry advice first
        game_info = state.get("game_info") or {}
        game_title = game_info.get("name", "") or state.get("current_game", "") or state.get("active_window_title", "")
        custom_advice = self._get_custom_telemetry_advice(state, game_title)
        
        # Critical situations first
        if health < 20 and enemies > 0:
            return self._make_result(
                "CRITICAL: Health critical with enemies nearby. Disengage NOW!",
                "critical", "combat"
            )
            
        if custom_advice:
            if custom_advice["priority"] in ("high", "critical"):
                return self._make_result(custom_advice["advice"], custom_advice["priority"], custom_advice["category"])

        if health < 30 and enemies > 0:
            return self._make_result(
                "DANGER: Low health, enemies present. Fall back and heal!",
                "high", "combat"
            )
        if enemies > 4:
            return self._make_result(
                f"OUTNUMBERED: {enemies} enemies. Reposition or use AoE.",
                "high", "combat"
            )
            
        if custom_advice and custom_advice["priority"] == "medium":
            return self._make_result(custom_advice["advice"], "medium", custom_advice["category"])

        if enemies > 2:
            return self._make_result(
                f"Multiple targets ({enemies}). Prioritize isolated enemies.",
                "medium", "combat"
            )
        if health < 50:
            return self._make_result(
                "Health below 50%. Heal before next engagement.",
                "medium", "health"
            )
            
        if custom_advice:
            return self._make_result(custom_advice["advice"], "low", custom_advice["category"])

        if enemies == 1:
            return self._make_result(
                "Single target. Engage with advantage.",
                "low", "combat"
            )
        return self._make_result("All clear. Advance carefully.", "low", "status")

    # ── Story Mode ────────────────────────────────────────────────────

    def _story_analyze(self, health, enemies, scene, state):
        """Narrative-aware analysis for story/single-player games."""
        dialogue = state.get("dialogue_text", "")
        quests = state.get("quest_texts", [])
        story_advice = state.get("story_advice", "")

        game_info = state.get("game_info") or {}
        game_title = game_info.get("name", "") or state.get("current_game", "") or state.get("active_window_title", "")
        custom_advice = self._get_custom_telemetry_advice(state, game_title)

        if scene == "cutscene":
            return self._make_result(
                "Cutscene playing. Watch for important story details.",
                "low", "story"
            )
        if scene == "dialogue":
            advice = "Dialogue active."
            if dialogue:
                advice += f" Current: \"{dialogue[:80]}...\""
            return self._make_result(advice, "medium", "story")
            
        if custom_advice and custom_advice["priority"] in ("high", "medium"):
            return self._make_result(custom_advice["advice"], custom_advice["priority"], custom_advice["category"])
        
        if scene == "exploration":
            tips = []
            if quests:
                tips.append(f"Active quest: {quests[-1]}")
            if story_advice:
                tips.append(story_advice)
            if custom_advice:
                tips.append(custom_advice["advice"])
            if health < 60:
                tips.append("Consider healing before moving on.")
            return self._make_result(
                " | ".join(tips) if tips else "Explore the area. Look for items and clues.",
                "low", "exploration"
            )
        
        if scene == "combat":
            if health < 30:
                return self._make_result(
                    f"Low health in combat ({enemies} enemies). Use potions/heal!",
                    "high", "combat"
                )
            if custom_advice:
                return self._make_result(
                    f"Combat: {enemies} enemies | {custom_advice['advice']}",
                    "medium", "combat"
                )
            return self._make_result(
                f"Combat: {enemies} enemies. Defeat them and check for loot.",
                "medium", "combat"
            )

        if scene == "inventory":
            return self._make_result(
                "Inventory open. Equip best gear and manage items.",
                "low", "inventory"
            )
        if scene == "menu":
            return self._make_result(
                "Menu detected. Consider saving your progress.",
                "low", "menu"
            )
        
        fallback_tips = []
        if story_advice:
            fallback_tips.append(story_advice)
        if custom_advice:
            fallback_tips.append(custom_advice["advice"])
            
        return self._make_result(
            " | ".join(fallback_tips) if fallback_tips else "Observing...",
            "low", "status"
        )

    # ── Hybrid Mode ───────────────────────────────────────────────────

    def _hybrid_analyze(self, health, enemies, scene, state):
        """Combined competitive + story analysis (Souls-like games)."""
        if scene == "combat" or enemies > 0:
            result = self._competitive_analyze(health, enemies, scene, state)
            story_advice = state.get("story_advice", "")
            if story_advice and result["priority"] != "critical":
                result["advice"] += f" | Story: {story_advice}"
            return result
        
        return self._story_analyze(health, enemies, scene, state)

    def _get_custom_telemetry_advice(self, state, game_title):
        """Generate game/genre specific advice based on custom telemetry fields."""
        return TelemetryAdvisor.get_custom_telemetry_advice(state, game_title)

    # ── NVIDIA NIM Integration ────────────────────────────────────────
    
    def _query_nvidia_nim(self, prompt, model_override: str = None, system_instruction: str = None, temperature: float = 0.2, stream: bool = False):
        """
        Direct interface for NVIDIA NIM (Inference Microservices).
        Supports model_override for auto task-based model switching.
        """
        # Anonymized Reasoning: strip system metadata (Username, OS, paths)
        if self.config.get("privacy", {}).get("anonymize", False):
            import re
            
            def anonymize_text(text):
                if not isinstance(text, str):
                    return text
                # 1. Strip absolute directories and replace with generic ones
                text = re.sub(r'(?i)[a-z]:\\users\\[a-z0-9_-]+', r'<SYSTEM_USER>', text)
                text = re.sub(r'(?i)/home/[a-z0-9_-]+', r'<SYSTEM_USER>', text)
                
                # 2. Get exact local username and replace it with ANONYMOUS
                username = os.environ.get("USERNAME") or os.environ.get("USER")
                if username and len(username) > 1:
                    text = re.sub(re.escape(username), "ANONYMOUS", text, flags=re.IGNORECASE)
                    
                # 3. Strip absolute executable paths (e.g. C:\Program Files\Steam\steam.exe -> steam.exe)
                def strip_exe_path(match):
                    path = match.group(0)
                    return os.path.basename(path)
                text = re.sub(r'(?i)[a-z]:\\[^;]+?\.exe', strip_exe_path, text)
                
                # 4. Acknowledge the OS anonymization if OS name is mentioned
                text = re.sub(r'(?i)windows 10|windows 11|macos|linux', '<ANONYMOUS_OS>', text)
                return text

            if isinstance(prompt, list):
                for msg in prompt:
                    if msg.get("role") == "user":
                        msg["content"] = anonymize_text(msg.get("content", ""))
            else:
                prompt = anonymize_text(prompt)

        if not self.client:
            return None

        with self._chat_lock:
            # Circuit Breaker
            now = time.time()
            if self._chat_failures >= 3:
                if now < self._chat_disabled_until:
                    return None
                else:
                    self._chat_failures = 0

            agent_cfg = self.config.get("ai_agent", {})
            # Use override if provided, else fall back to config/defaults
            if model_override:
                model_id = model_override
            else:
                task = "strategic"  # Default for general chat
                model_id = agent_cfg.get(f"{task}_model") or agent_cfg.get("model_id") or self.task_models.get(task)
            
            try:
                # We use non-streaming here for simpler integration into the pipeline, 
                # but we could adapt for streaming if needed in the UI.
                if isinstance(prompt, list):
                    messages = prompt
                else:
                    messages = []
                    if system_instruction:
                        messages.append({"role": "system", "content": system_instruction})
                    messages.append({"role": "user", "content": prompt})

                completion = self.client.chat.completions.create(
                    model=model_id,
                    messages=messages,
                    temperature=temperature,
                    top_p=0.7,
                    max_tokens=4096,
                    stream=stream,
                    timeout=30.0
                )
                
                self._chat_failures = 0 # Reset on success
                if stream:
                    def generate():
                        for chunk in completion:
                            if hasattr(chunk.choices[0], "delta") and getattr(chunk.choices[0].delta, "content", None):
                                yield chunk.choices[0].delta.content
                    return generate()
                else:
                    advice = completion.choices[0].message.content
                    return advice
                
            except Exception as e:
                error_text = str(e).lower()
                logger.error(f"NVIDIA NIM Query failed: {e}")
                
                if "429" in error_text or "too many requests" in error_text:
                    self._chat_failures += 1
                    wait_time = 30 * self._chat_failures # Exponential-ish backoff
                    self._chat_disabled_until = time.time() + wait_time
                    logger.warning(f"NVIDIA NIM Rate Limited (429). Disabling for {wait_time}s.")
                elif "403" in error_text or "401" in error_text or "authorization failed" in error_text:
                    self.client = None
                    logger.warning("Disabling NVIDIA NIM for this session after auth failure; falling back to local rules.")
                else:
                    self._chat_failures += 1
                    if self._chat_failures >= 3:
                        self._chat_disabled_until = time.time() + 60
                return None

    def _query_vision_nim(self, image_b64):
        """
        Query NVIDIA NIM for Multi-modal Vision (e.g. Phi-3 Vision or NEVA).
        Returns a natural language description of the scene.
        """
        # Use specialized vision client if available, fallback to standard
        client = getattr(self, "vision_client", self.client)
        if not client: return None
        
        # Circuit Breaker: Disable vision if too many failures
        if self._vision_failures >= 5:
            now = time.time()
            if now < self._vision_disabled_until:
                return None
            else:
                # Retry after 5 minutes
                self._vision_failures = 0

        vision_cfg = self.config.get("nvidia", {}).get("vision_nim", {})
        vision_url = vision_cfg.get("endpoint_url") or vision_cfg.get("vision_endpoint_url") or self.config.get("ai_agent", {}).get("vision_endpoint_url") or os.environ.get("NVIDIA_VISION_ENDPOINT_URL") or getattr(client, "base_url", None)
        
        # Use Nemotron Vision by default instead of Llama
        model_id = vision_cfg.get("model_id") or self.task_models.get("vision")
        
        if not vision_cfg.get("enabled", False):
            return None

        try:
            logger.info(f"Executing Multi-modal Vision NIM: {model_id} via {vision_url}")
            completion = client.chat.completions.create(
                model=model_id,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Analyze this gaming screen precisely. Identify the active game genre, visual details, HUD elements (health/mana, maps, quest log), visible enemies, player character action, active hazards, and items on screen. Be extremely concise but highly descriptive so a gaming AI copilot can provide tactical suggestions."
                            },
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"},
                            },
                        ],
                    }
                ],
                max_tokens=256,
                timeout=15.0
            )
            self._vision_failures = 0 # Reset on success
            return completion.choices[0].message.content
        except Exception as e:
            self._vision_failures += 1
            logger.error(f"Vision NIM Query failed ({self._vision_failures}/5): {e}")
            if self._vision_failures >= 5:
                logger.warning("Disabling Vision NIM for 5 minutes due to repeated failures.")
                self._vision_disabled_until = time.time() + 300
            return None



    # ── Helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _make_result(advice, priority, category, actions=None):
        return {
            "advice": advice,
            "priority": priority,  # critical, high, medium, low
            "category": category,  # combat, health, story, exploration, etc.
            "actions": actions or [] # List of GameAction values
        }

    def reply_to_prompt_stream(self, prompt: str, game_name: str = "", is_game_active: bool = False, game_state: dict = None, is_voice: bool = False, user_id: str = None, session_id: str = None, agentic_mode_active: bool = False):
        """Wrapper for reply_to_prompt that guarantees a streaming generator and executes side-effects after stream completion."""
        generator = self.reply_to_prompt(
            prompt=prompt, game_name=game_name, is_game_active=is_game_active, 
            game_state=game_state, is_voice=is_voice, user_id=user_id, 
            session_id=session_id, agentic_mode_active=agentic_mode_active, stream=True
        )
        
        import types
        if not isinstance(generator, types.GeneratorType):
            # It returned a static string instead of a stream generator (e.g., fallback texts)
            yield str(generator)
            return
            
        full_text = ""
        for chunk in generator:
            full_text += chunk
            yield chunk
            
        # Post-process for side-effects (modifying settings, launching games) without altering the already yielded stream
        self._process_system_command(full_text, agentic_mode_active=agentic_mode_active)
        self._process_launch_command(full_text, agentic_mode_active=agentic_mode_active, is_launch_request=False, prompt=prompt)
        
        # Trigger feedback loop and semantic memory extraction after stream completion
        if getattr(self, "_feedback_loop", None):
            import threading
            threading.Thread(target=self._feedback_loop.evaluate_and_log, args=(prompt, full_text), daemon=True).start()
        if self.memory and session_id:
            import threading
            threading.Thread(target=self.memory.extract_and_store_semantic_memory, args=(session_id, user_id or "guest"), daemon=True).start()

