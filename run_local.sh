#!/bin/bash
# Mission Control - Linux Local Build & Release Runner
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "\033[0;36m[Mission Control] Initializing Linux build & release pipeline...\033[0m"

# 1. Ensure Woodpecker CLI or Native Bash pipeline
if [ -f "$SCRIPT_DIR/Gaming/scripts/publish.sh" ]; then
    chmod +x "$SCRIPT_DIR/Gaming/scripts/build_app.sh" 2>/dev/null || true
    chmod +x "$SCRIPT_DIR/Gaming/scripts/publish.sh" 2>/dev/null || true

    # Extract version or title
    VERSION=$(python3 -c "import json; print(json.load(open('Gaming/backend/version.json'))['version'])" 2>/dev/null || echo "3.1.8")
    TITLE="${1:-Release v${VERSION}}"
    
    echo -e "\033[0;32m[INFO] Running Linux build for v${VERSION}...\033[0m"
    "$SCRIPT_DIR/Gaming/scripts/publish.sh" "$TITLE"
else
    echo -e "\033[0;31m[ERROR] Could not locate Gaming/scripts/publish.sh\033[0m"
    exit 1
fi
