"""
Chat / conversation handlers.
Commands: execute, create_chat_session, get_chat_sessions, get_chat_history,
          get_session_history, delete_chat_session, clear_chat_sessions,
          rename_chat_session, suggest_session_title, migrate_local_history
"""
import logging
import threading

logger = logging.getLogger(__name__)


def handle_execute(payload: dict, pipeline, bridge, config) -> None:
    directive = payload.get("input", "")
    session_id = payload.get("sessionId") or "default"
    user_id = payload.get("userId", "guest")
    if pipeline:
        pipeline.active_chat_session_id = session_id
        bridge.update_state({"active_chat_session_id": session_id})
        
        # Register user activity / cancellation of welcome message for this session
        if not hasattr(pipeline, "_welcome_cancelled_sessions"):
            pipeline._welcome_cancelled_sessions = set()
        pipeline._welcome_cancelled_sessions.add(session_id)

    if not directive:
        return
    logger.info("Frontend Directive: %s", directive)
    if pipeline and pipeline.memory:
        pipeline.memory.create_chat_session(session_id, "New Chat", user_id=user_id)
        pipeline.memory.add_chat_message(session_id, "user", directive, user_id=user_id)

    # Small yield so the frontend's optimistic setConversations() call (which adds the
    # user bubble + thinking bubble immediately on submit) has time to render before the
    # agent_response state update triggers the thinking-bubble logic in the frontend effect.
    import time as _time
    _time.sleep(0.05)
    bridge.update_state({"agent_response": f"Processing: {directive}..."})

    def _do_execute():
        generator = pipeline.handle_directive_stream(directive, user_id=user_id)
        full_response = ""

        # ── Token broadcast throttling ──────────────────────────────────────────
        # Sending every individual token as a separate WebSocket message causes
        # hundreds of near-simultaneous React re-renders (agent_response is a
        # CRITICAL_KEY that bypasses all throttling in useBridge).  Instead we
        # accumulate tokens for up to BATCH_MS milliseconds and then flush the
        # accumulated text as a single broadcast.  This cuts WS messages from
        # ~200+ per response down to ~20-30 with zero perceptible latency change.
        BATCH_MS = 80  # ms between progressive frontend updates
        last_flush = _time.monotonic()

        for chunk in generator:
            full_response += chunk
            now = _time.monotonic()
            if (now - last_flush) * 1000 >= BATCH_MS:
                bridge.update_state({"agent_response": full_response})
                last_flush = now

        # Final flush — ensure the complete response is always sent
        bridge.update_state({"agent_response": full_response})
            
        if pipeline and pipeline.memory:
            pipeline.memory.add_chat_message(session_id, "agent", full_response, user_id=user_id)
        if "🎮 **Agentic Launcher**" in full_response:
            bridge.update_state({
                "agent_response": full_response,
                "launch_status": {"success": True, "game_name": "Application", "trigger": "agent"}
            })
        else:
            bridge.update_state({"agent_response": full_response})
        # Speak the response via TTS only if the user is in an active voice session (is_listening)
        # OR chat TTS is explicitly unmuted. This prevents ghost voice during typed-chat sessions.
        try:
            vm = pipeline.voice_manager if pipeline and hasattr(pipeline, "voice_manager") else None
            if vm and vm.enabled and not vm.chat_tts_muted and vm.is_listening:
                vm.speak(full_response)
        except Exception as e:
            logger.debug("TTS speak failed after execute: %s", e)

    threading.Thread(target=_do_execute, name="AIDirective", daemon=True).start()


