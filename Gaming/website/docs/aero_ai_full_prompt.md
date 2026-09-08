# Mission Control — Full Improvement & Feature Expansion Prompt

> Paste this entire prompt into Claude Code, Cursor, or any AI coding assistant to implement all improvements and new features for the Mission Control desktop application.

---

## Project Context

**Mission Control** is a Python/PyQt6 desktop application (v1.1.7) for Windows that acts as an AI-powered gaming assistant. It uses:
- **dxCam** for screen capture
- **YOLO + TensorRT** for real-time object detection
- **NVIDIA NIM** (FastPitch / HiFi-GAN) for voice synthesis
- **WMI Telemetry** for hardware monitoring
- **Python UI/backend layers** communicating through Qt signals/slots, worker threads, and local services

The app has 6 navigation sections: Dashboard, Vision, Stability Lab, Agent, Library, System, Settings.

The current version is functional but needs significant UX polish, new features, and several critical fixes. Implement all of the following improvements across the full codebase.

---

## SECTION 1 — UX & ONBOARDING

### 1.1 First-Run Setup Wizard
- Detect if it's the user's first launch (no config file present)
- Show a multi-step modal wizard:
  - Step 1: Welcome screen with Mission Control branding
  - Step 2: GPU detection — auto-detect NVIDIA GPU, show model name and VRAM
  - Step 3: Capture setup — let user select monitor index and test a capture frame
  - Step 4: Game scan — trigger library scan, show progress
  - Step 5: Done — prompt to click "Start Assistant"
- Store `firstRun: false` in config after completion
- Allow skipping all steps

### 1.2 Live Log Streaming on Dashboard
- The Dashboard log area is currently blank with placeholder text
- Wire it to a real log stream from the Python backend via IPC/WebSocket
- Implement color-coded log levels:
  - `[INFO]` — muted green text
  - `[WARN]` — amber text
  - `[ERROR]` — red text with bold prefix
  - `[AGENT]` — cyan/teal text
- Auto-scroll to bottom on new entries
- Add a "Clear Logs" button and a "Copy All" button
- Cap log buffer at 500 lines to prevent memory bloat
- Add a severity filter dropdown (All / Info / Warn / Error / Agent)

### 1.3 Keyboard Shortcut Panel
- Add a `?` icon button in the top bar
- Opens a modal showing all global hotkeys:
  - Toggle HUD overlay
  - Start / Stop pipeline
  - Open/close agent chat
  - Push-to-talk (voice input)
  - One-click game mode
  - Screenshot detection frame
- Make all shortcuts user-configurable (rebindable via click-to-record)
- Store bindings in `config/settings.yaml`

### 1.4 Notification Center
- Add a bell icon (`🔔`) in the top bar with an unread badge count
- Clicking opens a slide-in notification panel from the right
- Notification types: AI Intervention, Thermal Alert, Agent Action, Crash Detected, Update Available
- Each notification shows: icon, title, description, timestamp, dismiss button
- "Clear All" button at the top of the panel
- Persist notifications across the session (clear on app restart)

### 1.5 Collapsible Sidebar
- Add a toggle button at the top of the sidebar (`⟨` / `⟩`)
- Collapsed state: show only icons (40px wide rail)
- Expanded state: full labels (current, 260px wide)
- Animate the transition with a 200ms ease
- Remember state in localStorage

### 1.6 Dark / Light / Auto Theme
- Add theme selector in Settings under a new "Appearance" section
- Options: Dark (current), Light, System (auto)
- Implement a full light mode CSS variable override set
- Store preference in `config/settings.yaml`
- Apply immediately on change without restart

---

## SECTION 2 — HUD & OVERLAY

### 2.1 HUD Layout Editor
- Add a "Configure HUD" button in the Vision section and Settings
- Opens a full-screen canvas editor showing a 1920×1080 preview area
- Draggable widget blocks:
  - FPS Counter
  - Frametime Graph (sparkline)
  - Agent Speech Bubble
  - Detection Box Overlay toggle
  - CPU/GPU/VRAM meters
  - Stability Score badge
  - Clock
