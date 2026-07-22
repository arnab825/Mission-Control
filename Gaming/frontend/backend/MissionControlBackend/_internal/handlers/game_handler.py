"""
Game library / scanning handlers.
Commands: get_cached_games, scan_games, launch_game, logout_user, delete_account
"""
import logging
import os
import sys
import threading

logger = logging.getLogger(__name__)

# Module-level thread-safe library session cache
# Imported and shared with main.py via the context dict passed to each handler.
# The lock is owned here so all game-related handlers share the same synchronisation.
import threading as _threading
_lib_lock = _threading.Lock()


def handle_get_cached_games(payload: dict, pipeline, bridge, config, library_session: dict) -> None:
    try:
        from system.game_scanner import GameScanner

        user_id = payload.get("userId") if payload else None
        user_id_str = str(user_id) if user_id else None
        force_refresh = bool(payload.get("forceRefresh")) if payload else False

        # ── Session cache: avoid repeat Supabase round-trips ──────
        with _lib_lock:
            if not force_refresh and user_id_str and user_id_str in library_session:
                cached = library_session[user_id_str]
                logger.debug(
                    "Serving %d games from session cache for user %s (no DB hit)",
                    len(cached), user_id_str,
                )
            else:
                cached = None

        if cached is None:
            sc = GameScanner(config=config, user_id=user_id_str)
            cached = sc.load_cached_games()

            if user_id_str:
                with _lib_lock:
                    library_session[user_id_str] = cached
                logger.info(
                    "Loaded %d games from Supabase for user %s → cached in session",
                    len(cached), user_id_str,
                )

        # Dynamic filtering
        filters = payload.get("filters", {}) if payload else {}

        def apply_filters(games_list):
            if not filters:
                return games_list
            res = list(games_list)
            p_flt = filters.get("platform")
            if p_flt and p_flt != "All":
                res = [g for g in res if g.get("platform") == p_flt]
            g_flt = filters.get("genre")
            if g_flt and g_flt != "All":
                res = [g for g in res if g.get("genre", "").upper() == g_flt.upper()]
            f_flt = filters.get("feature")
            if f_flt and f_flt != "All":
                if f_flt.upper() == "LEGACY":
                    res = [
                        g for g in res
                        if any(f.upper() in ["LEGACY", "PHYSX", "ANSEL"] for f in g.get("features", []))
                        or ("REFLEX" in g.get("features", []) and "DLSS" not in g.get("features", []))
                    ]
                else:
                    res = [g for g in res if any(f.upper() == f_flt.upper() for f in g.get("features", []))]
            t_flt = filters.get("type")
            if t_flt and t_flt != "All":
                if p_flt and p_flt != "All":
                    res = [
                        g for g in res
                        if g.get("type", "").upper() == t_flt.upper()
                        or (g.get("type", "").upper() == "LAUNCHER" and g.get("platform") == p_flt)
                    ]
                else:
                    res = [g for g in res if g.get("type", "").upper() == t_flt.upper()]
            return res

        if force_refresh:
            logger.info("Force-refresh requested for user %s; running definitive scan", user_id_str)
            bridge.update_state({
                "game_library": [],
                "scan_state": {"progress": 0, "status": "Starting scan...", "is_running": True},
            })

            def _do_force_refresh_scan():
                try:
                    sc = GameScanner(config=config, user_id=user_id_str)
                    def on_progress(pct, label):
                        bridge.update_state({"scan_state": {"progress": pct, "status": label, "is_running": True}})

                    games = sc.scan_all(progress_callback=on_progress)
                    logger.info("Force-refresh scan complete: %d titles found for user %s", len(games), user_id_str)
                    if user_id_str:
                        with _lib_lock:
                            library_session[user_id_str] = games
                    if pipeline and hasattr(pipeline, "process_watcher") and pipeline.process_watcher:
                        pipeline.process_watcher.update_game_registry(games)
                    bridge.update_state({
                        "game_library": apply_filters(games),
                        "scan_state": {"progress": 100, "status": "Complete", "is_running": False},
                    })
                except Exception as e:
                    logger.error("Force-refresh scan failed for user %s: %s", user_id_str, e, exc_info=True)
                    bridge.update_state({
                        "game_library": [],
                        "scan_state": {"progress": 0, "status": "Error", "is_running": False},
                    })

            threading.Thread(target=_do_force_refresh_scan, name="ForceRefreshGameScan", daemon=True).start()
            return

        if not cached:
            logger.info("No cached games found — triggering auto-scan for user %s", user_id_str)
            bridge.update_state({
                "game_library": [],
                "scan_state": {"progress": 0, "status": "Starting auto-scan...", "is_running": True},
            })

            def _do_auto_scan():
                try:
                    sc = GameScanner(config=config, user_id=user_id_str)

                    def on_progress(pct, label):
                        bridge.update_state({"scan_state": {"progress": pct, "status": label, "is_running": True}})

                    games = sc.scan_all(progress_callback=on_progress)
                    logger.info("Auto-scan complete: %d titles found for user %s", len(games), user_id_str)
                    if user_id_str:
                        with _lib_lock:
                            library_session[user_id_str] = games
                    if pipeline and hasattr(pipeline, "process_watcher") and pipeline.process_watcher:
                        pipeline.process_watcher.update_game_registry(games)
                    bridge.update_state({
                        "game_library": apply_filters(games),
                        "scan_state": {"progress": 100, "status": "Complete", "is_running": False},
                    })
                except Exception as e:
                    logger.error("Auto-scan failed for user %s: %s", user_id_str, e, exc_info=True)
                    bridge.update_state({
                        "game_library": [],
                        "scan_state": {"progress": 0, "status": "Error", "is_running": False},
                    })

            threading.Thread(target=_do_auto_scan, name="AutoGameScan", daemon=True).start()
        else:
            bridge.update_state({
                "game_library": apply_filters(cached),
                "scan_state": {"progress": 100, "status": "Ready", "is_running": False},
            })

            # Quietly scan in the background once per session to auto-detect additions/removals
            with _lib_lock:
                session_scanned = library_session.get(f"{user_id_str}_scanned", False)
                if not session_scanned:
                    library_session[f"{user_id_str}_scanned"] = True

                    def _do_quiet_background_scan():
                        try:
                            logger.info("Running quiet background scan to auto-sync library changes...")
                            sc = GameScanner(config=config, user_id=user_id_str)
                            games = sc.scan_all()
                            logger.info("Quiet background scan complete: %d titles found", len(games))
                            if user_id_str:
                                with _lib_lock:
                                    library_session[user_id_str] = games
                            if pipeline and hasattr(pipeline, "process_watcher") and pipeline.process_watcher:
                                pipeline.process_watcher.update_game_registry(games)
                            bridge.update_state({
                                "game_library": apply_filters(games),
                            })
                        except Exception as e:
                            logger.error("Quiet background scan failed: %s", e)

                    threading.Thread(target=_do_quiet_background_scan, name="QuietBackgroundGameScan", daemon=True).start()
    except Exception as e:
        logger.error("Failed to load cached games: %s", e, exc_info=True)
        bridge.update_state({"game_library": [], "scan_status": "error"})


