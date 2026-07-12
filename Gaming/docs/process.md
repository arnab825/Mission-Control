# 🚀 Automated Publishing Process

This document outlines the step-by-step process for releasing a new version of the **AI Gaming Assistant**. The entire pipeline is automated using PowerShell and Python to handle versioning, changelog generation, and GitHub deployment.

---

## 🏁 Quick Release Workflow (Cheat Sheet)

Always execute all commands from the **project root directory** (`Mission-Control`):

### Step 1: Push & tag the code
```powershell
.\Gaming\scripts\publish.ps1 "Fixed telemetry issues and version mismatch"
```
*(This bumps the version in config files, commits the updates, tags it, and pushes to GitHub).*

### Step 2: Build the Installer
```powershell
.\run_local.ps1
```
* **Enter GITHUB_TOKEN** when prompted (if not set).
* *Note: The version tag is automatically detected from the project files. You no longer need to enter it manually.*

---

## 🛠️ Step 1: Prepare Your Release
Before triggering a publish, ensure you have:
1.  **Verified Stability**: Ensure the application launches without errors.
2.  **Media (Optional)**: If you want to include a visual preview in the release notes, have an image URL or local path ready.
3.  **Clean Workspace**: It's recommended to commit large binary changes separately before running the release script.

## 📦 Step 2: Run the Publish Script
The `publish.ps1` script is your one-stop tool for all release types. Open PowerShell in the **project root directory** (`Mission-Control`) and choose a mode:

### Mode A: Simple Patch (Recommended for quick fixes)
If you just have a single fix or small update, use the simplified one-argument syntax. This automatically bumps the **patch** version.
```powershell
.\Gaming\scripts\publish.ps1 "Fixed WiFi SSID detection logic"
```

### Mode B: GUI Release (Recommended for detailed releases)
For an easier experience when writing long descriptions or multi-line changes, use the new interactive Windows Forms GUI:
```powershell
.\Gaming\scripts\gui_publish.ps1
```
This will open a window where you can fill in the Title, Type, Changes, and Image URL, then automatically pass them to the publish script.

### Mode C: Detailed Release
Use this mode for major updates where you want to list multiple features and specify the version bump type.
```powershell
.\Gaming\scripts\publish.ps1 "Agentic AI Update" "Integrated NVIDIA NIM" "Added Racing genre support" -Type minor
```

### Mode D: Visual Release (With Optional Image)
Include an image in your release notes by using the `-Image` parameter.
```powershell
.\Gaming\scripts\publish.ps1 "New HUD Aesthetics" -Image "https://i.imgur.com/example.png"
```

### Mode E: Manual Version Release (Override Auto-Bump)
If you want to set an **exact, specific version number** (e.g., forcing a jump to `2.2.0` or resetting versions), use the `-Version` parameter:
```powershell
.\Gaming\scripts\publish.ps1 "Forcing release version" -Version "2.2.0"
```

---

## 🏗️ Release Build Architecture (Woodpecker CI)

When you trigger `.\run_local.ps1`, the pipeline executes the following sequence:

1. **`backend-deps`**: Creates an isolated virtual environment and installs dependencies using `uv`.
2. **`stamp-version`** (Critical Order): Updates the release version in **both** `Gaming/frontend/package.json` and `Gaming/backend/version.json` using the tag version. 
   > [!NOTE]
   > Stamping is executed *before* backend compilation so that the correct version number is permanently compiled into the PyInstaller binary.
3. **`compile-backend`**: Bundles the Python code into a standalone binary using PyInstaller.
   * **Bundle Optimization**: To avoid compilation stutters, dynamic import errors (such as ChromaDB telemetry/posthog failures), and package bloat, the [MissionControl.spec](file:///c:/GitHub/Mission-Control/Gaming/backend/MissionControl.spec) file dynamically walks ChromaDB to include all submodules while explicitly excluding unused vector adapters from `mem0` (like Weaviate, Pinecone, Milvus) and `chromadb` testing packages.
4. **`move-backend`**: Copies `dist/MissionControl` to `Gaming/frontend/backend/MissionControl`.
5. **`package-electron`**: Packages the Electron application containing the compiled backend.
6. **`build-nsis`**: Generates the `MissionControl-Setup.exe` installer.
7. **`release`**: Publishes the setup installer and `latest.yml` as release assets on GitHub.

---

## ⚙️ C# Telemetry Helper (`HardwareMonitor`)

The application queries hardware telemetries (temperature, frequency, power) on Windows via a native C# sub-process located at [Gaming/backend/system/hardware_monitor](file:///c:/GitHub/Mission-Control/Gaming/backend/system/hardware_monitor).

### Rebuilding the DLL
If you modify [Program.cs](file:///c:/GitHub/Mission-Control/Gaming/backend/system/hardware_monitor/Program.cs):
1. Rebuild the Release binary from the project root:
   ```powershell
   cd Gaming/backend/system/hardware_monitor
   dotnet build -c Release
   ```
2. Re-staging and committing the output DLL (`bin/Release/net10.0/HardwareMonitor.dll`) is required for the changes to take effect in the PyInstaller bundler.

### CPU Telemetry Logic
* **Utilization**: Gathered via standard `psutil.cpu_percent` to match Windows Task Manager and AWCC exactly.
* **Frequency**: Prioritizes direct CPU Core clocks (MSR readings) retrieved from the C# helper process.
* **Temperature**: Prioritizes AMD `Tdie` over `Tctl` to bypass the artificial +20°C offset on AMD Ryzen CPUs.

---

## 🔍 Parameters Reference

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `Title` | String | (Mandatory) The main headline for the release. |
| `Changes` | List | (Optional) Multi-line bullet points for the changelog. |
| `-Type` | Enum | Bumps `patch` (default), `minor`, or `major` version. |
| `-Image` | String | URL or local path to a preview image for the patch notes. |
| `-Version` | String | (Optional) Explicit version number to force (e.g., `2.2.0`), bypassing auto-bump. |

---

## 💡 Troubleshooting

### Terminal Compatibility
The scripts use text-based status markers (e.g., `[BUMP]`, `[SYNC]`) instead of emojis to ensure they work in all Windows terminal environments without encoding issues.

### Version Mismatch
If the version in `version.json` gets out of sync with your Git tags, you can manually set a version using the Python script directly:
```powershell
uv run python scripts/bump_version.py --set 0.4.0 --title "Reset" --changes "Manual reset"
```

---

## 🖥️ Application UI Demos

Here are visual reference screenshots of the compiled **Mission Control** interface:

### 1. Central System Dashboard
Displays active telemetry indicators (CPU utilization, GPU load, RAM constraints, and Disk diagnostics) in a clean dark UI, alongside strategic agent event logs.

![Central Dashboard](./images/dashboard_demo.png)

### 2. Game Library Launcher
Aggregates local system launchers (Xbox App, EA Desktop, Epic Games) in one centralized interface for easy deployment.

![Library Launcher](./images/library_demo.png)