- Each widget: drag to position, resize handles, opacity slider, toggle visibility
- "Preview" button overlays the layout on the current screen capture
- Save as named profiles (see 2.2)

### 2.2 Per-Game HUD Profiles
- In the HUD Layout Editor, allow saving the current layout as a named profile
- In Library, each game card shows which HUD profile is assigned
- Dropdown on the game card to assign a profile
- On game detection, auto-load the assigned HUD profile

### 2.3 Opacity & Scale Controls
- In HUD settings: global opacity slider (10%–100%)
- Per-widget scale control (50%–200%)
- "Reset all" button to restore defaults

### 2.4 Agent Speech Bubble Widget
- When the agent generates a tip, warning, or answer, render it as a speech bubble in the HUD overlay
- Bubble fades in over 300ms, displays for 5 seconds (configurable), fades out
- Position configurable in HUD editor
- Supports multi-line text, max 3 lines before truncating with "..."
- Clicking the bubble opens the full Agent panel

### 2.5 FPS + Frametime Graph Widget
- Rolling 60-second sparkline showing FPS history
- Second line (dashed) showing frametime in ms
- Color-coded zones: green (smooth), amber (variable), red (stuttering)
- Configurable width and height in HUD editor

---

## SECTION 3 — VISION PIPELINE

### 3.1 Interactive Region Selector
- In the Vision section, replace manual coordinate input with a drag-to-select region tool
- When activated, dim the screen and show a crosshair cursor
- User clicks and drags to define the capture bounding box
- On release, show the selected region with pixel coordinates
- "Test Capture" button shows a live preview frame from the selected region
- Support named region presets (save/load)

### 3.2 Per-Class YOLO Confidence Sliders
- In Vision settings, after model selection, show a list of all detected class names
- Each class has:
  - A confidence threshold slider (0.1 – 1.0, step 0.05)
  - A color picker for the bounding box color
  - An enable/disable toggle
- Changes apply live without restarting the pipeline
- "Reset to defaults" button per class

### 3.3 Frame Drop Detection & Alerts
- Monitor capture FPS in real time
- If FPS drops >20% below target for more than 2 seconds, show a toast notification
- Toast includes: current FPS, target FPS, and a "Fix suggestions" expandable:
  - Lower capture resolution
  - Reduce active YOLO classes
  - Close high-CPU background processes (list top 3 from WMI)
  - Lower TensorRT batch size

### 3.4 Custom YOLO Model Loader
- In Vision settings, add a "Custom Models" section
- "Import Model" button opens file picker for `.pt` or `.engine` files
- On import:
  - Run a validation pass on a test image
  - Auto-detect class names from the model metadata
  - Show class list for user to label/confirm
- Model appears in the model selector dropdown
- Option to delete custom models

### 3.5 OCR Text Extraction Layer
- Add an optional OCR pipeline stage (after YOLO detection)
- Uses Tesseract or NVIDIA OCR to read text within detected bounding boxes
- Useful for ammo counters, quest names, minimap labels
- Results feed into the Agent context automatically
- Toggle in Vision settings: "Enable OCR extraction"
- Performance warning shown when enabled (estimated FPS cost)

### 3.6 Detection Heatmap (Post-Session)
- After a session ends, generate a heatmap PNG showing where detections were concentrated
- Overlay on a semi-transparent screenshot of the game
- Show in a "Session Report" modal that appears when pipeline stops
- Allow saving the heatmap image to disk

---

## SECTION 4 — AGENT & AI

### 4.1 Agentic Action Confirmation Toast
- Before executing any mouse movement, click, or key press in Agentic Mode:
  - Show a toast in the bottom-right with: action description, a 2-second countdown bar, and an "Undo / Cancel" button
  - If no input within 2 seconds, execute the action
  - If "Cancel" clicked, abort and log `[AGENT] Action cancelled by user`
