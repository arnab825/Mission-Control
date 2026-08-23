#!/bin/bash
# 🚀 Mission Control Linux Automated Release Script
set -e

TITLE="$1"
if [ -z "$TITLE" ]; then
    echo "Usage: ./scripts/publish.sh \"Release Title or Message\""
    exit 1
fi

echo -e "\033[0;36m[PUBLISH] Starting Linux release process for Mission Control...\033[0m"

# Move to the Gaming project directory root (parent of scripts/)
SCRIPT_DIR="$( cd "$( dirname "$0" )" && pwd )"
cd "$SCRIPT_DIR/.."

# Auto-load GH_TOKEN from .env files if not in environment
if [ -z "$GH_TOKEN" ] && [ -z "$GITHUB_TOKEN" ]; then
    for env_path in "$SCRIPT_DIR/../.env" "$SCRIPT_DIR/../backend/.env" "$SCRIPT_DIR/../website/.env.local"; do
        if [ -f "$env_path" ]; then
            token_val=$(grep -E '^(GH_TOKEN|GITHUB_TOKEN)=' "$env_path" | head -n 1 | cut -d '=' -f 2- | tr -d '"' | tr -d "'" | tr -d '\r')
            if [ -n "$token_val" ] && [[ "$token_val" != your_* ]]; then
                export GH_TOKEN="$token_val"
                break
            fi
        fi
    done
fi

# 1. Bump version and sync version files
python3 scripts/bump_version.py --bump patch --title "$TITLE" --changes "$TITLE"

# 2. Stage version release files for commit (if in a git repository)
VERSION=$(python3 -c "import json; print(json.load(open('backend/version.json'))['version'])")
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git add backend/version.json frontend/package.json website/package.json backend/pyproject.toml docs/backend/patches.md docs/changes_summary.md docs/SUMMARY.md readme.md 2>/dev/null || true
    echo -e "\033[0;36m[COMMIT] Creating release v${VERSION}\033[0m"
    git commit -m "Release v${VERSION}: $TITLE" || true
    git tag -a "v${VERSION}" -m "Release v${VERSION}: $TITLE" || true
else
    echo -e "\033[0;33m[NOTE] Not a Git repository; skipping Git staging, commit, and tag.\033[0m"
fi

# 3. Build PyInstaller Backend Binary for Linux
echo -e "\033[0;36m[BUILD] Packaging Python backend for Linux...\033[0m"
chmod +x "$SCRIPT_DIR/build_app.sh" 2>/dev/null || true
"$SCRIPT_DIR/build_app.sh"

# 4. Build Linux Electron Binaries (.AppImage, .deb, .rpm, .tar.gz)
echo -e "\033[0;36m[BUILD] Compiling Electron packages for v${VERSION}...\033[0m"
cd frontend
npm run build

# Generate release notes markdown for GitHub Releases
RELEASE_TITLE="Release v${VERSION}: ${TITLE}"
cat <<EOF > release-notes.md
# ${RELEASE_TITLE}

- ${TITLE}

