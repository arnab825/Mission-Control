import asyncio
import json
import logging
import os
import threading
import websockets
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict

logger = logging.getLogger(__name__)


class HandshakeFilter(logging.Filter):
    """Filter out noisy handshake errors that occur during quick probes or HMR."""

    def filter(self, record):
        msg = record.getMessage()
        if "opening handshake failed" in msg or "connection closed" in msg:
            return False
        return True


ws_logger = logging.getLogger("websockets.server")
ws_logger.addFilter(HandshakeFilter())


class BridgeServer:
    """
    WebSocket bridge server to synchronize Python backend state with React frontend.
    """

    def __init__(self, host=None, port=None, max_workers=4):
        self.host = host or os.getenv("BRIDGE_HOST", "localhost")
        raw_port = port if port is not None else os.getenv("BRIDGE_PORT", "8765")
        self.port = int(raw_port)
        self.clients = set()
        self.loop = None
        self.thread = None
        self._state = {}
        self._last_broadcast = {}  # Tracks last-sent values for change detection
        self._executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="bridge_cmd")
        self._command_debounce = {}  # Command debouncing to prevent spam
        # Game-mode throttle batch state (initialized here instead of lazily via hasattr)
        self._game_pending: Dict[str, Any] = {}
        self._game_pending_time: float = 0.0
        self._flush_scheduled: bool = False

    def start(self):
        """Start the WebSocket server in a separate thread."""
        if self.thread and self.thread.is_alive():
            logger.debug("Bridge Server already running.")
            return
        self.thread = threading.Thread(target=self._run_event_loop, daemon=True)
        self.thread.start()

    def _run_event_loop(self):
        try:
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
            self.loop.run_until_complete(self._start_server())
            self.loop.run_forever()
        except Exception as e:
            logger.error("Bridge Server event loop failed: %s", e)

    async def _start_server(self):
        try:
            async with websockets.serve(self._handler, self.host, self.port):
                logger.info("Bridge Server started at ws://%s:%s", self.host, self.port)
                await asyncio.Future()
        except OSError as e:
            if e.errno in (10048, 98):
                logger.error(
                    "Bridge Server failed to start: Port %s is already in use. Exiting process to prevent zombie backend instances.", self.port
                )
                import os
                os._exit(1)
            else:
                raise e

    async def _handler(self, websocket):
        # CSWSH (Cross-Site WebSocket Hijacking) Protection
        headers = getattr(websocket, "request_headers", None)
        if headers is None:
            request = getattr(websocket, "request", None)
            headers = getattr(request, "headers", {})
        origin = headers.get("Origin")
        if origin:
            from urllib.parse import urlparse
            try:
                parsed = urlparse(origin)
                hostname = parsed.hostname
                scheme = parsed.scheme
                
                is_local = hostname in ("localhost", "127.0.0.1") or not hostname
                is_safe_scheme = scheme in ("file", "vscode-webview", "vscode-resource") or not scheme
                
                if not (is_local or is_safe_scheme):
                    logger.warning("Rejected WebSocket connection from unauthorized origin: %s", origin)
                    await websocket.close(code=4001, reason="Unauthorized origin")
                    return
            except Exception as e:
                logger.error("Error validating WebSocket origin: %s", e)
                await websocket.close(code=4001, reason="Invalid origin header")
                return

        self.clients.add(websocket)
        logger.info("Frontend client connected: %s", websocket.remote_address)
        try:
            # Send entire state on connection
            if self._state:
                await websocket.send(json.dumps(self._state))
                logger.debug("Initial state sent to client: %d keys", len(self._state))

            async for message in websocket:
                try:
                    data = json.loads(message)
                    cmd_type = data.get("type")
                    payload = data.get("payload", {})

                    if cmd_type == "ping":
                        await websocket.send(json.dumps({"type": "pong"}))
                        continue

                    logger.info("Bridge command: %s | %s", cmd_type, payload)

                    # Handle explicit state request for critical data (no delay)
                    if cmd_type == "request_state":
                        # Send full state or specific keys on demand
                        keys_to_send = payload.get("keys", [])
                        if keys_to_send:
                            response = {k: self._state.get(k) for k in keys_to_send if k in self._state}
                        else:
                            response = self._state
                        await websocket.send(json.dumps(response))
                        continue

                    # Check if command should be debounced (prevents rapid duplicate requests)
                    if not self.should_process_command(cmd_type):
                        continue

                    # Run command handler in thread pool to avoid blocking event loop
                    if hasattr(self, "on_command") and self.on_command:
                        self.loop.run_in_executor(self._executor, self.on_command, cmd_type, payload)
                except Exception as e:
                    logger.error("Failed to process bridge message: %s", e)
        except websockets.exceptions.ConnectionClosed:
            logger.debug("Connection closed by client.")
        except ConnectionResetError:
            logger.debug("Connection reset by client.")
        except Exception as e:
            logger.error("Error in websocket handler: %s", e, exc_info=True)
        finally:
            if websocket in self.clients:
                self.clients.remove(websocket)
            logger.info("Frontend client disconnected: %s", websocket.remote_address)

    def update_state(self, new_state: Dict[str, Any]):
        """Push only changed state fields to all connected frontend clients.

        When a game is active, non-critical telemetry is coalesced into a
        1-second batch so rapid state floods don't disrupt game frame timing.
        Critical keys (voice, agent, chat) always bypass the throttle.
        """
        import copy, time as _time

        self._state.update(new_state)
        if not self.loop or not self.clients:
            return

        # Keys that must always arrive immediately regardless of game activity
        BYPASS_KEYS = {
            "voice_prompt", "agent_response", "chat_history", "chat_sessions",
            "active_chat_session_id",
            "suggested_session_title", "config", "version", "connected",
            "update_state", "account_deleted", "launch_status", "yolo_supported", "yolo_install_status",

            # System telemetry should always update immediately for dashboard
            "cpu_pct", "gpu_metrics", "mem_pct", "mem_used_gb", "mem_total_gb",
            "disk_util", "cpu_temp", "cpu_freq", "cpu_max_freq", "net_util", "net_speed",
            "system_specs", "ram_speed", "is_game_active", "is_game_focused", "gpu_monitor_status",
            # Crash / Hang / Session / Optimization alerts (Features 1, 4, 5)
            "game_crash_alert", "game_hung_alert",
            "session_summary", "session_history",
            "auto_optimization", "perf_advisor_analysis",
            # Vision Telemetry (real-time stream)
            "annotated_frame", "detections", "detections_count", "health",
            "is_low_health", "vision_fps", "capture_fps", "vision_profiling",
            "min_avg_fps", "max_avg_fps", "min_fps", "max_fps", "one_percent_low",
            "frametimes", "cpu_power_w", "scene_type", "scene_confidence", "game_fps", "fps", "game_loading",
            # Gaming Readiness
            "gaming_readiness",
        }

        # Change detection: skip keys whose values haven't changed
        changed = {}
        for k, v in new_state.items():
            if k in BYPASS_KEYS or self._last_broadcast.get(k) != v:
                changed[k] = v
                self._last_broadcast[k] = copy.deepcopy(v)

        if not changed:
            return

        # --- Game-mode throttling ---
        # When a game is running, coalesce non-critical bursts into a 1s window
        # to avoid disrupting GPU/CPU scheduling during gameplay.
        is_game_active = bool(self._state.get("is_game_active", False))
        has_bypass = any(k in BYPASS_KEYS for k in changed)

        if is_game_active and not has_bypass:
            # Accumulate into pending batch
            self._game_pending.update(changed)

            now = _time.monotonic()
            if now - self._game_pending_time >= 1.0:
                # Flush accumulated batch immediately
                self._game_pending_time = now
                batch = self._game_pending
                self._game_pending = {}
                asyncio.run_coroutine_threadsafe(self._broadcast(batch), self.loop)
            else:
                # Schedule a delayed flush if not already scheduled
                if not self._flush_scheduled:
                    self._flush_scheduled = True
                    self._schedule_delayed_flush()
            return

        asyncio.run_coroutine_threadsafe(self._broadcast(changed), self.loop)

    def _schedule_delayed_flush(self):
        """Schedule a delayed flush on the asyncio loop."""
        if self.loop and self.loop.is_running():
            asyncio.run_coroutine_threadsafe(self._delayed_flush(), self.loop)

    async def _delayed_flush(self):
        """Asynchronously wait and then flush any pending game-throttled state updates."""
        await asyncio.sleep(1.0)
        import time
        batch = {}
        if hasattr(self, "_game_pending") and self._game_pending:
            batch = self._game_pending
            self._game_pending = {}
            self._game_pending_time = time.monotonic()
        self._flush_scheduled = False
        
        if batch:
            await self._broadcast(batch)

    def add_log(self, log_entry: Dict[str, Any]):
        """Add a log entry to the state buffer and broadcast it to connected clients."""
        if "logs" not in self._state:
            self._state["logs"] = []
            
        logs = self._state["logs"]
        if logs:
            last_log = logs[-1]
            if last_log.get("msg") == log_entry.get("msg") and last_log.get("time") == log_entry.get("time"):
                return
                
        logs.append(log_entry)
        if len(logs) > 500:
            self._state["logs"] = logs[-500:]
        self.update_state({"logs": self._state["logs"]})

    def clear_logs(self):
        """Clear all buffered logs from the state and notify clients."""
        self._state["logs"] = []
        self._last_broadcast["logs"] = []  # Reset change detection for logs
        self.update_state({"logs": []})

    def should_process_command(self, cmd_type: str, debounce_ms: int = 300) -> bool:
        """
        Check if a command should be processed based on debounce rules.
        Prevents rapid duplicate commands from flooding the backend.
        Commands that should be debounced: request_state, update_config, save_settings
        """
        import time
        now = time.time() * 1000  # Convert to milliseconds
        
        # Commands that benefit from debouncing
        debounce_commands = {'request_state', 'update_config', 'save_settings'}
        if cmd_type not in debounce_commands:
            return True
        
        last_time = self._command_debounce.get(cmd_type, 0)
        if now - last_time < debounce_ms:
            logger.debug("Debounced duplicate command: %s (waited %.0f ms)", cmd_type, now - last_time)
            return False
        
        self._command_debounce[cmd_type] = now
        return True

    async def _broadcast(self, data: Dict[str, Any]):
        """Send data to all connected clients concurrently, handling timeouts and disconnections."""
        if not self.clients:
            return
        message = json.dumps(data)

        async def safe_send(client):
            try:
                # Use a generous timeout so large payloads (like frames) don't drop on busy systems
                await asyncio.wait_for(client.send(message), timeout=3.0)
                return None
            except Exception as e:
                logger.warning("Dropping client due to send failure/timeout: %s", e)
                try:
                    await client.close()
                except Exception:
                    pass
                return client

        # Run all sends concurrently
        results = await asyncio.gather(*(safe_send(c) for c in list(self.clients)), return_exceptions=True)
        
        dead = {r for r in results if r is not None and not isinstance(r, Exception)}
        if dead:
            self.clients -= dead


bridge = BridgeServer()
