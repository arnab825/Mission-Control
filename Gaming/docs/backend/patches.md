# 📜 Patch History

This document contains a detailed history of all patches and updates for the AI Gaming Assistant.

### Patch: 2026-07-24 — v2.3.8: Removed Preview button completely

- Removed Preview button completely

### Patch: 2026-07-24 — v2.3.8: Removed Preview button completely

- Removed Preview button completely

### Patch: 2026-07-24 — v2.3.8: Removed Preview button

- Removed Preview button

### Patch: 2026-07-24 — v2.3.8: Fix GameCard direct execution button and GamePreviewModal banner scaling

- Restore primary Execute button on GameCard for direct game launch
- Fix GamePreviewModal banner image object-contain scaling for launcher SVGs
- Verify Ultralytics YOLO vision dependencies

### Patch: 2026-07-24 — v2.3.7: Fix Game Preview modal responsive layout and component typing

- Fix Game Preview modal height overflow, vertical scrolling, and fluid typography
- Add onPreview handler to GameCard prop types and restore isLauncher logic

### Patch: 2026-07-23 — v2.3.6: Release v2.3.6

- Version sync fix

### Patch: 2026-07-23 — v2.3.6: Fix WebSocket bridge connection deadlock, process lock race condition, and .env search path priority

- Fix WebSocket bridge connection deadlock when broadcasting telemetry and Vision frames
- Fix process lock file race condition on Windows startup
- Fix .env search path priority and multi-file cascade loading
- Fix Windows Settings Installed Apps display name and appId registration

### Patch: 2026-07-23 — v2.3.5: Fix production backend synchronization deadlock

- Fix production backend synchronization deadlock
- Verify Vercel cron secret headers

### Patch: 2026-07-23 — v2.3.4: Fix production backend self-elevation exit loop and ASAR file streaming

- Fix production backend self-elevation exit loop and ASAR file streaming

### Patch: 2026-07-23 — v2.3.3: Fix ASAR static file streaming in packaged production builds

- Fix ASAR static file streaming in packaged production builds

### Patch: 2026-07-23 — v2.3.2: Fix production black screen and GPU compositor rendering

- Fix production black screen and GPU compositor rendering

### Patch: 2026-07-22 — v2.1.7: Route all Windows installer downloads dynamically through resolver API

- Route all Windows installer downloads dynamically through resolver API

### Patch: 2026-07-22 — v2.1.6: Fix Agent page infinite re-render loop and black screen issue

- Fix Agent page infinite re-render loop and black screen issue

### Patch: 2026-07-22 — v2.1.5: Fix Mermaid render errors, add dynamic portable ZIP resolver, AI weights docs, and Winget Python installer

- Fix Mermaid render errors, add dynamic portable ZIP resolver, AI weights docs, and Winget Python installer

### Patch: 2026-07-22 — v2.1.4: Fixed automatic loading of Release Highlights on Updates page mount

- Fixed automatic loading of Release Highlights on Updates page mount

### Patch: 2026-07-22 — v2.1.3: Added On-Demand AI Models & Weights Downloader with download icons, real-time progress bars, and streaming backend

- Added On-Demand AI Models & Weights Downloader with download icons, real-time progress bars, and streaming backend

### Patch: 2026-07-22 — v2.1.2: Added real-time percentage progress bar and output streaming to 1-click YOLO vision engine installer

- Added real-time percentage progress bar and output streaming to 1-click YOLO vision engine installer

### Patch: 2026-07-22 — v2.1.1: Added --system flag to uv installer and prioritized system Python for 1-click YOLO vision engine installation

- Added --system flag to uv installer and prioritized system Python for 1-click YOLO vision engine installation

### Patch: 2026-07-22 — v2.1.0: Fixed 1-Click YOLO Vision Engine installer for standalone desktop release

- Fixed 1-Click YOLO Vision Engine installer for standalone desktop release
- Optimized Vision Command Center telemetry layout into clean right sidebar
- Prevented Dashboard CPU temperature text truncation on wide displays
- Updated release process documentation

### Patch: 2026-07-21 — v2.0.9: Support multi-line bullet points in publish.ps1 via semicolons, newlines, or multiple arguments

- Support multi-line bullet points in publish.ps1 via semicolons, newlines, or multiple arguments

### Patch: 2026-07-21 — v2.0.8: Auto-restore local build-stamped files in run_local.ps1 to keep Git working tree clean

- Auto-restore local build-stamped files in run_local.ps1 to keep Git working tree clean

### Patch: 2026-07-21 — v2.0.7: Remove chassis TGP tag from System and Settings pages

- Remove chassis TGP tag from System and Settings pages

### Patch: 2026-07-21 — v2.0.6: Suppress terminal window popups during GPU power limit application on Windows

- Suppress terminal window popups during GPU power limit application on Windows

### Patch: 2026-07-21 — v2.0.5: Add power_limit, power_limit_watts, and power_limit_max_watts aliases across telemetry pipeline

- Add power_limit, power_limit_watts, and power_limit_max_watts aliases across telemetry pipeline

### Patch: 2026-07-21 — v2.0.4: Map GPU max hardware TGP constraints directly into LabPage Power Target UI and telemetry

- Map GPU max hardware TGP constraints directly into LabPage Power Target UI and telemetry

### Patch: 2026-07-21 — v2.0.3: Unlock hardware max TGP ceiling for GPU power limits in Boost Mode and Optimization Mode

- Unlock hardware max TGP ceiling for GPU power limits in Boost Mode and Optimization Mode

### Patch: 2026-07-21 — v2.0.2: Fix update pause/resume cancellation flow and prevent trailing progress override

- Fix update pause/resume cancellation flow and prevent trailing progress override

### Patch: 2026-07-21 — v2.0.1: Add 1-Click in-app installer for optional PyTorch and Ultralytics vision engines

- Add 1-Click in-app installer for optional PyTorch and Ultralytics vision engines

### Patch: 2026-07-21 — v2.0.0: Fix up-to-date card visibility on Updates page and add ultralytics to dependencies

- Fix up-to-date card visibility on Updates page and add ultralytics to dependencies

### Patch: 2026-07-21 — v1.9.9: Fix TTS thread dead warning log and sync settings state between Electron and backend

- Fix TTS thread dead warning log and sync settings state between Electron and backend

### Patch: 2026-07-21 — v1.9.8: Fix update pause/resume persistence across app restarts and add in-UI rollback verification dialog

- Fix update pause/resume persistence across app restarts and add in-UI rollback verification dialog

### Patch: 2026-07-21 — v1.9.7: Fix false update-available on same version; fix YOLO status always showing offline on Vision page

- Fix false update-available on same version; fix YOLO status always showing offline on Vision page

### Patch: 2026-07-21 — v1.9.3: Fix readiness caching, memory save path fallback, database thread-safe connection, and rollback lock

- Fix readiness caching, memory save path fallback, database thread-safe connection, and rollback lock

### Patch: 2026-07-21 — v1.9.2: Add SQLite indices for near-instant chat history retrieval

- Add SQLite indices for near-instant chat history retrieval

### Patch: 2026-07-21 — v1.9.1: Fix stale closure check again button stuck in checking

- Fix stale closure check again button stuck in checking

### Patch: 2026-07-21 — v1.9.0: Remove Brave Search and add update pause/resume persistence

- Remove Brave Search and add update pause/resume persistence

### Patch: 2026-07-20 — v1.8.9: Fix list index out of range in Brave search parsing

- Fix list index out of range in Brave search parsing

### Patch: 2026-07-20 — v1.8.8: Filter launcher icons in Settings table and fallback to Steam headers

- Filter launcher icons in Settings table and fallback to Steam headers

### Patch: 2026-07-20 — v1.8.6: Use public WebSearchEngine search API for game fallback classification

- Use public WebSearchEngine search API for game fallback classification

### Patch: 2026-07-20 — v1.8.5: Support dynamic RAWG fallback database scan for 1 lakh+ games

- Support dynamic RAWG fallback database scan for 1 lakh+ games

### Patch: 2026-07-20 — v1.8.4: Support FPS genre mapping in preset recommendations

- Support FPS genre mapping in preset recommendations

### Patch: 2026-07-20 — v1.8.3: Support dynamic RTX 60+ series and auto-configure presets

- Support dynamic RTX 60+ series and auto-configure presets

### Patch: 2026-07-19 — v1.7.10: Check For Updates Logo Stylization

- Updated Check For Updates tray icon to be white and borderless

### Patch: 2026-07-19 — v1.7.9: Remove Mission Briefs, update tray icon, and finalize TGP telemetry

- Deleted Mission Briefs and associated local mdx briefs
- Updated Check For Updates tray icon to match Windows Update logo
- Updated release notes readmes with precise TGP & CPU Offset documentation

### Patch: 2026-07-19 — v1.7.8: Apply offset for ACPI CPU temp

- Subtracts 12C from ACPI TZ01 to approximate CPU Package avg under blocked driver mode

### Patch: 2026-07-19 — v1.7.7: Precision TGP and CPU Thermal fallbacks

- Precision TGP and CPU Thermal fallbacks

### Patch: 2026-07-19 — v1.7.6: Bypass code signature verification for self-built updates and robustify download updater

- Bypass code signature verification for self-built updates and robustify download updater

### Patch: 2026-07-18 — v1.7.5: Update system tray check updates menu icon to match flat white style

- Update system tray check updates menu icon to match flat white style

### Patch: 2026-07-17 — v1.6.8: Fix missing shortcuts and uninstall legacy versions during upgrade

- Protect machine-wide desktop shortcuts from being deleted during cleanup
- Automatically and silently uninstall legacy per-user installations during per-machine upgrades

### Patch: 2026-07-17 — v1.6.7: Fix default version fallback and newly downloaded launcher games classification