def handle_scan_games(payload: dict, pipeline, bridge, config, library_session: dict) -> None:
    def _do_scan():
        try:
            from system.game_scanner import GameScanner

            user_id = payload.get("userId") if payload else None
            sc = GameScanner(config=config, user_id=user_id)
            bridge.update_state({
                "game_library": [],
                "scan_state": {"progress": 0, "status": "Starting scan...", "is_running": True},
            })

            def on_progress(pct, label):
                bridge.update_state({"scan_state": {"progress": pct, "status": label, "is_running": True}})

            games = sc.scan_all(progress_callback=on_progress)
            logger.info("Game scan complete: %s titles found", len(games))

            if user_id:
                with _lib_lock:
                    library_session[str(user_id)] = games
                logger.info("Session cache updated for user %s after full scan", user_id)

            if pipeline and hasattr(pipeline, "process_watcher") and pipeline.process_watcher:
                pipeline.process_watcher.update_game_registry(games)

            bridge.update_state({
                "game_library": games,
                "scan_state": {"progress": 100, "status": "Complete", "is_running": False},
            })
        except Exception as e:
            logger.error("Game scan failed: %s", e, exc_info=True)
            bridge.update_state({
                "game_library": [],
                "scan_state": {"progress": 0, "status": "Error", "is_running": False},
            })

    threading.Thread(target=_do_scan, name="GameScan", daemon=True).start()