- Add a setting: "Agentic confirmation delay" (0s = instant, 1s, 2s, 5s)

### 4.2 Agent Action Log Tab
- Add a second tab in the Agent panel: "Action Log"
- Each entry shows:
  - Timestamp
  - Action type (key press, mouse click, system command)
  - Details (which key, coordinates, command name)
  - Status (executed, cancelled, failed)
- "Rollback" button per action where applicable (e.g., re-focus previous window)
- Export log as CSV or JSON

### 4.3 Session Export
- "Export Session" button in Agent panel header
- Exports:
  - Full conversation history (markdown format)
  - Action log (JSON)
  - Session metadata (game, duration, interventions count, avg FPS)
- File named: `aero-session-YYYY-MM-DD-HH-MM.zip`

### 4.4 Per-Game Agent Profiles
- In Library, each game card has an "Agent Profile" dropdown
- Profiles store: assistant mode (Competitive/Story/Hybrid/Agent), system prompt prefix, default voice, agentic mode on/off
- On game detection, automatically load the assigned profile
- Show active profile name in the Agent panel header
- "Create Profile" button opens a profile editor modal

### 4.5 Wake Word Trigger
- Add "Wake Word" toggle in Settings > Agent
- Default wake word: "Hey Aero" (configurable text field)
- Uses the existing audio input stream to detect the phrase via Whisper or keyword spotting
- On detection: activate agent input, play a short activation chime, show visual indicator in HUD
- "Wake sensitivity" slider (low / medium / high)
- Only active when pipeline is running

### 4.6 Agent Memory / Notes System
- Agent maintains a persistent memory file (`agent_memory.json`) per game
- After each session, agent extracts key facts: preferred routes, loadout choices, recurring fail points
- At session start, agent loads relevant memories and references them in context
- "Memory Viewer" in Agent panel: shows all stored memories, allow editing or deleting individual entries
- Toggle: "Enable cross-session memory" in Settings > Agent

### 4.7 Multi-Agent Pipeline Mode
- New setting: "Multi-Agent Mode" (toggle, default off)
- When enabled, spawns 3 specialized sub-agents:
  - **Vision Agent**: handles YOLO detection results, narrates what it sees
  - **Coach Agent**: analyzes decision-making patterns, provides tactical advice
  - **System Agent**: monitors hardware and fires performance interventions
- Each agent has its own message stream, shown in separate tabs in the Agent panel
- Agents communicate via a shared context object passed between them
- Master orchestrator routes user messages to the appropriate agent

### 4.8 Emotion-Aware Coaching Mode
- Monitor gameplay signals for tilt indicators:
  - Rapid successive deaths (>3 in 60 seconds)
  - Unusually fast input cadence (keyboard spam detection via WMI)
  - Session length exceeding user-set fatigue threshold
- On tilt detection:
  - Agent switches to a calmer tone ("I noticed things have been tough — want to take a quick break?")
  - Optionally dim the overlay and show a 5-minute break suggestion
  - Log the tilt event in session report
- Configure sensitivity and response in Settings > Agent > Coaching Behavior

---

## SECTION 5 — STABILITY LAB

### 5.1 One-Click Game Mode Button
- Add a prominent "Game Mode" button on the Dashboard and Stability Lab
- On click, execute in sequence:
  1. Kill non-essential background processes (configurable exclusion list)
  2. Flush standby VRAM (existing functionality)
  3. Set Windows power plan to "High Performance"
  4. Elevate game process priority to "Above Normal"
  5. Disable Windows notifications for the session
- Show a checklist toast as each step completes
- "Undo Game Mode" button appears after activation to reverse all changes

### 5.2 Thermal Alert System
- In Settings > Stability: user-configurable temp thresholds for GPU and CPU
- When threshold exceeded:
  - Show a toast notification with current temp and threshold
  - Log to notification center
  - Optionally: auto-increase fan speed to Max Cooling (with user permission)
  - Optionally: cap FPS via RTSS/in-game settings to reduce heat