- Copy app-update.yml to packaged resources so native updates can resolve successfully
- Automatically map newly scanned Local games to their correct platforms (Steam, Epic, EA Desktop, etc.) based on install/exe paths
- Merge duplicate scanned game metadata keys to preserve direct paths alongside platform mappings

### Patch: 2026-07-17 — v1.6.6: Fix latest.yml UTF-8 BOM encoding for electron-updater support

- Fix latest.yml UTF-8 BOM encoding for electron-updater support

### Patch: 2026-07-16 — v1.6.5: Fix packaging of rapidocr_onnxruntime ONNX models and config assets

- Fix packaging of rapidocr_onnxruntime ONNX models and config assets

### Patch: 2026-07-15 — v1.6.2: Move Optimization Status block to Stability Lab next to Game Mode toggle

- Move Optimization Status block to Stability Lab next to Game Mode toggle

### Patch: 2026-07-15 — v1.6.1: Fix NSIS compile escape syntax in installer.nsh

- Fix NSIS compile escape syntax in installer.nsh

### Patch: 2026-07-15 — v1.6.0: Fix duplicate start menu shortcuts and update overlay blocking

- Fix duplicate start menu shortcuts and update overlay blocking

### Patch: 2026-07-15 — v1.5.9: Fixed the USE DESKTOP UPGRADE 

- Fixed the USE DESKTOP UPGRADE 

### Patch: 2026-07-15 — v1.5.8: Fixed the Frozen Update. 

- Fixed the Frozen Update. 

### Patch: 2026-07-15 — v1.5.7: Fixed the Frozen Update and making soe issue. 

- Fixed the Frozen Update and making soe issue. 

### Patch: 2026-07-15 — v1.5.6: Fixed the OCR

- Fixed the OCR

### Patch: 2026-07-15 — v1.5.5: Fix OCR Reader, TTS Thread stability, and Update Page UI

- Fix OCR pre-warming error by calling _ensure_rapidocr_reader
- Update settings, documentation, and requirements to transition fully to RapidOCR
- Fix TTS thread crashes in voice_manager by validating SAPI5 COM dispatch at startup and implementing config setters in PyTTSX3 fallback
- Fix missing release highlights when up-to-date and system tray update check behavior when minimized

### Patch: 2026-07-15 — v1.5.4: DirectX 9 / Fullscreen FPS Fix and Publisher GUI Enhancements

- Extended ETW C++ engine with D3D9 and DxgKrnl providers to enable FPS tracking in DX9 and Exclusive Fullscreen games.
- Redesigned Publisher GUI with drag-and-drop image uploads, dynamic version previews, and document-aware auto-generation.
- Added MSI and Portable ZIP installer download links to the website landing page.

### Patch: 2026-07-15 — v1.5.3: Align C# telemetry search paths with PyInstaller internal directories

- Align C# telemetry search paths with PyInstaller internal directories

### Patch: 2026-07-15 — v1.5.2: Remove terminal logs from updates page

- Remove terminal logs from updates page

### Patch: 2026-07-15 — v1.5.1: Fix WARN log level filtering on Dashboard

- Fix WARN log level filtering on Dashboard

### Patch: 2026-07-15 — v1.5.0: Redesign update system to resolve duplication and check installer availability

- Redesign update system to resolve duplication and check installer availability

### Patch: 2026-07-15 — v1.4.9: Upgrade installer to standard interactive wizard and fix telemetry dependencies

- Upgrade installer to standard interactive wizard and fix telemetry dependencies

### Patch: 2026-07-15 — v1.4.8: Add CPU fallback to EasyOCR initialization on CUDA error

- Add CPU fallback to EasyOCR initialization on CUDA error

### Patch: 2026-07-14 — v1.4.7: Disable GPU sandbox globally on Windows to fix black screen

- Disable GPU sandbox globally on Windows to fix black screen

### Patch: 2026-07-14 — v1.4.4: Resolve MEM0_API_KEY resolution and allow copy of specific terminal log lines

- Added fallback to load .env in memory.py, fixed config_loader tests, and added hover copy buttons to individual dashboard log lines.

### Patch: 2026-07-14 — v1.4.3: Restore CPU power estimation fallback

- Restored CPU power estimation math when hardware sensor readings are unavailable so that CPU wattage shows up on the HUD.

### Patch: 2026-07-14 — v1.4.2: Alternate Switch Account between Google and Discord

- Configured Switch Account in Settings to sign out and auto-login with Google/Discord depending on the current provider.

### Patch: 2026-07-14 — v1.4.1: Fix HUD scan and remove Stealth Mode

- Prevented HUD window from triggering get_cached_games to avoid backend auto-scan.
- Removed Stealth Mode tray menu options, window protection logic, and settings panel.

### Patch: 2026-07-14 — v1.4.0: Responsive UI, tray events, env var loading, and Electron memory optimization

- Enforced 256MB V8 heap limit & exposed GC to optimize Electron memory usage on 16GB RAM setups.
- Added single-click system tray handler to toggle app visibility.
- Ensured env variables override system environment to fix NVIDIA_API_KEY loading.
- Removed scaling clamp from frontend CSS to fix zoomed-out responsive scaling.
- Renamed 'Ack Engine' to 'Acknowledge' in Updater UI.

### Patch: 2026-07-13 — v1.3.9: Fix FPS disparity with OBS capture and improve ETW precision

- Fixed FPS reporting disparity when OBS is recording by capturing all DXGI Present event APIs (42, 46, 73, 78)
- Resolved ETW state corruption by ignoring bogus microscopic intervals without updating the last frame timestamp

### Patch: 2026-07-13 — v1.3.8: Release v1.3.8: Fix CPU package temperature and remove fake power math

- Release v1.3.8: Fix CPU package temperature and remove fake power math

### Patch: 2026-07-13 — v1.3.7: Release v1.3.7: Fix frontend compilation and include missed UI updates

- Release v1.3.7: Fix frontend compilation and include missed UI updates

### Patch: 2026-07-12 — v1.3.4: Upgraded some minor changes

- Upgraded some minor changes

### Patch: 2026-07-12 — v1.3.0: Fixed Microsoft Auth, CPU clock speed, and Release notes UI

- Fixed Microsoft Auth, CPU clock speed, and Release notes UI

### Patch: 2026-07-12 — v1.2.9: Optimized Electron memory footprint for 16GB RAM systems & Fixed Google Auth Fallback

- Optimized Electron memory footprint for 16GB RAM systems & Fixed Google Auth Fallback

### Patch: 2026-07-12 — v1.2.8: Fixed Google sign-in username display issue

- Fixed Google sign-in username display issue

### Patch: 2026-07-11 — v1.2.5: Fixed HUD focus loss and games database path in window detector

- Fixed HUD focus loss and games database path in window detector

### Patch: 2026-07-11 — v1.2.3: Added whitespace trimming to build inputs and file search filters

- Added whitespace trimming to build inputs and file search filters

### Patch: 2026-07-11 — v1.2.2: Resolved TypeScript value-used-as-type compiler warnings in Electron wrapper

- Resolved TypeScript value-used-as-type compiler warnings in Electron wrapper

### Patch: 2026-07-11 — v1.2.2: Resolved TypeScript value-used-as-type compiler warnings in Electron wrapper

- Resolved TypeScript value-used-as-type compiler warnings in Electron wrapper

### Patch: 2026-07-11 — v1.2.1: Namespace import style for electron to resolve is-not-a-module editor warning

- Namespace import style for electron to resolve is-not-a-module editor warning

### Patch: 2026-07-11 — v1.2.0: Increased NVIDIA NIM timeout and resolved TypeScript build warnings

- Increased NVIDIA NIM timeout and resolved TypeScript build warnings

### Patch: 2026-07-11 — v1.1.9: Removed all native Windows toast notifications to prevent Notification Center clutter

- Removed all native Windows toast notifications to prevent Notification Center clutter

### Patch: 2026-07-11 — v1.1.8: Configured typeRoots in frontend tsconfigs to resolve VS Code editor type errors

- Configured typeRoots in frontend tsconfigs to resolve VS Code editor type errors

### Patch: 2026-07-11 — v1.1.7: Fixed game name trailing space caching and strict launcher fallback classification

- Fixed game name trailing space caching and strict launcher fallback classification

### Patch: 2026-07-11 — v1.1.6: Fixed startup hardware detecting lag and dashboard stat card value visibility

- Fixed startup hardware detecting lag and dashboard stat card value visibility

### Patch: 2026-07-11 — v1.1.5: Configured silent one-click installer and hid installation details

- Configured silent one-click installer and hid installation details

### Patch: 2026-07-11 — v1.1.4: Removed update download blink animation

- Removed update download blink animation

### Patch: 2026-07-10 — v1.1.3: Fixed patch notes HTML rendering and tray header logo

- Fixed patch notes HTML rendering and tray header logo

### Patch: 2026-07-10 — v1.1.2: Fixed AWCC sensor and library duplicate bugs

- Fixed AWCC sensor and library duplicate bugs

### Patch: 2026-07-10 — v1.0.2: Fixed the bugs of AWCC senor and Fixed the library for making duplicate

- Fixed the bugs of AWCC senor and Fixed the library for making duplicate

### Patch: 2026-07-10 — v1.1.1: Avatar fix, provider-switch scan reset, uninstall registry speedup

- Avatar now loads from Google/Discord CDN with onError initials fallback
- Scan overlay no longer sticks when switching OAuth provider (Discord to Google)
- Uninstall registry scan phase cut from 30s+ to under 1s by removing disk walks

### Patch: 2026-07-10 — v1.1.0: Discord auth, sign-out fix, Ubisoft Connect detection