def handle_launch_game(payload: dict, pipeline, bridge, config, library_session: dict) -> None:
    exe_path = payload.get("exe_path", "")
    if not exe_path:
        return
    logger.info("Launching game/launcher via Python backend: %s", exe_path)
    try:
        if sys.platform == "win32":
            os.startfile(exe_path)  # type: ignore[attr-defined]
        else:
            import subprocess
            subprocess.Popen(["open"] if sys.platform == "darwin" else ["xdg-open", exe_path])
        bridge.update_state({"launch_status": {"success": True, "error": None}})
    except Exception as e:
        logger.error("Failed to launch via backend: %s", e, exc_info=True)
        bridge.update_state({"launch_status": {"success": False, "error": str(e)}})


def handle_logout_user(payload: dict, pipeline, bridge, config, library_session: dict) -> None:
    user_id = payload.get("userId") if payload else None
    user_id_str = str(user_id) if user_id else ""
    if user_id_str:
        with _lib_lock:
            library_session.pop(user_id_str, None)
        logger.info("Session cache cleared for user %s (logout)", user_id_str)
    bridge.update_state({"game_library": []})


def handle_delete_account(payload: dict, pipeline, bridge, config, library_session: dict) -> None:
    import urllib.request
    import urllib.error

    user_id = payload.get("userId") if payload else None
    if not user_id:
        logger.warning("delete_account called with no userId — ignoring")
        return

    user_id_str = str(user_id)
    logger.info("Account deletion requested for user %s", user_id_str)
    try:
        from system.db_manager import get_db
        from pathlib import Path

        db = get_db()
        if db.available:
            db.delete_games(user_id_str)
            logger.info("Supabase games deleted for user %s", user_id_str)

        safe_user_id = "".join(c for c in user_id_str if c.isalnum() or c in ("-", "_"))
        json_cache = Path(__file__).parent.parent / "config" / f"games_db_{safe_user_id}.json"
        if json_cache.exists():
            json_cache.unlink()
            logger.info("Local JSON cache deleted: %s", json_cache.name)

        with _lib_lock:
            library_session.pop(user_id_str, None)

        clerk_secret = os.getenv("VITE_CLERK_SECRET_KEY")
        if clerk_secret:
            logger.info("Deleting Clerk account for user %s on backend", user_id_str)
            clerk_url = f"https://api.clerk.com/v1/users/{user_id_str}"
            req = urllib.request.Request(
                clerk_url,
                method="DELETE",
                headers={
                    "Authorization": f"Bearer {clerk_secret}",
                    "Content-Type": "application/json",
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/91.0.4472.124 Safari/537.36"
                    ),
                },
            )
            try:
                with urllib.request.urlopen(req, timeout=10) as response:
                    res_body = response.read().decode("utf-8")
                    logger.info("Clerk account deleted successfully: %s", res_body)
            except urllib.error.HTTPError as he:
                err_body = he.read().decode("utf-8")
                logger.error("Clerk API HTTP Error: %s - %s", he.code, err_body)
                raise Exception(f"Clerk user deletion failed: {err_body}")
            except Exception as ce:
                logger.error("Clerk API connection failed: %s", ce, exc_info=True)
                raise Exception(f"Clerk connection failed: {ce}")
        else:
            raise Exception("VITE_CLERK_SECRET_KEY not configured in environment. Please contact support.")

        logger.info("Account data fully purged for user %s", user_id_str)
        bridge.update_state({"game_library": [], "account_deleted": True})

    except Exception as e:
        logger.error("Account deletion failed for user %s: %s", user_id_str, e, exc_info=True)
        bridge.update_state({"account_deleted": False, "account_delete_error": str(e)})