- Thermal history chart in Stability Lab showing temps over the session

### 5.3 Per-Session Stability History
- Record stability index, avg FPS, and thermal data per gaming session
- Store in `session_history.json` keyed by game and date
- In Stability Lab, show a "History" tab with:
  - Game selector dropdown
  - Line chart of stability index over time (by session)
  - Best session / worst session callouts

### 5.4 RAM Pressure Warning
- On app start and before pipeline start: check available RAM
- If RAM usage >80%: show a warning banner on Dashboard
- Banner lists top 3 RAM-consuming non-game processes with their usage in MB
- "Clean up" button attempts to clear standby memory and suggests closing named apps

### 5.5 Driver Update Checker
- On app start (max once per day): query NVIDIA API for latest Game Ready Driver version
- Compare to installed driver version via WMI
- If out of date: show a notification in the notification center
- Notification includes version numbers and a "Download" button linking to NVIDIA's page
- Can be disabled in Settings > System

### 5.6 Crash Report Analyzer
- After an unexpected game close / crash is detected:
  - Parse Windows Event Viewer logs for related error entries
  - Parse NVIDIA crash dump if present (`%localappdata%\NVIDIA`)
  - Generate a plain-English summary: "Game crashed due to GPU memory overflow. Consider lowering texture quality or VRAM headroom."
- Show in a "Crash Report" modal with:
  - Crash timestamp
  - Likely cause (categorized: GPU, CPU, RAM, game bug, driver)
  - Suggested fixes
  - Raw log excerpt (collapsible)
- Store crash reports in `crash_history.json`

### 5.7 Power Plan Scheduler
- Add setting: "Auto power plan switching" (toggle)
- On game process detection: switch to High Performance
- On game close: revert to previous power plan
- Show current active power plan in the System panel header

---

## SECTION 6 — GAME LIBRARY

### 6.1 Cover Art Fetching
- On game scan, for each detected game:
  - Query SteamGridDB API (requires user API key in Settings > Library) by game name
  - Fallback to IGDB if SteamGridDB returns nothing
  - Cache artwork locally in `%appdata%/MissionControl/artwork/`
- Display full cover art in the library card (replacing initials placeholder)
- Add an "Edit Art" button to manually upload or replace art

### 6.2 Optimization Summary Card
- After clicking "Optimize" on a game card:
  - Show a modal with a before/after table:
    - DLSS Mode: Off → Quality
    - Reflex: Off → Enabled + Boost
    - RTX: Low → Ultra
    - Estimated FPS: 54 → 72 (+33%)
  - "Apply" and "Revert" buttons
  - "Auto-apply on next launch" checkbox

### 6.3 Session Stats Per Game
- Track per game: total play time, number of sessions, avg FPS, AI interventions count, crash count
- Show on library card as a compact stats row below the tag badges:
  - `⏱ 14h 23m  📈 87 avg FPS  🤖 42 assists`
- Clicking opens a full stats modal with charts

### 6.4 Favorite / Pin Games
- Star icon on each game card to pin it
- Pinned games sort to the top of the library
- Pinned games also appear in a "Quick Launch" section on the Dashboard

### 6.5 Launch Game from App
- "Launch" button on each game card (next to "Optimize")
- Detects the game's executable path (from Steam/Epic manifest)
- Launches the game process and simultaneously starts the Mission Control pipeline
- Shows a "Launching..." spinner with live pipeline startup logs

### 6.6 Game-Specific NVIDIA Tips
- For each detected game, fetch NVIDIA Game Ready release notes (scrape or API)
- Show a "NVIDIA Tips" section in the game card modal:
  - Recommended DLSS preset
  - RTX feature highlights
  - Known driver fixes for this title

---

## SECTION 7 — SETTINGS

### 7.1 Settings Search Bar
- Add a search input at the top of the Settings page
- Filters visible settings sections/options in real time as user types
- Highlights matching labels
- "No results" state with a suggestion to check spelling