- Discord OAuth display name now shows Discord tag and provider label in sidebar
- Fixed Library page getting stuck in scan state after signing out
- Fixed Ubisoft Connect launcher not appearing after fresh install
- Fixed GOG Galaxy and EA Desktop deduplication normalization collision

### Patch: 2026-07-10 — v1.1.0: OAuth Display, Sign-Out Scan Reset, and Ubisoft Connect Fixes

- Resolved Discord OAuth display issues by cascading user name lookup
- Fixed Library scan UI getting stuck in scanning state upon user sign-out
- Fixed duplicate detection normalization to prevent Ubisoft Connect launcher from being dropped

### Patch: 2026-07-10 — v1.0.9: Fix SQL queries and NIM timeouts

- Included queries, prompts, and RAG data in PyInstaller package
- Added client-side request timeouts to prevent Gateway Timeout hangs
- Synchronized NIM calls with threading locks to prevent circuit breaker race conditions

### Patch: 2026-07-09 — v1.0.4: Mem0 Package Fix

- Bundle mem0 config submodules dynamically in PyInstaller specs.

### Patch: 2026-07-09 — v1.0.3: HUD Crash Fix

- Fixed TypeError: Object has been destroyed in HUD window show/hide handlers.

### Patch: 2026-07-09 — v1.0.2: Production Telemetry & Core Fixes

- Fixed production telemetry by bundling LibreHardwareMonitor DLLs into PyInstaller build.
- Fixed CPU temperature reporting by correcting WMI parsing alignment (preventing CPU frequency from being misread as temperature) and removing arbitrary TZ01/TZ02 zone exclusions.
- Removed artificial CPU temperature estimation fallback to ensure only real hardware readings are reported.
- Migrated website persistence from Sanity to MongoDB/Mongoose.
- Fixed Mermaid diagram rendering issues in blog views.

### Patch: 2026-07-08 — v2.3.6: Sync package versions

- Explicit package version auto-updater integration

### Patch: 2026-07-08 — v2.3.5: Robust auto-updater, LibreHardwareMonitor telemetry auto-run, tuned EMA temperature smoothing, and E2E local memory isolation

- **Auto-Updater Reliability**: Added robust git/uv path resolution using `shutil.which` and pre-flight network connection verification via `git fetch`.
- **LibreHardwareMonitor Integration**: Configured auto-running `HardwareMonitor.exe` background process, ensuring exclusive polling and reducing thermal jitter with tuned EMA coefficients.
- **AI Memory & Privacy Safeguards**: Patched `memory.py` to filter encrypted fallback strings, bypassed cloud Mem0 extraction/retrieval when Privacy Shield is enabled, and purged Resident Evil dataset hallucinations.
- **Frontend UI Optimization**: Removed hardcoded version defaults in components, falling back gracefully to loading state until WebSocket state broadcast.

### Patch: 2026-07-08 — v2.3.4: Fix declaration order compile error in AgentPage.tsx

- Fix declaration order compile error in AgentPage.tsx

### Patch: 2026-07-08 — v2.3.3: Optimize Agent Page UI rendering performance and default Llama model

- Optimize Agent Page UI rendering performance and default Llama model

### Patch: 2026-07-08 — v2.3.2: Fix updater check for private repo and eliminate terminal window blinking

- Fix updater check for private repo and eliminate terminal window blinking

### Patch: 2026-07-07 — v2.3.0: Fix uninstaller lock and release v2.3.0

- Inject child process killing logic directly into elevated NSIS installer
- Fix installer pathing bugs and process leaks

### Patch: 2026-07-07 — v2.2.9: Fix uninstaller file lock: kill HardwareMonitor child processes before install

- Fix uninstaller file lock: kill HardwareMonitor child processes before install

### Patch: 2026-07-07 — v2.2.8: Fix telemetry zombie process leak and uninstaller file locks

- Fix telemetry zombie process leak and uninstaller file locks

### Patch: 2026-07-07 — v2.2.7: Fix version check silent failures by adding full exception logging

- Fix version check silent failures by adding full exception logging

### Patch: 2026-07-07 — v2.2.6: Set default socket timeout to prevent DNS lookup hangs during version checks

- Set default socket timeout to prevent DNS lookup hangs during version checks

### Patch: 2026-07-07 — v2.2.5: Add manual Check Again update trigger button to up to date screen

- Add manual Check Again update trigger button to up to date screen

### Patch: 2026-07-07 — v2.2.4: Render patch explanations and exclude test files from compilation

- Render patch explanations and exclude test files from compilation

### Patch: 2026-07-07 — v2.2.3: Support base domains in TELEMETRY_API_URL environment config

- Support base domains in TELEMETRY_API_URL environment config

### Patch: 2026-07-07 — v2.2.2: Fix updater deadlocks and timezone changelog skew

- Fix updater deadlocks and timezone changelog skew

### Patch: 2026-07-07 — v2.2.1: Fix LibreHardwareMonitor C# DLL path resolution inside packaged app

- Fix LibreHardwareMonitor C# DLL path resolution inside packaged app

### Patch: 2026-07-07 — v2.2.0: Fix tsconfig types configuration to resolve IDE compilation errors

- Fix tsconfig types configuration to resolve IDE compilation errors

### Patch: 2026-07-07 — v2.1.9: Fix telemetry connection refused warnings on launch

- Fix telemetry connection refused warnings on launch

### Patch: 2026-07-07 — v2.1.8: Synchronize website version endpoint with GitHub Releases

- Synchronize website version endpoint with GitHub Releases

### Patch: 2026-07-07 — v2.1.7: Optimize React dashboard performance and fix tab switching lag

- Optimize React dashboard performance and fix tab switching lag

### Patch: 2026-07-07 — v2.1.6: Resolve NVIDIA NIM timeouts by switching default LLM to Llama 3.1 70B

- Resolve NVIDIA NIM timeouts by switching default LLM to Llama 3.1 70B

### Patch: 2026-07-07 — v2.1.5: Fix API key loading and installer .env bundling

- Fix API key loading and installer .env bundling

### Patch: 2026-07-07 — v2.1.4: Fix mem0 config import crash in bundled executable

- Fix mem0 config import crash in bundled executable

### Patch: 2026-07-07 — v2.1.3: Fix installer shortcut and folder selection

- Fix installer shortcut and folder selection

### Patch: 2026-07-07 — v2.1.2: Deploy final release with telemetry and pipeline fixes

- Deploy final release with telemetry and pipeline fixes

### Patch: 2026-07-07 — v2.1.2: Fixed some bugs

- Fixed some bugs

### Patch: 2026-07-06 — v2.0.1: Fix telemetry sensors and version mismatch

- Fix telemetry sensors and version mismatch

### Patch: 2026-07-06 — v2.0.0: Woodpecker CI/CD Integration

- Migrated CI/CD to Woodpecker CI
- Added run_local.ps1 script
- Fixed UTF-8 BOM issue in package.json
- Fixed NameError: name 'logger' is not defined in updater_bridge.py

### Patch: 2026-07-03 — v1.6.1: Fix GHA signtool hang by setting perMachine false in NSIS config

- Fix GHA signtool hang by setting perMachine false in NSIS config

### Patch: 2026-07-03 — v1.6.0: Fix GHA runner NSIS loop and update readme

- Fix GHA runner NSIS loop and update readme

### Patch: 2026-06-28 — v1.4.9: Anti-Ghosting Voice Controls, Security Hardening & AI Blog Pipeline

- **Anti-Ghosting Speech Control**: Gated the Text-To-Speech (TTS) engine for chat responses to only trigger when the user is in an active voice session (`is_listening = true`), avoiding unprompted spoken voice during typing.
- **Hotkey Conflict Resolution**: Replaced the default microphone toggle shortcut from the global paste shortcut `<ctrl>+v` to `<ctrl>+<alt>+m` to eliminate accidental triggers.
- **EasyOCR Eager Quantization Upgrade**: Updated EasyOCR dependency calls to use the modern `torchao` eager-mode API, silencing deprecated `torch.ao.quantization` warnings.
- **Motherboard UUID Lock & Encryption**: Enforced cryptographic Motherboard UUID locks for settings verification, and added local credential isolation policies.
- **AI-Driven Gaming Intel Pipeline**: Programmed a Next.js API endpoint fetching real-time headlines from top feeds (IGN, AnandTech) to generate technical blog articles using NVIDIA NIM.
- **Sanity CMS Sync & Cron**: Secured the pipeline with a `CRON_SECRET` auth handshake and scheduled a nightly Vercel cron (04:00 AM IST) that saves posts directly in Sanity CMS, protecting generated content from ephemeral Vercel environment wipes.

### Patch: 2026-06-26 — v1.4.8: Voice Mic Toggle & Consolidated Electron App Overlay

- **Consolidated Window Management**: Streamlined system overhead by removing the redundant standalone `agent-popup` window overlay, unifying all agent controls under the primary Electron dashboard and HUD overlay.
- **Microphone Hotkey Control**: Integrated customizable microphone toggle hotkey (default `<ctrl>+<alt>+v`) with voice manager start/stop listening state and hook/unhook chimes.
- **HUD Subtitles Overlay Strip**: Added glassmorphic subtitles overlay at the bottom center of the HUD displaying user voice prompts, agent responses, and a pulsating mic recording state ('Listening...').
- **Auto-Hide Subtitles**: Implemented overlay fade-out logic triggering after 10 seconds of speech or response inactivity when the microphone is inactive.

### Patch: 2026-06-22 — v1.4.7: TensorRT & Working Set Memory Optimization

- Integrated TensorRT engine support for YOLOv8n object detection to reduce GPU overhead
- Fixed GPU metrics telemetry key mapping from gpu_util to gpu_load
- Implemented Win32 EmptyWorkingSet API RAM flushing inside the adaptive throttle loop
- Added aggressive memory reclamation inside yolo_detector and ocr_reader unload_model methods
- Added game exit RAM flush hooks in main.py to minimize backend memory footprint when game stops

