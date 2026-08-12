#!/bin/bash
# 🚀 Mission Control Linux Automated Release Script
set -e

TITLE="$1"
if [ -z "$TITLE" ]; then
    echo "Usage: ./scripts/publish.sh \"Release Title or Message\""
    exit 1
fi

echo -e "\033[0;36m[PUBLISH] Starting Linux release process for Mission Control...\033[0m"

# 1. Bump version and sync version files
python3 scripts/bump_version.py --bump patch --title "$TITLE"

# 2. Stage files and tag commit
git add backend/version.json readme.md docs/backend/patches.md
git add .

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
    npx electron-builder --win --linux --publish always --config.extraMetadata.name="${RELEASE_TITLE}"
else
    echo -e "\033[0;33m[BUILD] Compiling local Linux binaries in frontend/out/dist...\033[0m"
    npm run make:linux
fi

cd ..

# 4. Push code and tags to GitHub
echo -e "\033[0;36m[PUSH] Pushing code and tags to GitHub...\033[0m"
git push origin main --tags

echo -e "\033[0;32m[SUCCESS] Mission Control v${VERSION} (Windows & Linux) is tagged and live!\033[0m"