### 7.2 Import / Export Configuration
- "Export Config" button: saves full `config/settings.yaml` to a user-chosen path
- "Import Config" button: opens file picker, validates JSON schema, applies settings
- On import: show a diff of what changed before confirming
- Version compatibility check (warn if config from older version)

### 7.3 Per-Section Reset to Defaults
- Each settings section (Screen Capture, Processing Pipeline, Agent, etc.) has a "Reset section" button
- Only resets that section's keys in `config/settings.yaml`
- Confirmation dialog before reset

### 7.4 Named Config Profiles
- Profile selector dropdown at the top of Settings
- Built-in profiles: Competitive (low latency, minimal HUD), Streaming (quality DLSS, detailed HUD), Casual (balanced)
- "Save current as profile" button — name + save
- "Delete profile" option
- Profiles stored in `profiles/` directory

### 7.5 Startup Behavior Options
- New "Startup" section in Settings:
  - "Launch on Windows startup" toggle (writes registry key)
  - "Start minimized to tray" toggle
  - "Auto-start pipeline on game detection" toggle
  - "Show splash screen on launch" toggle

---

## SECTION 8 — BOLD / FUTURE FEATURES

### 8.1 Replay Analyzer
- Record a rolling 90-second video buffer of the capture stream (compressed, GPU-accelerated)
- On notable event detection (kill, death, crash, FPS spike >50%):
  - Save the clip to `%appdata%/MissionControl/clips/`
  - Log the event type and timestamp
- Built-in clip viewer in a new "Replays" section:
  - Thumbnail grid of saved clips
  - Playback with AI annotation overlay (bounding boxes, event label, agent comment)
  - Export clip as MP4

### 8.2 Community Benchmark Compare
- After each session, compute a performance score: weighted average of FPS, stability index, and thermal efficiency
- Send anonymized score + GPU model to a cloud leaderboard API (opt-in only)
- Show "Your Score vs. Community" comparison card:
  - Percentile rank for your GPU tier
  - Top optimization tip from top performers with same GPU
- Toggle in Settings > Privacy

### 8.3 Co-Pilot Share Mode
- "Share Session" button in Agent panel
- Generates a time-limited share code (e.g. `AERO-X7K2`)
- Remote viewer enters code in their Mission Control instance and sees:
  - Live HUD data (FPS, stability, agent messages)
  - Read-only agent chat feed
  - No screen capture content (privacy)
- Viewer can send text suggestions that appear as "[Co-Pilot]: ..." in the agent chat

### 8.4 Twitch / OBS Stream Overlay Export
- "Stream Overlay" section in Settings
- Generates a localhost browser source URL (e.g. `http://localhost:9142/overlay`)
- OBS/Streamlabs users add it as a browser source
- Overlay shows: current FPS, AI intervention badge, stability score, active agent mode
- Customizable layout and theme (dark/light, accent color)
- Updates in real time via WebSocket

### 8.5 AI Playstyle Analyzer
- After 5+ sessions on a game, unlock "Playstyle Report" in the Library game modal
- Report includes (AI-generated from session data):
  - Aggression Index (passive / balanced / aggressive)
  - Map coverage heatmap (if positional data is available)
  - Reaction time distribution (average, median, fastest)
  - Top 3 personalized improvement tips
  - Playstyle archetype label (e.g. "Tactical Anchor", "Aggressive Fragger")
- Shareable as a PNG card

### 8.6 Mobile Companion App (React Native)
- Separate React Native app (iOS + Android) that connects to the desktop app via local WebSocket
- Features:
  - Live stats dashboard (FPS, GPU temp, stability)
  - Agent chat interface (send messages to the desktop agent)
  - Push notifications for thermal alerts and crashes
  - Session history viewer
- Authentication via local network — no cloud required
- Setup: show QR code in desktop app Settings > Mobile to connect