def handle_migrate_local_history(payload: dict, pipeline, bridge, config) -> None:
    user_id = payload.get("userId", "guest")
    sessions = payload.get("sessions", [])
    conversations = payload.get("conversations", {})
    if not (pipeline and pipeline.memory):
        return
    logger.info("Migrating local history for user_id=%s, sessions_count=%d", user_id, len(sessions))
    for s in sessions:
        sid = s.get("id")
        title = s.get("title", "New Session")
        pipeline.memory.create_chat_session(sid, title, user_id=user_id)
        existing = pipeline.memory.get_chat_history(sid)
        if not existing:
            for m in conversations.get(sid, []):
                role = m.get("role")
                content = m.get("text") or m.get("content") or ""
                pipeline.memory.add_chat_message(sid, role, content, user_id=user_id)
    new_sessions = pipeline.memory.get_chat_sessions(user_id=user_id)
    bridge.update_state({"chat_sessions": new_sessions})


def handle_get_chat_sessions(payload: dict, pipeline, bridge, config) -> None:
    user_id = payload.get("userId", "guest")
    if pipeline and pipeline.memory:
        sessions = pipeline.memory.get_chat_sessions(user_id=user_id)
        bridge.update_state({"chat_sessions": sessions})


def handle_get_chat_history(payload: dict, pipeline, bridge, config) -> None:
    session_id = payload.get("sessionId")
    is_background = payload.get("isBackground", False)
    if pipeline and not is_background:
        pipeline.active_chat_session_id = session_id
        bridge.update_state({"active_chat_session_id": session_id})
    if session_id and pipeline and pipeline.memory:
        history = pipeline.memory.get_chat_history(session_id)
        bridge.update_state({"chat_history": {"sessionId": session_id, "messages": history}})


def handle_get_session_history(payload: dict, pipeline, bridge, config) -> None:
    user_id = payload.get("userId", "guest")
    if pipeline and pipeline.memory:
        history = pipeline.memory.get_game_sessions(user_id=user_id)
        bridge.update_state({"session_history": history})