### Patch: 2026-06-10 — v1.4.5: Interactive Icons and Search Dismissal

- Added representative Lucide icons for all subpart links in navbar dropdowns
- Added focused clear and dismiss close button on desktop search bar

### Patch: 2026-06-10 — v1.4.4: Hover Dropdown Click Interceptor Fix

- Eliminated empty gap between navigation headers and dropdown panels to stabilize hover state and allow click actions

### Patch: 2026-06-10 — v1.4.3: Comprehensive Navbar Dropdowns Menu

- Converted every main header nav link into a dedicated dropdown submenu
- Connected Submit Telemetry dropdown item to auto-open ReportModal via URL query parameters

### Patch: 2026-06-10 — v1.4.2: SEO and Responsive Navbar Enhancements

- Added responsive dropdown for secondary navbar links
- Added search bar autocomplete suggestions
- Injected JSON-LD Schema markup and enhanced SEO keywords metadata

### Patch: 2026-06-10 — v1.4.1: WebGL and WebSocket Specs Auto-Detection

- Added discrete GPU request to WebGL
- Added direct local desktop app websocket specs query layer

### Patch: 2026-06-10 — v1.4.0: Theme and Spec Auto-Detection Fixes

- Fixed WebGL GPU parameter name to enable auto-detection
- Added dark styling classes to select and option tags

### Patch: 2026-06-10 — v1.3.9: Telemetry & Community Bug Tracker

- Implemented community glitch tracker on website
- Connected telemetry sync to launcher modal
- Added privacy toggle controls to settings

### Patch: 2026-06-10 — v1.3.8: DirectX Native Frame-Rate Engine & High-Fidelity HUD Telemetry