### 8.7 Plugin / Mod Marketplace
- New "Extensions" section in navigation
- Extension types:
  - YOLO Models (`.engine` / `.pt`)
  - Agent Personas (custom system prompts + voice config)
  - HUD Themes (CSS overrides + widget layouts)
  - Stability Scripts (custom WMI queries + interventions)
- Extensions stored in `%appdata%/MissionControl/extensions/`
- Marketplace tab: curated list of community extensions (fetched from GitHub releases or a JSON manifest URL)
- "Install", "Update", "Remove" per extension

### 8.8 LAN Tournament Mode
- "Tournament Mode" toggle in Settings (requires LAN connection)
- Discovers other Mission Control instances on the LAN via mDNS
- Features:
  - Unified performance dashboard showing all connected PCs
  - Shared agent briefings broadcast to all players
  - Team-wide thermal and stability alerts
  - Session coordinator can start/stop pipelines on all machines simultaneously
- Use case: LAN parties, esports practice rooms, coaching setups

---

## Implementation Notes

### Technology Stack (assumed)
- **UI**: PyQt6 desktop interface with Qt Widgets and custom overlay rendering
- **Backend**: Python services and worker threads communicating with the UI via Qt signals/slots and local sockets where needed
- **Vision**: YOLOv8 + TensorRT + dxCam
- **AI**: NVIDIA NIM API (LLM + TTS)
- **System**: WMI (Python `wmi` library), `psutil`, Windows registry via `winreg`

### Architecture Guidelines
- All new features must be gated behind their own toggle in Settings — nothing forced on by default
- Follow existing Qt signal naming — snake_case method names on worker threads, e.g. `log_received`, `pipeline_started`
- All persistent data stored in `%appdata%/MissionControl/` with clear subdirectory structure
- New Python modules should be added to the existing app modules (`ai_brain/`, `vision/`, `system/`, `voice/`, `capture/`, or `overlay/`) with UI wiring in `ui/`
- All UI components use the existing dark theme CSS variables — no hardcoded colors
- Error states must be handled for every network/WMI/file call — show user-friendly messages
- Performance: any new background process must be profiled to add <2% CPU overhead

### Overlay Rendering Notes
- Overlay rendering is Windows-specific and uses `overlay_window.py`
- `overlay_window.py` uses `WS_EX_LAYERED` + `WS_EX_TRANSPARENT` for click-through behavior
- Never call Qt UI methods from background threads — always emit signals to the UI thread
- `dxCam` frames must be `.copy()`'d before passing them to OCR or heatmap workers
- `agent_memory.json` path: `%appdata%/MissionControl/memory/<game_name>.json`

### File Structure for New Features
```
ai_brain/
  decision_maker.py
  memory.py
  story_analyzer.py
capture/
  frame_buffer.py
  screen.py
control/
  commands.py
  handler.py
  input_manager.py
data/
  session_memory.json
nvidia/
  capabilities.py
  gpu_monitor.py
  perf_advisor.py
overlay/
  overlay_window.py
scripts/
  bump_version.py
  export_tensorrt.py
system/
  game_scanner.py
  hw_checker.py
  optimizer.py
ui/
  agent_page.py
  desktop_app.py
  games_page.py
  lab_page.py
  main_window.py
  pipeline_thread.py
  settings_page.py
  system_page.py
  updater.py
vision/
  ocr_reader.py
  scene_classifier.py
  simple_rules.py
  trt_inference.py
  yolo_detector.py
voice/
  voice_manager.py
```

### Priority Order for Implementation
1. Live log streaming (Dashboard)
2. One-click Game Mode button
3. Agentic action confirmation toast
4. Cover art fetching (Library)
5. First-run setup wizard
6. HUD layout editor
7. Per-game agent profiles
8. Interactive region selector (Vision)
9. Thermal alert system
10. Wake word trigger
11. Agent memory system
12. Crash report analyzer
13. Replay analyzer
14. Stream overlay export
15. Plugin marketplace
16. All remaining bold features

---

*Generated for Mission Control v1.1.7 — May 2026*