def handle_create_chat_session(payload: dict, pipeline, bridge, config) -> None:
    session_id = payload.get("sessionId")
    title = payload.get("title", "New Chat")
    user_id = payload.get("userId", "guest")
    skip_welcome = payload.get("skipWelcome", False)
    if pipeline:
        pipeline.active_chat_session_id = session_id
        bridge.update_state({"active_chat_session_id": session_id})
    if not (session_id and pipeline and pipeline.memory):
        return

    pipeline.memory.create_chat_session(session_id, title, user_id=user_id)
    sessions = pipeline.memory.get_chat_sessions(user_id=user_id)
    bridge.update_state({"chat_sessions": sessions})

    if skip_welcome:
        logger.info("Session %s created. Skipping welcome message generation as requested.", session_id)
        return

    # Check if session already has messages to prevent duplicate welcome message generation
    history = pipeline.memory.get_chat_history(session_id)
    if history:
        logger.info("Session %s already has messages. Skipping welcome message generation.", session_id)
        bridge.update_state({"chat_history": {"sessionId": session_id, "messages": history}})
        return

    # Prevent concurrent welcome message generation for the same session
    if not hasattr(pipeline, "_generating_welcome_sessions"):
        pipeline._generating_welcome_sessions = set()
    if session_id in pipeline._generating_welcome_sessions:
        logger.info("Welcome message generation already in progress for session %s. Skipping.", session_id)
        return
    pipeline._generating_welcome_sessions.add(session_id)

    def _generate_welcome():
        try:
            # Clear cancelled flag if starting a new welcome generation
            if hasattr(pipeline, "_welcome_cancelled_sessions"):
                pipeline._welcome_cancelled_sessions.discard(session_id)

            # Instantly tell the frontend to show the "Thinking" animation
            bridge.update_state({"agent_response": "Processing: Establishing neural link..."})

            agent_cfg = config.get("ai_agent", {}) if config else {}
            personality_key = agent_cfg.get("personality", "tactical")
            prompts = agent_cfg.get("prompts", {})
            welcome_prompt_raw = prompts.get("welcome_prompt")
            if welcome_prompt_raw:
                import re
                welcome_prompt = re.sub(r'\bfriendly\b', personality_key, welcome_prompt_raw, flags=re.IGNORECASE)
            else:
                welcome_prompt = (
                    f"Greet the user as their AI Gaming Assistant. Give a very brief welcome message matching your {personality_key} personality style. "
                    f"Explain that you can monitor their gameplay, provide tactical advice, and optimize their system. "
                    f"Ask how you can assist them today."
                )

            welcome_msg = None
            if pipeline and hasattr(pipeline, "brain") and pipeline.brain:
                state_snapshot = {}
                if hasattr(pipeline, "_state_lock") and pipeline._state_lock:
                    with pipeline._state_lock:
                        state_snapshot = dict(pipeline._game_state)

                # Stream the welcome message so the user sees words appear immediately
                # instead of waiting for the entire response to be generated.
                try:
                    import time as _time
                    stream_gen = pipeline.brain.reply_to_prompt_stream(
                        welcome_prompt, game_state=state_snapshot,
                        user_id=user_id, session_id=session_id,
                        agentic_mode_active=pipeline.agentic_mode_active
                    )
                    accumulated = ""
                    BATCH_MS = 80
                    last_flush = _time.monotonic()
                    for chunk in stream_gen:
                        if hasattr(pipeline, "_welcome_cancelled_sessions") and session_id in pipeline._welcome_cancelled_sessions:
                            logger.info("Aborting welcome message for session %s due to user activity.", session_id)
                            return
                        accumulated += chunk
                        now = _time.monotonic()
                        if (now - last_flush) * 1000 >= BATCH_MS:
                            bridge.update_state({"agent_response": accumulated})
                            last_flush = now
                    if accumulated:
                        bridge.update_state({"agent_response": accumulated})
                        welcome_msg = accumulated
                except Exception as stream_err:
                    logger.warning("Welcome stream failed, falling back to blocking call: %s", stream_err)
                    if hasattr(pipeline, "_welcome_cancelled_sessions") and session_id in pipeline._welcome_cancelled_sessions:
                        logger.info("Aborting welcome fallback for session %s due to user activity.", session_id)
                        return
                    welcome_msg = pipeline.brain.reply_to_prompt(
                        welcome_prompt, game_state=state_snapshot, user_id=user_id,
                        session_id=session_id, agentic_mode_active=pipeline.agentic_mode_active
                    )

            if hasattr(pipeline, "_welcome_cancelled_sessions") and session_id in pipeline._welcome_cancelled_sessions:
                logger.info("Aborting final save for welcome message in session %s due to user activity.", session_id)
                return

            if not welcome_msg:
                welcome_fallbacks = {
                    "tactical": "Neural Link established. Tactical mode is active. I am your Tactical Gaming Assistant, powered by local intelligence. Ready to monitor specs and optimize system parameters.",
                    "friendly": "Hey there! Ready to get gaming? I'm your friendly gaming assistant, running locally. I can help monitor your system and optimize your setup!",
                    "immersive": "Portal opened. Core intelligence initialized in local grid space. Monitoring structural metrics and active nodes.",
                    "sarcastic": "Great, another chat session. Sarcastic assistant loaded. I'll be monitoring your metrics, try not to break anything.",
                    "aggressive": "SYSTEMS ARMED. Local gaming coach is online. Let's optimize this hardware and win some games!"
                }
                welcome_msg = prompts.get("welcome_fallback", welcome_fallbacks.get(personality_key, welcome_fallbacks["tactical"]))
                bridge.update_state({"agent_response": welcome_msg})

            pipeline.memory.add_chat_message(session_id, "agent", welcome_msg)
            history = pipeline.memory.get_chat_history(session_id)

            # Push final history snapshot so the session is fully persisted on the frontend
            bridge.update_state({
                "agent_response": welcome_msg,
                "chat_history": {"sessionId": session_id, "messages": history}
            })
        except Exception as e:
            logger.error("Failed to generate welcome message: %s", e, exc_info=True)
        finally:
            pipeline._generating_welcome_sessions.discard(session_id)

    threading.Thread(target=_generate_welcome, name="AIWelcome", daemon=True).start()