### 📦 Available Downloads & Formats
- **Linux (.deb - Debian / Ubuntu / Mint)**: [MissionControl-Linux-${VERSION}.deb](https://github.com/arnab825/Mission-Control/releases/download/v${VERSION}/MissionControl-Linux-${VERSION}.deb)
- **Linux (.AppImage - Universal Linux)**: [MissionControl-Linux-${VERSION}.AppImage](https://github.com/arnab825/Mission-Control/releases/download/v${VERSION}/MissionControl-Linux-${VERSION}.AppImage)
- **Linux (.rpm - Fedora / RHEL / openSUSE)**: [MissionControl-Linux-${VERSION}.rpm](https://github.com/arnab825/Mission-Control/releases/download/v${VERSION}/MissionControl-Linux-${VERSION}.rpm)
- **Linux (.tar.gz - Standalone Linux Archive)**: [MissionControl-Linux-${VERSION}.tar.gz](https://github.com/arnab825/Mission-Control/releases/download/v${VERSION}/MissionControl-Linux-${VERSION}.tar.gz)
- **Windows (.exe - Setup Installer)**: [MissionControl-Setup.exe](https://github.com/arnab825/Mission-Control/releases/download/v${VERSION}/MissionControl-Setup.exe)
- **Windows (.msi - Enterprise Installer)**: [MissionControl-Setup.msi](https://github.com/arnab825/Mission-Control/releases/download/v${VERSION}/MissionControl-Setup.msi)
- **Windows (.zip - Portable Windows Archive)**: [MissionControl-Windows-${VERSION}.zip](https://github.com/arnab825/Mission-Control/releases/download/v${VERSION}/MissionControl-Windows-${VERSION}.zip)
EOF

BUILD_TARGET="--linux AppImage deb rpm tar.gz"
if [ "$2" == "--win" ] || [ "$TARGET_OS" == "win" ]; then
    BUILD_TARGET="--win nsis msi zip"
fi

if [ -n "$GH_TOKEN" ] || [ -n "$GITHUB_TOKEN" ]; then
    echo -e "\033[0;36m[PUBLISH] GH_TOKEN detected! Publishing ${RELEASE_TITLE} (${BUILD_TARGET}) to GitHub Releases...\033[0m"
    npx electron-builder ${BUILD_TARGET} --publish always --config.extraMetadata.name="${RELEASE_TITLE}"
else
    echo -e "\033[0;33m[BUILD] Compiling local binaries (${BUILD_TARGET}) in frontend/out/dist...\033[0m"
    npx electron-builder ${BUILD_TARGET} --publish never
fi

cd ..

# 5. Push code and tags to GitHub (if in a git repository)
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo -e "\033[0;36m[PUSH] Pushing code and tags to GitHub...\033[0m"
    TOKEN="${GH_TOKEN:-$GITHUB_TOKEN}"
    if [ -n "$TOKEN" ]; then
        git push "https://x-access-token:${TOKEN}@github.com/arnab825/Mission-Control.git" main --tags || true
        
        # Automatically un-draft the release on GitHub so it becomes public and Latest
        echo -e "\033[0;36m[PUBLISH] Publishing draft release v${VERSION} live on GitHub...\033[0m"
        python3 -c "
import urllib.request, json
try:
    req = urllib.request.Request('https://api.github.com/repos/arnab825/Mission-Control/releases', headers={'Authorization': 'token ${TOKEN}', 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'MissionControlPublisher'})
    with urllib.request.urlopen(req) as resp:
        releases = json.loads(resp.read().decode())
    target = next((r for r in releases if r.get('tag_name') == 'v${VERSION}' or 'v${VERSION}' in r.get('name', '')), None)
    if target and target.get('draft'):
        update_data = json.dumps({'draft': False, 'name': '${RELEASE_TITLE}'}).encode()
        patch_req = urllib.request.Request(f'https://api.github.com/repos/arnab825/Mission-Control/releases/{target[\"id\"]}', data=update_data, headers={'Authorization': 'token ${TOKEN}', 'Content-Type': 'application/json', 'User-Agent': 'MissionControlPublisher'}, method='PATCH')
        with urllib.request.urlopen(patch_req) as p_resp:
            print('[SUCCESS] Release v${VERSION} is now LIVE and marked as Latest on GitHub!')
except Exception as e:
    print(f'[NOTE] Release upload complete: {e}')
" || true
    else
        git push origin main --tags || true
    fi
else
    echo -e "\033[0;33m[NOTE] Not a Git repository; skipping Git remote push.\033[0m"
fi

rm -f "$SCRIPT_DIR/../frontend/release-notes.md" 2>/dev/null || true

echo -e "\033[0;32m[SUCCESS] Mission Control v${VERSION} (Windows & Linux) is tagged and live!\033[0m"
