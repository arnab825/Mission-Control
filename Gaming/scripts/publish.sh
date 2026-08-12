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
cd "$(dirname "$0")/.."

# 1. Bump version and sync version files
python3 scripts/bump_version.py --bump patch --title "$TITLE" --changes "$TITLE"

# 2. Stage version release files for commit
git add backend/version.json frontend/package.json website/package.json backend/pyproject.toml docs/backend/patches.md docs/changes_summary.md readme.md

VERSION=$(python3 -c "import json; print(json.load(open('backend/version.json'))['version'])")

echo -e "\033[0;36m[COMMIT] Creating release v${VERSION}\033[0m"
git commit -m "Release v${VERSION}: $TITLE" || true
git tag -a "v${VERSION}" -m "Release v${VERSION}: $TITLE" || true

# 3. Build Linux Electron Binaries (.AppImage, .deb, .rpm, .tar.gz)
echo -e "\033[0;36m[BUILD] Compiling Linux packages for v${VERSION}...\033[0m"
cd frontend
npm run build

# Generate release notes markdown for GitHub Releases
RELEASE_TITLE="Release v${VERSION}: ${TITLE}"
cat <<EOF > release-notes.md
# ${RELEASE_TITLE}

- ${TITLE}
EOF

if [ -n "$GH_TOKEN" ] || [ -n "$GITHUB_TOKEN" ]; then
    echo -e "\033[0;36m[PUBLISH] GH_TOKEN detected! Publishing ${RELEASE_TITLE} to GitHub Releases...\033[0m"
    if grep -q -i microsoft /proc/version 2>/dev/null || [ -d "/mnt/c" ]; then
        echo -e "\033[0;33m[WSL DETECTED] Building Linux tar.gz package on Windows host...\033[0m"
        npx electron-builder --linux tar.gz --publish always --config.extraMetadata.name="${RELEASE_TITLE}"
    else
        npx electron-builder --linux --publish always --config.extraMetadata.name="${RELEASE_TITLE}"
    fi
else
    echo -e "\033[0;33m[BUILD] Compiling local Linux binaries in frontend/out/dist...\033[0m"
    if grep -q -i microsoft /proc/version 2>/dev/null || [ -d "/mnt/c" ]; then
        echo -e "\033[0;33m[WSL DETECTED] Building Linux tar.gz package on Windows host...\033[0m"
        npx electron-builder --linux tar.gz --x64
    else
        npm run make:linux
    fi
fi

cd ..

# 4. Push code and tags to GitHub
echo -e "\033[0;36m[PUSH] Pushing code and tags to GitHub...\033[0m"
git push origin main --tags

echo -e "\033[0;32m[SUCCESS] Mission Control v${VERSION} (Windows & Linux) is tagged and live!\033[0m"