def handle_delete_chat_session(payload: dict, pipeline, bridge, config) -> None:
    session_id = payload.get("sessionId")
    user_id = payload.get("userId", "guest")
    if session_id and pipeline and pipeline.memory:
        pipeline.memory.delete_chat_session(session_id, user_id=user_id)
        sessions = pipeline.memory.get_chat_sessions(user_id=user_id)
        if getattr(pipeline, "active_chat_session_id", None) == session_id:
            next_session = sessions[0]["id"] if sessions else ""
            pipeline.active_chat_session_id = next_session
            bridge.update_state({
                "chat_sessions": sessions,
                "active_chat_session_id": next_session
            })
        else:
            bridge.update_state({"chat_sessions": sessions})


def handle_clear_chat_sessions(payload: dict, pipeline, bridge, config) -> None:
    user_id = payload.get("userId", "guest")
    if pipeline and pipeline.memory:
        pipeline.memory.clear_all_chat_sessions(user_id=user_id)
        sessions = pipeline.memory.get_chat_sessions(user_id=user_id)
        if pipeline:
            pipeline.active_chat_session_id = ""
        bridge.update_state({
            "chat_sessions": sessions,
            "active_chat_session_id": ""
        })


def handle_rename_chat_session(payload: dict, pipeline, bridge, config) -> None:
    session_id = payload.get("sessionId")
    title = payload.get("title")
    user_id = payload.get("userId", "guest")
    if session_id and title and pipeline and pipeline.memory:
        pipeline.memory.update_chat_session_title(session_id, title, user_id=user_id)
        sessions = pipeline.memory.get_chat_sessions(user_id=user_id)
        bridge.update_state({"chat_sessions": sessions})


def handle_suggest_session_title(payload: dict, pipeline, bridge, config) -> None:
    conversation = payload.get("conversation", "")
    session_id = payload.get("sessionId", "")
    if not (conversation and session_id):
        return

    def _do_suggest_title():
        try:
            agent_cfg = config.get("ai_agent", {}) if config else {}
            prompts = agent_cfg.get("prompts", {})
            prompt_template = prompts.get("session_title_prompt", (
                "You are a session titling AI. Generate a concise, extremely short title (maximum 3 words) "
                "summarizing the following conversation. Do not include markdown, do not include quotes, "
                "do not include punctuation, and do not write 'Session' or 'Optimization'. Just return the title.\n"
                "Conversation:\n{conversation}"
            ))
            
            # Format the conversation in safely
            prompt = prompt_template.replace("{conversation}", conversation)
            
            suggested = None
            if pipeline and hasattr(pipeline, "brain") and pipeline.brain:
                suggested = pipeline.brain._query_nvidia_nim(prompt)
            if not suggested:
                words = [
                    w for w in conversation
                    .replace("User:", "").replace("Agent:", "").replace("🎙️", "").split()
                    if len(w) > 2
                ]
                suggested = " ".join(words[:3]).upper()
            if suggested:
                suggested = suggested.strip().replace('"', "").replace("'", "").replace("*", "")
                for word in ["Title:", "Title -", "Session title:", "Session Title:", "title:", "Title", "TITLE:"]:
                    if suggested.startswith(word):
                        suggested = suggested[len(word):].strip()
                suggested = suggested[:30].strip().upper()
                logger.info("AI Suggested Session Title for %s: %s", session_id, suggested)
                bridge.update_state({"suggested_session_title": {"id": session_id, "title": suggested}})
        except Exception as e:
            logger.error("Failed to suggest session title: %s", e, exc_info=True)

    threading.Thread(target=_do_suggest_title, name="AISuggestTitle", daemon=True).start()