- **C++ DirectX FPS Engine**: Implemented low-level frame presentation queue queries inside the C++ native layer ([fps_counter.cpp](file:///c:/GitHub/Mission-Control/Gaming/backend/fps_counter.cpp) compiled to `fps_counter.dll`), capturing absolute instantaneous minimum and maximum FPS.
- **Precision Telemetry Stream**: Exposed absolute min/max FPS, 1% lows, average min/max FPS, real-time CPU/GPU wattage, CPU/GPU temperatures, and physical RAM/VRAM capacities over the WebSocket bridge without Rolling Average Python fallbacks.
- **HUD Layout Standardization**: Standardized CPU Util and GPU Temp indicators across Standard, Compact, and Horizontal layouts in [HUD.tsx](file:///c:/GitHub/Mission-Control/Gaming/frontend/src/components/HUD.tsx), utilizing relative `em` scaling for perfect proportion adjustment and dynamic Electron `setBounds` window boundaries resizing in [main.ts](file:///c:/GitHub/Mission-Control/Gaming/frontend/electron/main.ts).
- **Speech Recognition Deprecation Guard**: Silenced third-party standard library deprecation warnings (`aifc` and `audioop` slated for removal in Python 3.13) by wrapping imports in a localized `warnings.catch_warnings` block inside [voice_manager.py](file:///c:/GitHub/Mission-Control/Gaming/backend/voice/voice_manager.py).

### Patch: 2026-05-30 — v1.3.7: Asynchronous Search, Pure Telemetry & Active Cleaning

- Asynchronous Gameplay Search: Integrated a fully background asynchronous thread to fetch mission and strategy walkthroughs, eliminating core brain thread blocks and HUD stuttering in all modes including AI Agent.
- Real-Time Telemetry: Replaced all estimated, randomized, or mock telemetry generators with direct, physical NVML and PDH queries for CPU, GPU, RAM, FPS, and Disk.
- Active HUD Positioning & Cleaning: Implemented robust window close/destruction lifecycle on toggle-off to release graphics resources, and tied snaps to native Electron show/hide events.
- Settings Page Auto-Sync: Overhauled form synchronization using useEffect hooks to map external coordinates adjustments, preventing stale saves from overwriting HUD layouts.
- Process State Handshake: Synchronized library process watcher scans directly with the pipeline state lock to display active game titles instantly on the HUD.

### Patch: 2026-05-28 — v1.3.6: Premium UI Responsiveness & GPU Feature Badges

- Mission Control Tactical Assistant: Made the console dashboard header fully responsive, stacking elements cleanly on smaller viewports and preventing title truncation.
- Platform Filters: Improved Platform filter pills container to prevent wrapping and remain perfectly aligned on a single row.
- Unused Warnings: Fixed GPU_RTX_FEATURES declared but never read warning by removing REFLEX and using it for the needsRtx capability check.

### Patch: 2026-05-28 — v1.3.5: Snappy Telemetry Preloading & Concurrent Hardware Scans

- Instant Telemetry Preloading: Populates basic system specifications (CPU model, RAM Capacity, OS name) instantly in memory on startup, allowing the React dashboard to render these specs immediately without loading delays.
- Concurrently Executed Hardware Scans: Refactored the heavy static hardware queries (partition details, USB peripherals, RAM sticks) to run in parallel using a ThreadPoolExecutor, cutting startup discovery latency from 8–9 seconds down to less than 2 seconds.
- Native OS & Display Queries: Overhauled OS details and display detection using Windows HKLM registry keys and native ctypes `EnumDisplaySettingsW` API. This fetches resolution/refresh rate and OS edition in under 1ms, avoiding slow PowerShell CimInstance subprocesses.
- Redundant RAM Speed Query Removal: Extracted max RAM speed directly from the cached physical RAM stick details, saving a redundant, slow PowerShell call.

### Patch: 2026-05-28 — v1.3.4: Native API Performance Tuning & Real Standby RAM Flush

- Native API Integration: Replaced slow external PowerShell process spawns for registry modifications (`winreg`) and process priority settings (`psutil`) with native Python APIs, reducing execution time from hundreds of milliseconds to microseconds and avoiding AV warnings.
- Real System Standby RAM Flush: Replaced the ineffective `[System.GC]::Collect()` command (which only garbage-collected the short-lived PowerShell process itself) with a real Windows API-level working set flush (`EmptyWorkingSet` via `ctypes` & `psutil`) to genuinely free up system RAM and reduce game micro-stutters.
- Robust Fallback Mechanisms: Implemented reliable safety nets that fall back to standard CLI tools and PowerShell commands if native APIs encounter permission errors or platform limitations.

### Patch: 2026-05-28 — v1.3.3: Automatic Screen Brightness Preservation

- Adaptive Screen Brightness Preservation: Overhauled the power scheme application to automatically capture current screen brightness prior to switching power plans, and restore the original level 0.4 seconds after the switch. This prevents jarring display changes when activating Max, Silent, or Balanced modes.

### Patch: 2026-05-28 — v1.3.2: Game Mode Power Scheme Diagnostics & Safety Details

- Windows Power Scheme Mapping: Explained behavior of Silent, Balanced, and Max modes, which map directly to Power Saver, Balanced, and High Performance system templates respectively.
- Adaptive Screen Brightness Clarification: Documented why screen brightness may decrease when switching profiles (due to independent OS profile settings) and how to resolve it by updating the specific plan brightness.
- Hardware Safety Integrity: Outlined why Game Mode cannot fry laptop hardware, as it works via official Windows APIs and preserves silicon-level thermal and hardware-level safeguards.
- Silent Mode Cooling Logic: Documented how Silent mode throttles CPU/GPU power limits and changes OS cooling policy to passive for low-noise fan operation.

### Patch: 2026-05-28 — v1.3.1: Premium System Telemetry Polish & Dynamic Library Routing

- Space-Efficient Header: Redesigned the System Telemetry page header to be extremely low-profile and compact, reclaiming substantial vertical screen space
- GPU Full Name: Removed truncation from the dynamic GPU telemetry chip to show the full active system graphics card model name cleanly
- CPU Architecture Spec: Replaced empty CPU temperature --- with CPU Architecture for verified high-fidelity specification validation
- Compact Settings Toggle: Relocated the diagnostics Inspect Pipeline Log button next to the Aero Auto-Sense active status badge in the Settings page
- Dynamic Library Target Matching: Enhanced co-pilot pipeline mapping with presets preservation and robust case-insensitive substring genre routing

### Patch: 2026-05-23 — v1.2.7: E2EE Verification Modal UX Polish

- Modal Close Actions: Replaced the text CLOSE button with a premium glowing X icon button inside the Verification Modal
- Tactile Backdrop Closures: Assigned explicit cursor-pointer styling to both the Close button and the backdrop, ensuring effortless, high-response modal closure

### Patch: 2026-05-23 — v1.2.6: Dashboard AI Strategy Log Layout Polish

- Dashboard UI Layout: Resolved flex-squeezing on the Dashboard's AI Strategy Log title by preventing wrap-bleeding and centering the header icons

### Patch: 2026-05-23 — v1.2.5: Cryptographic E2EE Memory & Verification Interface

- Secure E2EE Badge Header: Added an active state E2EE / Local Session status badge to the top chat header in AgentPage
- WhatsApp-Style System Security Notice: Injected a dynamic warning/security banner at the top of the chat logs explaining the active encryption shield
- Interactive Handshake Verification Modal: Created an immersive holographic modal with a scanning QR matrix, cyber scanning line, and Murmur-mixed high-entropy signature keys bound dynamically to local motherboard UUIDs
- GPU Hardware-Verification Lockouts: Added strict verification inside SettingsPage locking Ray Tracing, Path Tracing, and DLSS options on non-NVIDIA GPUs
- Crash-Safe SSL Diagnostics: Overhauled in-process TLS network probes with subprocess sandbox isolation on Windows setups

### Patch: 2026-05-22 — v1.2.4: Dynamic Agent Greeting & Premium Style Refinements

- Frontend Session Isolation: Guarded tab transitions inside AgentPage to isolate session history and permanently block duplicate/stale messages during navigation
- Context-Aware Greetings: Overhauled decision_maker to recognize game states, providing friendly optimizations out-of-game and rich real-time telemetry (health, ammo, locations) in-game
- Premium Settings Redesign: Transformed Settings header into a glassmorphic CPU telemetry panel and replaced native HTML select boxes with custom glassmorphic CustomSelect widgets to avoid OS dropdown overrides
- Corrected Dashboard Metrics: Aligned GPU subtext with VRAM + Temperature telemetry, and pointed the RAM card to system capacity specifications
- Tailwind Purge Mitigation: Restructured progress-bar color references in SystemPage and DashboardPage to static string mappings, ensuring standard Tailwind rendering on build
- High-Contrast Navbar Dropdown: Redesigned the TACTICAL personality selector dropdown with deep obsidian overlays and backdrop-blur support to eliminate overlapping background text bleeding
- Clerk Provider Upgrade: Resolved console deprecations by adopting modern fallback redirect properties
- Header Z-Index Fix: Adjusted global navbar header to z-[55] to correctly layer the tactical dropdown over the sliding side panels

### Patch: 2026-05-21 — v1.2.3: Hardware Diagnostics & Testing Overhaul

- Fixed GPU power draw scaling to prevent unrealistic 6000+W readings.
- Overhauled hardware diagnostics system with RAM generation (DDR3/4/5) heuristics, AMD/Intel controller fallbacks, and expanded SSD signatures.
- Added dashboard card redirects for CPU, GPU, RAM, and Disk to the System page.
- Cleaned up the OSD/Mission Control header memory capacity label to hide DDR details.
- Integrated React Testing Library and Vitest for reliable React component testing.

### Patch: 2026-05-20 — v1.2.2: UX Reusability and Logging Stability

- Added custom React hooks useHotkey and useDebounce for dashboard control
- Created reusable formatters library to display clock speeds and bytes cleanly
- Fixed a critical main.py startup crash caused by invalid logging.Formatter parameters
- Resolved path mismatches in release tools (publish.ps1 and bump_version.py)

### Patch: 2026-05-16 — v1.2.1: Web Intelligence & UX Refinement

- **🌐 Gaming Web Search Engine**: Integrated multi-source intelligence (Wikipedia, RAWG.io, SteamSpy, DuckDuckGo) for real-time game data enrichment.
- **🤖 Auto Model Routing**: Implemented intelligent model switching that selects the optimal NIM model (Tactical/Strategic/Vision) based on user query intent.
- **⌨️ Hotkey Recorder**: Replaced manual text entry with a professional click-to-capture widget for global hotkeys.
- **🌡️ Thermal Fallback Engine**: Hardened CPU temperature reporting with a multi-stage WMI → CIM → PerfData fallback chain.
- **🎙️ Voice Profile System**: Added distinct Male/Female voice profiles with engine-level optimization for ElevenLabs and SAPI5.
- **🖥️ System UI Polish**: Resolved JSON string rendering issues in component labels and standardized OSD status indicators.
- **📁 Path Browsing**: Added native Windows file dialogs (Browse buttons) for YOLO models and Session Memory paths with automatic relative path conversion for portability.

### Patch: 2026-05-15 — v1.2.0: System Stability & Specialized Brain Refinement

- **Dynamic Hotkey Configuration**: Added a "Global Hotkeys" section in settings with real-time rebinding for HUD and Agentic mode.
- **NVIDIA Tech Expansion**: Integrated **Path Tracing** (Overdrive Mode) into the configuration suite alongside DLSS, RT, and Reflex.
- **Vision NIM Stabilization**: Migrated VLM refinement to `llama-3.2-11b-vision-instruct` to resolve 404 errors and improve scene analysis.
- **Voice Personalization**: Added support for selecting Male (David) and Female (Zira/Aero) voices, plus NVIDIA NIM specialized voices (Emerald/Onyx). Includes a new **"Test Voice"** button in settings for immediate vocal previews.
- **Dynamic Configuration**: Implemented `update_config` across the pipeline to allow real-time changes to voice, hotkeys, and AI models without app restart.
- **UI Persistence**: Fixed a crash by exposing `settings_page` and `system_page` correctly on the MainWindow instance.
- **Automated Maintenance**: Added a pre-flight cleanup system to purge temporary session data on startup and created `clean.ps1` for manual environment refreshes.

### Patch: 2026-05-10 — v1.1.7: Phase 20: Full Autonomous Gameplay Validation

- Implemented User-Override safety interlocks for seamless co-pilot hand-off.
- Added autonomous action validation and anti-spam cooldown logic.
- Integrated background input listeners for manual activity detection.
- Finalized pipeline stability and safety protocols for agentic execution.
- Project Integrated: Full NVIDIA NIM Agentic Gaming Assistant Complete.

### Patch: 2026-05-10 — v1.1.6: Phase 19: Hardware-Accelerated Voice Synthesis

- Integrated NVIDIA NIM TTS (FastPitch/HiFi-GAN) for studio-quality voice synthesis.
- Implemented low-latency audio playback using native Windows winsound API.
- Added automatic fallback to local pyttsx3 when NIM is offline.
- Optimized voice pipeline with latency tracking and temp-file cleanup.
- Updated roadmap to Phase 19 completion.

### Patch: 2026-05-10 — v1.1.5: Phase 18: Adaptive Agent Personalities

- Implemented 5 distinct AI personalities: Tactical, Friendly, Immersive, Sarcastic, and Aggressive.
- Added personality dropdown to the Agent UI for real-time switching.
- Synchronized personality settings from UI through Pipeline to the Brain.
- Updated NIM prompt logic to use personality-specific system instructions.
- Updated roadmap to Phase 18 completion.

### Patch: 2026-05-10 — v1.1.4: Phase 17: Multi-Modal Vision Refinement

- Integrated NVIDIA NIM Vision-Language Models (VLM) for deep scene understanding.
- Added frame compression and base64 encoding for efficient multi-modal queries.
- Updated GameBrain to incorporate VLM descriptions into strategic reasoning.
- Implemented throttled VLM orchestration to preserve pipeline performance.
- Updated roadmap to Phase 17 completion.

### Patch: 2026-05-10 — v1.1.3: Phase 16: Multi-Model Pipeline Optimization

- Implemented dynamic GPU-aware throttling for AI reasoning.
- Added scene-aware vision filtering to skip object detection in menus.
- Integrated state-hashing cache in GameBrain to reduce redundant NIM calls.
- Optimized thread sleeping for better game performance parity.
- Updated roadmap to Phase 16 completion.

### Patch: 2026-05-10 — v1.1.2: Phase 15: Agent Mode with Auto-Play Co-pilot

- Implemented autonomous input execution using pynput integration.
- Updated NVIDIA NIM reasoning to support structured GameAction commands.
- Synchronized Agentic Mode toggle between UI and background pipeline.
- Added real-time feedback in the Agent UI for active autonomous actions.
- Updated roadmap to Phase 15 completion.

### Patch: 2026-05-10 — v1.1.1: Integrating NVIDIA NIM Agentic Reasoning & Voice

- Implemented NVIDIA NIM reasoning layer with Llama 3.1 70B.
- Added context continuity memory to allow the AI brain to remember previous advice.
- Integrated NVIDIA Riva models for STT (Parakeet) and TTS (FastPitch).
- Enhanced UI alignment, bubble styling, and right-aligned user messages.
- Updated all documentation and roadmaps for Phase 14 completion.

### Patch: 2026-05-10 — v1.1.0: Status Alignment Fix

- Corrected vertical and horizontal alignment of the status badge
- Implemented fixed height and center-vertical layout for indicator dot
- Reduced font size and letter-spacing for better proportions
- Added manual spacing to improve visual balance in the header

### Patch: 2026-05-10 — v1.0.9: Premium Status Indicator

- Replaced plain status text with a dynamic, high-end status badge
- Implemented pulsing status dot and uppercase typography with letter-spacing
- Added conditional glow states for 'Running' and 'Standby' modes
- Cleaned up top-bar layout for a more professional dashboard feel

### Patch: 2026-05-10 — v1.0.8: Critical Stability Patches

- Fixed AttributeError crashes in MainWindow regarding missing methods
- Hardened background manager initialization sequence
- Restored version history and changelog viewing capabilities
- Synchronized update checker lifecycle with UI ready state

### Patch: 2026-05-10 — v1.0.7: System Tray & Build Pipeline

- Implemented QSystemTrayIcon with Restore/Exit context menu
- Added native system notifications support via Agent
- Created build_app.ps1 for professional PyInstaller packaging
- Ensured global icon inheritance for all future dialogs

### Patch: 2026-05-10 — v1.0.6: Enhanced Identity & Persistence

- Moved AppUserModelID to module level for immediate registration
- Added icon path diagnostic logging for dev troubleshooting
- Hardened icon loading sequence in QApplication
- Clarified Hot Reload behavior for taskbar icon stability

### Patch: 2026-05-10 — v1.0.5: Full Branding Integration

- Integrated high-resolution logo into the top navigation bar
- Ensured visual consistency between taskbar, window title, and header branding
- Implemented smooth scaling for logo assets to fit UI constraints

### Patch: 2026-05-10 — v1.0.4: Native Windows Taskbar Branding

- Implemented multi-resolution .ico support for high-quality taskbar icons
- Moved AppUserModelID registration to start of main process for unified grouping
- Updated MainWindow and QApplication to prioritize .ico assets
- Ensured fallback logic for PNG assets for cross-platform compatibility

### Patch: 2026-05-10 — v1.0.3: Agentic Library Integration & Design Doc

- Integrated game library context into the AI Agentic Assistant
- Added DESIGN.md to document architecture and agentic capabilities
- Implemented real-time library synchronization signals
- Updated AgentPage UI with Library Context status tracking

### Patch: 2026-05-10 — v1.0.2: Fixed Global Application Branding

- Updated QApplication name to Mission Control
- Set global app icon in desktop_app.py for reliable taskbar display
- Synchronized typography to Segoe UI Variable Display

### Patch: 2026-05-10 — v1.0.1: Fixed PyQt6 Import Error

- Moved QIcon from QtWidgets to QtGui to fix startup crash

### Patch: 2026-05-10 — v1.0.0: Integrated Taskbar Branding

- Enabled custom taskbar icon support for Windows
- Configured AppUserModelID for unified window grouping
- Integrated high-resolution logo into the window lifecycle
- Updated assets management for production branding

### Patch: 2026-05-10 — v0.9.9: Rebranded to Mission Control

- Renamed app to Mission Control across all UI and backend components
- Generated and integrated new professional minimalist logo
- Updated window titles and branding icons for a more modern feel
- Synchronized exclusion rules for 'Mission Control' in capture engine

### Patch: 2026-05-10 — v0.9.8: Stability & Performance Optimization

- Implemented Global Crash Protection (Exception Hook)
- Optimized System Monitoring with batched process scans
- Reduced CPU overhead by implementing 3-second process caching
- Added Recovery Mode dialog for critical failure reporting

### Patch: 2026-05-10 — v0.9.7: Modernized UI & Sidebar Icons

- Implemented Remix icons for all navigation items
- Added glassmorphism and premium gradients to sidebar
- Enhanced active state highlights with glowing blue accents
- Updated global typography to Segoe UI Variable Display

### Patch: 2026-05-10 — v0.9.6: Hardware Telemetry & Process Tracking Fix

- Fixed critical bug in Top Resource Consumers list
- Enhanced RAM diagnostics with DDR4/DDR5 detection
- Added Frequency and Slot analysis to Memory specs
- Optimized hardware telemetry using modern PowerShell CIM commands

### Patch: 2026-05-10 — v0.9.5: Discovery Engine & UI Optimization

- Implemented dynamic multi-drive discovery
- Added refined junk filtering and app whitelist
- Responsive grid layout with auto-scaling columns
- Advanced icon extraction and gradient placeholders
- Integrated real-time optimization and reset backend

### Patch: 2026-05-10 — v0.9.3: UI Precision & Multi-Monitor Intelligence

- Added HUD font scaling (+/-)
- Implemented HUD persistence
- Added Auto-Follow Monitor mode
- Fixed Lab UI clipping

### Patch: 2026-05-09 — v0.9.2: App-Wide Animation Suite: Fluid Motion & Liquid UI

- Implemented smooth gauge transitions in Stability Lab
- Added staggered fade-in effects for System and Settings cards
- Integrated cross-fade page transitions

### Patch: 2026-05-09 — v0.9.1: Smooth Motion & Neural Pulse: Agentic UX Refinement

- Implemented smooth sliding transitions for History sidebar
- Added Neural Pulse glow animation for Master Mode
- Integrated fade-in animations for chat messages

### Patch: 2026-05-09 — v0.9.0: Universal Automation: Master Agentic Toggle

- Implemented Master Agentic Mode toggle for cross-game automation
- Added glowing visual feedback for ACTIVE mode
- Updated reasoning engine for autonomous monitoring

### Patch: 2026-05-09 — v0.8.2: Aesthetic Overhaul: Premium Chat Design

- Redesigned chat bubbles with Obsidian color palette
- Optimized message contrast and background colors
- Standardized typography and spacing for better readability

### Patch: 2026-05-09 — v0.8.1: Collapsible Workspace: Agentic Side Panel Toggle

- Implemented toggleable side panel for Agentic History
- Added menu icon button to collapse/expand workspace
- Optimized layout reflow when panel is hidden

### Patch: 2026-05-09 — v0.8.0: Agentic Memory: Session History & Privacy Controls

- Added Session History sidebar to track agentic interactions
- Implemented Clear Session and Delete All functionality
- Integrated memory-wipe logic to reset AI reasoning state

### Patch: 2026-05-09 — v0.7.2: UI Layout Polish & Cooling Analytics Visualization

- Rebalanced column stretch factors to prioritize main analysis
- Added Cooling Analytics sparkline to utilize vertical space
- Standardized card sizing and padding

### Patch: 2026-05-09 — v0.7.1: UI Stability Hotfix: Layout Type Constraint

- Fixed TypeError crash caused by float stretch parameter
- Standardized layout stretch factors to integers

### Patch: 2026-05-09 — v0.7.0: Thermal & Hardware Lab Integration

- Added Thermal & Hardware Lab card with fan and power controls
- Implemented Stability Trend Badges for real-time deltas
- Added hardware tweak mode toggles for Silent/Max Cooling

### Patch: 2026-05-09 — v0.6.2: Asynchronous Hardware Discovery & Zero-Lag Telemetry

- Decoupled slow hardware discovery from real-time loop
- Fixed 0.0% CPU startup freeze by moving RAM detection to background
- Optimized thread sync for shared state updates

### Patch: 2026-05-09 — v0.6.1: Enhanced Hardware Fallbacks & GHz Monitoring

- Hardened RAM speed parsing with regex for multi-line output
- Implemented CPU Clock Speed GHz fallback for TGP slot
- Improved thermal reporting with clearer N/A states

### Patch: 2026-05-09 — v0.6.0: Startup Optimization & App Detection Sync

- Moved slow hardware discovery to startup to prevent loop freezing
- Restored active application name display in OSD
- Eliminated blocking subprocess calls from 5Hz loop

### Patch: 2026-05-09 — v0.5.9: Synchronous RAM Fetch & Thermal Sensor Hardening

- Moved RAM frequency detection to one-time cached startup task
- Optimized PowerShell command strings for Windows 11
- Reduced telemetry thread overhead by caching static properties

### Patch: 2026-05-09 — v0.5.8: Telemetry Caching & Hardware Limitation Indicators

- Fixed RAM MHz disappearing by introducing a permanent state cache
- Added explicit N/A UI indicators for blocked CPU metrics
- Aligned CPU and GPU row formatting

### Patch: 2026-05-09 — v0.5.7: Hardware Sensor Cleanup & Graceful Degradation

- Reverted to Get-CimInstance for Windows telemetry as wmic is missing
- Added graceful degradation to OSD layout (hides unsupported sensors)
- Restored NVML GPU power scaling fix
- Verified RAM frequency detection

### Patch: 2026-05-09 — v0.5.6: WMIC Telemetry Overhaul & NVML Scaling Fix

- Replaced slow PowerShell queries with native wmic commands
- Fixed NVML power reporting bug with 1000x scaling factor
- Improved numeric parsing logic for memory speed detection
- Optimized TelemetryThread to minimize subprocess overhead

### Patch: 2026-05-09 — v0.5.5: Resilient GPU Monitoring & Granular Error Handling

- Implemented granular try-except blocks for NVML metrics
- Isolated unsupported sensors to prevent loop crashes
- Resolved Unknown Error flood with partial success logic
- Guaranteed Utilization and VRAM reporting

### Patch: 2026-05-09 — v0.5.4: Universal WMI Support & Legacy Fallbacks

- Implemented Get-WmiObject fallbacks for system telemetry
- Fixed RAM MHz detection with speed aggregation
- Stabilized CPU thermal detection with multi-stage queries
- Improved PowerShell data parsing for robustness

### Patch: 2026-05-09 — v0.5.3: CPU Telemetry Focus & GPU Noise Reduction

- Throttled GPU polling to 1Hz to resolve Unknown Error crashes
- Implemented error-log suppression for NVML
- Enhanced CPU thermal detection with fallbacks
- Prepared OSD for CPU Power Watts

### Patch: 2026-05-09 — v0.5.2: Forced Telemetry Polling & Thermal Sync

- Forced manual GPU polling in TelemetryThread
- Standardized OSD labels to always show Temp and TGP
- Improved PowerShell fallbacks for RAM/Thermal
- Improved CPU row layout with temperature placeholder

### Patch: 2026-05-09 — v0.5.1: Dedicated Telemetry Thread & Real-time Sync

- Isolated hardware polling into high-frequency TelemetryThread
- Resolved frozen metrics by removing AI logic dependencies
- Improved OSD responsiveness with direct state-to-UI pushes
- Optimized PowerShell fallbacks with cooldowns
- Guaranteed real-time updates for TGP and VRAM

### Patch: 2026-05-09 — v0.5.0: Hardware OSD Persistence & Telemetry Sync

- Decoupled hardware telemetry from game-activity checks
- Fixed CPU 0.0% issue with pre-initialization
- Optimized PowerShell RAM/Thermal detection
- Synchronized OSD data feed for real-time responsiveness
- Stabilized TGP and GPU Temp reporting

### Patch: 2026-05-09 — v0.4.9: Full Hardware Telemetry & TGP Monitoring

- Enabled NVIDIA GPU monitoring by default
- Added TGP (Watts) display to the OSD
- Integrated RAM frequency detection (MHz)
- Improved CPU thermal sensor fallbacks
- Synchronized OSD data feed for stability

### Patch: 2026-05-09 — v0.4.8: OSD Rendering Fix & Import Stabilization

- Added missing QPainterPath and QPen imports for OSD
- Stabilized OSD rendering pipeline
- Verified coordinate math for frame-time graphs

### Patch: 2026-05-09 — v0.4.7: Pro OSD Transformation & Live Font Scaling

- Rebuilt HUD with MSI Afterburner inspired glassmorphism
- Added Frame-Time Sparkline graph for jitter detection
- Integrated hotkeys for OSD font scaling (Ctrl+Alt+/-)
- Expanded metrics to include VRAM and rich CPU stats

### Patch: 2026-05-09 — v0.4.6: Auto-Update Network Resilience

- Doubled network timeout for update checks (12s)
- Implemented compatible User-Agent for network stability
- Refined error reporting for timeouts
- Stabilized checker for high-latency connections

### Patch: 2026-05-09 — v0.4.5: Telemetry Performance & Terminal Stability

- Throttled expensive Wi-Fi diagnostics (netsh) to 5s intervals
- Moved hardware discovery to background monitoring threads
- Eliminated UI-thread blocking during polling
- Resolved terminal freezing and process overhead
- Synchronized telemetry state for smoother rendering

### Patch: 2026-05-09 — v0.4.4: Live Stability Graphs & Visual Analytics

- Implemented real-time Sparkline graph for frame-time monitoring
- Integrated visual performance tracking in Stability Lab
- Synchronized AI jitter simulation with live graph data
- Fixed instance conflict during testing

### Patch: 2026-05-09 — v0.4.3: Agentic AI & Performance Lab Integration

- Replaced Tactical Coach with technical Performance & Stability Lab
- Integrated hardware bottleneck detection & AI tracking
- Fixed pipeline signal connections to prevent startup crashes
- Updated README and roadmap to Phase 13

### Patch: 2026-05-09 — v0.4.2: Settings Redesign & Precision Tuning

- Replaced mode dropdown with interactive selection cards
- Updated Target FPS increments to +1 precision
- Fixed Settings UI syntax and layout stability
- Refined card styling across settings

### Patch: 2026-05-09 — v0.4.1: UI & Intelligence Modernization

- Added Glassmorphic Top Bar with global controls
- Integrated Agentic AI Assistant (NVIDIA G-Assist style)
- Expanded WiFi telemetry with Signal/Adapter specs
- Implemented 9-to-0 versioning rollover

### Patch: 2026-05-09 — v0.4.0: Feature Update

- Added OSD Network Row
- Improved WiFi detection

### Patch: 2026-05-09 — v0.3.6: v0.3.6: Pure PowerShell Transition

- Removed absolute last wmic dependency
- Standardized all hardware on CIM architecture
- Future-proofed for Windows 11 24H2

### Patch: 2026-05-09 — v0.3.5: v0.3.5: System UI Stability

- Fixed Bluetooth/USB PnPEntity errors
- Migrated peripheral detection to PowerShell
- Optimized JSON parsing in UI

### Patch: 2026-05-09 — v0.3.4: v0.3.4: Agentic AI Infrastructure

- Added NVIDIA NIM API support
- Implemented Racing/Open World genre logic
- Expanded Telemetry with Agentic state

### Patch: 2026-05-09 — v0.3.3: v0.3.3: Performance & Stability Overhaul

- Fixed wmic error with PowerShell
- Integrated Pydantic/orjson
- Added 1s background throttle

### Patch: 2026-05-09 — v0.3.2: Pro Gaming OSD & Native Stability

- Added Win32 OSD locking
- Added CPU temp monitoring
- Optimized dragging math

### Patch: 2026-05-09 — v0.3.1: Pro Gaming OSD & Native Stability

- **Native Win32 HUD Locking**: Replaced standard Window Flags with Native Win32 `SetWindowLong` calls. This eliminates window recreation, preventing crashes and flickering when toggling the OSD lock.
- **CPU Temperature Integration**: Added real-time CPU thermal monitoring with a robust `wmic` fallback for Windows systems where `psutil` sensors are restricted.
- **Draggable Setup Mode**: Refined the repositioning logic with a "Global Anchor" system and a visible "MOVE HUD" hint for intuitive setup.
- **Hot Reload Optimization**: Configured the developer reloader to ignore `overlay_pos.json`, preventing accidental app restarts during HUD movement.

### Patch: 2026-05-09 — v0.3.0: Initial MSI Afterburner OSD

- **MSI Afterburner Aesthetics**: Migrated to a ultra-compact OSD using **Consolas Bold** typography and a high-visibility neon green/orange palette.
- **Native Painter Rendering**: Moved away from CSS styling for the OSD, using a native `paintEvent` for pixel-perfect transparency on Windows.
- **Persistent Positioning**: Integrated a JSON-based position memory that automatically restores the HUD to its last known location on startup.

### Patch: 2026-05-09 — v0.2.6: Automated Release Integration

- Integrated GitHub Actions for automated releases
- Added automatic git tagging to publish.ps1
- Configured release notes extraction from version.json

### Patch: 2026-05-09 — v0.2.5: Doc Overhaul & Hot Reload Sync

- Separated patches into patches.md for readability
- Automated patches.md syncing in bump_version.py
- Added Hot Reload (--dev) to README
- Refined publish.ps1 with versioned commits

### Patch: 2026-05-08 — HUD & Detection changes

- Disabled the legacy color-based "Health" overlay and removed hard-coded defaults (e.g. `Health: 100%`, `Perf: 100/100`). The HUD now displays only validated dynamic metrics such as GPU stats, FPS, and scene information when available.
- Replaced the implicit "enemy" assumption with a generic detection pipeline:
  - `vision/yolo_detector.py` now supports detecting all classes by default (no forced `target_classes`) and labels detections using the model's class names when available.
  - `vision/trt_inference.py` accepts `target_classes=None` so a TensorRT engine can be configured to detect all classes or a specific mapping if desired.
  - The pipeline state fields `enemies`/`enemies_count` were replaced with `detections`/`detections_count`. Voice feedback and overlays now reference `detections`.
- Voice "status" responses were simplified to report the number of actively tracked objects rather than a static "health/enemies" string.
- The scene overlay is suppressed when the classifier reports the default `"waiting"` state to avoid clutter when the desktop or non-game windows are focused.

### Patch: 2026-05-09 — OCR Dynamic Tuning & Auto-Region Detection

- **Implemented Dynamic ROI Detection**: The OCR engine now automatically scans for high-contrast "text-like" regions anywhere on the screen (damage numbers, item popups, floating names) without needing fixed coordinates.
- **Enhanced OCR Preprocessing**:
  - Added **Contrast Stretching** to handle faint text on moving backgrounds.
  - Improved **Adaptive Gaussian Thresholding** to better handle text with glows, shadows, or transparent overlays.
- **Visual Feedback**: The overlay now displays **Cyan bounding boxes** for dynamic detections and **Yellow boxes** for preset regions, with the extracted text rendered directly in the HUD for real-time validation.
- **Improved Story Analysis**: Dynamic text results are now integrated into the `StoryAnalyzer` and `GameBrain`, allowing the assistant to "read" the game world more naturally.
- **OCR Persistence**: Enabled OCR by default in `config/settings.yaml` with a balanced `run_every_n_frames` rate to maintain 60fps+ pipeline stability.

### Patch: 2026-05-09 — TensorRT Auto-Detection & UI Update Check

- **Dynamic TensorRT Detection**: `vision/trt_inference.py` now automatically scans for TensorRT installations in common system paths (`C:\`, `Program Files`, `NVIDIA`). It picks the latest version found, removing the need for hardcoded paths.
- **Manual Update Check**: Added a `🔄` refresh button next to the version label in the sidebar. Provides real-time status bar feedback ("Checking...", "You are up to date", or "Update available!").
- **Terminal Compatibility**: Fixed a `UnicodeEncodeError` in the diagnostics script by removing emoji characters that caused crashes in standard Windows shells.
- **Robust Path Handling**: Improved DLL injection logic to handle drive-relative paths and trailing backslashes correctly on Windows.

### Patch: 2026-05-09 — v0.2.4: Visual Patch Notes & Media Support

- **Changelog Media Support**: Patch notes now support images! Added a background `ImageLoader` that can fetch screenshots from GitHub or local file paths.
- **Dynamic Previews**: Version highlights now include visual previews. Simply add an `image_url` to `version.json` to show off new features in the GUI.

### Patch: 2026-05-09 — v0.2.3: Premium UI & Developer Velocity

- **Hot Reload (Dev Mode)**: Added `--dev` flag to `main.py`. The app now automatically restarts when any code (`.py`) or config (`.yaml`) file is saved, enabling real-time UI development.
- **Full Version History**: Added a "📜 View Changelog" button to the sidebar. Users can now browse the entire history of "patches" and release highlights at any time in a premium GUI window.
- **Premium UI Overhaul**: Fixed CSS border inheritance issues across all pages (Coach, System, Settings, Updater). Removed "cheap" outlines around text labels for a clean, modern dashboard aesthetic.
- **Enhanced Update Cards**: Refined the changelog cards with better typography, glassmorphism-style backgrounds, and custom ✦ icons for highlights.

### Patch: 2026-05-09 — v0.2.1: Automation & Startup Stability

- **Automated Publish Pipeline** (`publish.ps1`): Added a one-click deployment script. Handles version bumping, changelog updates, git committing, and GitHub pushing in a single command.
- **Background Device Scanning**: Moved slow WMI queries (Monitors, Bluetooth, USB) to a dedicated `ExternalDeviceScanThread`. The app now starts instantly without freezing while diagnostics load in the background.
- **Startup Auto-Update**: The app now automatically checks for new versions on GitHub 3 seconds after launch, alerting users to updates without manual intervention.
- **Improved Bluetooth Filtering**: Cleaned up the Bluetooth list to exclude technical noise (COM ports, BLE services, generic enumerators), focusing only on actual peripherals.
- **Dynamic Refresh**: Set the external device rescanning interval to 1 hour 30 minutes to balance "live" accuracy with system performance.

### Patch: 2026-05-09 — External Devices, dxcam & Qt Fixes

- **External Device Detection** (`ui/system_page.py`): The System tab now shows a dedicated **External Devices** section at the bottom with three panels:
  - **🖥️ Connected Monitors**: Lists each display with name, manufacturer, resolution, refresh rate, and DPI — detected via WMI `Win32_DesktopMonitor` + Qt `QScreen`.
  - **📡 Bluetooth Devices**: Lists all paired/connected Bluetooth devices (headsets, keyboards, dongles, controllers) with status — via WMI `Win32_PnPEntity`.
  - **🔌 USB & Input Devices**: Lists connected USB HID peripherals (keyboards, mice, gaming dongles, webcams) — filters generic USB hubs.
- **Fix: dxcam index error** (`config/settings.yaml`): `output_index` was incorrectly set to `1`. Changed to `0` (primary display). Eliminates the startup warning on single-monitor systems.
- **Fix: Qt DPI warning** (`main.py`): `QT_LOGGING_RULES=qt.qpa.window=false` is now set at the very top of `main.py` before any imports, which is the only reliable way to suppress the `SetProcessDpiAwarenessContext() failed` warning caused by pygame-ce.
- **Fix: Update checker 404** (`ui/updater.py`): HTTP 404 from the update URL (file not yet on GitHub) now silently shows "You are up to date" instead of an alarming error message.

### Patch: 2026-05-08 — System & Hardware Dashboard

- **New file `ui/system_page.py`**: Full System & Hardware Diagnostics page replacing the empty placeholder.
  - **WMI-powered hardware detection**: Reads actual CPU model name (e.g. `Intel Core 7 240H`), GPU model (e.g. `NVIDIA GeForce RTX 5050 Laptop GPU`), RAM type/speed (DDR4/DDR5, MHz), storage model and type (NVMe SSD), and display resolution/refresh rate — no more raw CPUID strings.
  - **Live metric cards** (update every second): CPU utilization + clock speed, RAM usage in GB, GPU VRAM usage + temperature via `pynvml`, and primary disk usage.
  - **Gradient progress bars**: Color-coded per component (Blue → CPU, Purple → RAM, Green → GPU, Orange → Disk).
  - **Six static specification panels**: Processor, Memory, Graphics, Storage, Display, and Operating System.
  - **Background monitoring thread** (`SystemMonitorThread`): Runs on a separate QThread, fully non-blocking, zero impact on game FPS.
  - **Dependencies added**: `wmi`, `nvidia-ml-py (pynvml)`, `psutil`.

### Patch: 2026-05-08 — Full Settings Page Implementation

- **New file `ui/settings_page.py`**: Replaced the empty Settings tab with a fully functional configuration UI.
  - **Reads and writes** `config/settings.yaml` live — changes persist across app restarts.
  - **Eight configuration sections**:
    | Section | Controls |
    |---|---|
    | 🎮 Game Mode | `competitive / story / hybrid` dropdown |
    | 📸 Screen Capture | Target window, backend, FPS cap, GPU adapter & display output indices |
    | ⚙️ Processing Pipeline | Capture Hz, Vision Hz, AI Brain Hz, threading toggle |
    | 👁️ Vision Detection | Detector backend, YOLO model path, GPU device |
    | 🔤 OCR | Enable/disable, dynamic mode, backend, run-every-N-frames |
    | 🖥️ Overlay | Toggle FPS counter, GPU stats, DLSS tips, scene type, input device |
    | 🎙️ Voice | TTS enable, speech rate (WPM) |
    | 🧠 Memory | Session memory enable, save path, auto-save interval |
    | ⚡ NVIDIA Advisor | Target FPS, low/critical thresholds, GPU%, VRAM%, temp limits |
  - **TickCheckBox**: Custom `QCheckBox` subclass using `QPainter` to draw a crisp white tick mark when checked — replaces plain blue squares.
  - **Styled SpinBoxes**: Full `▲ ▼` arrow buttons with hover highlight, triangle CSS arrows, proper sizing so arrows are never clipped.
  - **💾 Save bar**: Pinned to bottom with live `✔ Saved successfully!` / `✘ Error` feedback toast that clears after 3 seconds.

### Patch: 2026-05-08 — In-App Auto-Update System

- **New file `ui/updater.py`**: Full self-update pipeline integrated into the sidebar.
  - **`UpdateChecker` (QThread)**: Silently checks the remote `version.json` on GitHub on every startup. Shows the `⬇` icon only when a newer version exists.
  - **`UpdateDialog`**: Scrollable changelog window showing all previous and latest version patch notes with color-coded version badges and a **LATEST** marker.
  - **`DownloadDialog`**: Progress screen that runs `git pull --rebase` + `uv sync` in a background thread, then auto-restarts the app.
  - **`_UpdateWorker` (QThread)**: Handles the actual update commands; reports each step live to the progress screen.
- **New file `version.json`**: Single source of truth for the current version, changelog, and remote update URL. The sidebar version label, update checker, and changelog dialog all read from this file dynamically — no hardcoded version strings anywhere.
- **New file `scripts/bump_version.py`**: Developer CLI to auto-increment version and prepend a new changelog entry to `version.json` with one command:
  ```powershell
  uv run python scripts/bump_version.py --bump patch --title "Fix X" --changes "Fixed Y" "Added Z"
  ```
- **`ui/main_window.py`**: Sidebar footer now reads version from `version.json` dynamically. The `⬇` button is hidden by default and pulses 3× green when an update is detected. Clicking opens the UpdateDialog.
- **`packaging`** library added as a dependency (used for semantic version comparison `v0.2.0 > v0.1.0`).

### Patch: 2026-05-09 — Tactical Coach & Memory Page

- **New file `ui/coach_page.py`**: Fully implemented the previously empty Coach tab.
  - **AI Advice card**: Displays live output from `GameBrain.analyze_state()` — colour-coded by priority (`critical` → red, `high` → orange, `medium` → yellow, `low` → green) with matching category icons (⚔️ combat, ❤️ health, 📖 story, 🗺️ exploration).
  - **Session stat counters**: Combats, Dialogues, Deaths, Total Frames, and a live Session Timer — all fed from `GameMemory.stats`.
  - **Scene Time Distribution**: Horizontal mini-bar chart showing the percentage of time spent in each scene type (combat, exploration, dialogue, etc.) over the last 100 frames.
  - **Quest Log**: Scrollable list of quests captured by `StoryAnalyzer._quest_log`, newest first.
  - **Dialogue History**: Last 8 dialogue entries from `StoryAnalyzer._dialogue_history` with timestamps.
  - **Recent Events feed**: Last 12 `GameMemory` events (combat_start, dialogue, scene_change, death, etc.) with icons and timestamps.
- **`ui/pipeline_thread.py`**: Added `coach_state_ready = pyqtSignal(dict)` and `_coach_callback()` that emits it on each brain tick.
- **`main.py` (`_process_brain`)**: After every AI reasoning tick, builds and pushes a `coach_state` dict containing `advice`, `priority`, `category`, `session_stats`, `scene_dist`, `quest_log`, `dialogue_history`, and `recent_events` via `self.coach_callback`.
- **`ui/desktop_app.py`**: Connected `pipeline_host.coach_state_ready` → `window.coach_page.update_state`.

### Patch: 2026-05-09 — Pipeline Shutdown RuntimeError Fix

Two `RuntimeError: wrapped C/C++ object ... has been deleted` crashes fixed:

- **Root cause**: The `PipelineHost` daemon thread continued emitting Qt signals after PyQt had already deleted the C++ wrappers for `PipelineThread` and `QtLogSignals` during window teardown.
- **`ui/pipeline_thread.py`** — complete rewrite of shutdown logic:
  - Added `self._alive = threading.Event()` — cleared immediately when teardown begins, checked by `_frame_callback` and `_coach_callback` before every `emit()`.
  - Both callbacks now also catch `RuntimeError` and call `self._alive.clear()` to permanently silence further emissions.
  - `stop_pipeline()` now: clears `_alive` → calls `pipeline.stop()` → **joins the daemon thread** (`timeout=3 s`) before returning, ensuring the display loop exits before Qt frees C++ objects.
- **`QtLogHandler`** — added `close()` method that sets `self._alive = False`; `emit()` silently drops log records when `_alive` is `False` or a `RuntimeError` occurs.
- **`ui/desktop_app.py`** — new `_safe_close()` override on `window.closeEvent`:
  1. `qt_handler.close()` — kills log emissions immediately
  2. `pipeline_host.stop_pipeline()` — stops pipeline + joins thread (≤3 s)
  3. `_orig_close(event)` — original Qt close logic runs last

---

#### Technical Notes on Behavior Changes

- **How to re-enable or tune behavior**
  - To re-enable the simple color/heuristic detector, set `vision.detector: "simple"` in `config/settings.yaml`. This uses the legacy color-based heuristics but is not recommended for desktop/browsing scenarios.
  - For reliable, game-specific HUD reading, enable OCR in `config/settings.yaml` (set `vision.ocr.enabled: true`) and tune `vision.health_bar.roi` to your game's health bar location. OCR-based health extraction is the recommended approach for accurate in-game metrics.

- **Testing / Validation (quick checks)**
  1. Ensure your chosen detector is available:
     - TensorRT engine: `vision/yolov8n.engine` referenced by `vision.yolo_model` in `config/settings.yaml`.
     - PyTorch fallback: keep `yolov8n.pt` in the project root if you want ultralytics to load the model.
  2. Run the assistant (from the project root virtual env):
     ```powershell
     uv run python main.py
     ```
  3. What to expect:
     - No more spurious `Health: 100%` or `Perf: 100/100` overlays while browsing the desktop.
     - Bounding boxes with real class labels (e.g., `person`, `car`, `cup`) when detections are present.
     - Voice `status` reports a count of actively tracked objects.
  4. Toggle overlay behavior in `config/settings.yaml` under the `overlay` section (`show_scene_type`, `show_gpu_stats`, `show_fps`).
