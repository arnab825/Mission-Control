#!/bin/bash
# Mission Control - Linux Build Script
# Packages the Python backend into a standalone Linux executable.

set -e

SCRIPT_DIR="$( cd "$( dirname "$0" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/../backend"

echo -e "\033[0;36m[BUILD] Starting Linux backend packaging for MissionControl...\033[0m"

cd "$BACKEND_DIR"

# Generate logo.ico if missing
if [ ! -f "logo.ico" ]; then
    echo -e "\033[0;33m[INFO] Generating logo.ico from frontend logo...\033[0m"
    PNG_PATH="$SCRIPT_DIR/../frontend/public/logo.png"
    if [ -f "$PNG_PATH" ]; then
        uv run python3 -c "from PIL import Image; img = Image.open('$PNG_PATH'); img.save('logo.ico', format='ICO', sizes=[(16,16), (32,32), (48,48), (64,64), (128,128), (256,256)])" 2>/dev/null || true
    fi
fi

# Determine runner command (prefer uv if available, fallback to python3/pyinstaller)
if command -v uv >/dev/null 2>&1; then
    RUN_CMD="uv run"
    PIP_CMD="uv pip install"
else
    RUN_CMD=""
    PIP_CMD="python3 -m pip install"
fi

# Ensure PyInstaller is installed
if ! $RUN_CMD pyinstaller --version >/dev/null 2>&1; then
    echo -e "\033[0;36m[INFO] Installing PyInstaller...\033[0m"
    $PIP_CMD pyinstaller
fi

echo -e "\033[0;33m[BUILD] Running PyInstaller for Linux backend...\033[0m"

if [ -f "MissionControl.spec" ]; then
    $RUN_CMD pyinstaller --noconfirm --clean MissionControl.spec
else
    $RUN_CMD pyinstaller --noconfirm --clean --noconsole --name MissionControlBackend main.py
fi

DIST_FOLDER="dist/MissionControlBackend"
if [ -d "$DIST_FOLDER" ]; then
    chmod +x "$DIST_FOLDER/MissionControlBackend" 2>/dev/null || true
    echo -e "\033[0;32m[SUCCESS] Compiled Linux backend ready at $DIST_FOLDER for Electron packaging.\033[0m"
else
    echo -e "\033[0;31m[FAILURE] PyInstaller build failed to create $DIST_FOLDER.\033[0m"
    exit 1
fi