def handle_retry_message(payload: dict, pipeline, bridge, config) -> None:
    text = payload.get("text", "")
    old_text = payload.get("oldText", "")
    session_id = payload.get("sessionId") or "default"
    user_id = payload.get("userId", "guest")
    message_id = payload.get("messageId")

    if pipeline:
        pipeline.active_chat_session_id = session_id
        bridge.update_state({"active_chat_session_id": session_id})
    if not text:
        return
    logger.info("Retry Message Request: '%s' (replacing: '%s', ID: %s)", text, old_text, message_id)
    
    if pipeline and pipeline.memory:
        try:
            # 1. Resolve target message ID for truncation
            target_id = None
            if isinstance(message_id, int):
                target_id = message_id
            elif isinstance(message_id, str) and message_id.isdigit():
                target_id = int(message_id)
                
            # If no database ID is available, match by original content
            if target_id is None and old_text:
                target_id = pipeline.memory.find_message_id_by_content(session_id, "user", old_text)
                
            # 2. Perform database truncation from the target message onwards
            if target_id is not None:
                pipeline.memory.delete_messages_from_id(session_id, target_id)
            else:
                logger.warning("Could not resolve database ID for retry. Appending instead.")
                
            # 3. Add the new user message to the database
            pipeline.memory.create_chat_session(session_id, "New Chat", user_id=user_id)
            pipeline.memory.add_chat_message(session_id, "user", text, user_id=user_id)
        except Exception as e:
            logger.error("Failed to truncate chat history on retry: %s", e)

    bridge.update_state({"agent_response": f"Processing: {text}..."})

    def _do_execute_retry():
        response = pipeline.handle_directive(text, user_id=user_id)
        if pipeline and pipeline.memory:
            pipeline.memory.add_chat_message(session_id, "agent", response, user_id=user_id)
        if "🎮 **Agentic Launcher**" in response:
            bridge.update_state({
                "agent_response": response,
                "launch_status": {"success": True, "game_name": "Application", "trigger": "agent"}
            })
        else:
            bridge.update_state({"agent_response": response})

    threading.Thread(target=_do_execute_retry, name="AIDirectiveRetry", daemon=True).start()

def handle_submit_feedback(payload: dict, pipeline, bridge, config) -> None:
    if not pipeline or not pipeline.memory:
        return
        
    session_id = payload.get("sessionId")
    user_id = payload.get("userId", "guest")
    is_helpful = payload.get("isHelpful", True)
    reason = payload.get("reason", "")
    message_text = payload.get("messageText", "")
    
    # Try to find the prompt that led to this response (the last user message before this agent response)
    # For a lightweight approach, we'll just capture the response_text. We could fetch the history to get the prompt.
    prompt_text = "Unknown User Prompt"
    if session_id:
        history = pipeline.memory.get_chat_history(session_id)
        # Assuming the message_text is in the history, find it and the preceding user message
        for i, msg in enumerate(history):
            # Check if this agent message matches the feedback target
            if msg["role"] == "agent" and message_text.strip()[:100] in msg["content"].strip():
                # Find the closest preceding user message
                for j in range(i - 1, -1, -1):
                    if history[j]["role"] == "user":
                        prompt_text = history[j]["content"]
                        break
                break

    # Get game metadata if a game is active
    game_metadata = ""
    with pipeline._state_lock:
        if pipeline._game_state.get("is_game_active") and pipeline._game_state.get("game_info"):
            game_metadata = pipeline._game_state["game_info"].get("name", "")

    pipeline.memory.record_user_feedback(
        session_id=session_id,
        user_id=user_id,
        prompt_text=prompt_text,
        response_text=message_text,
        is_helpful=is_helpful,
        reason=reason,
        game_metadata=game_metadata
    )
    logger.info(f"User feedback logged for session {session_id}. Helpful: {is_helpful}, Reason: {reason}")
