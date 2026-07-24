#!/usr/bin/env python3
"""
bump_version.py — Auto-update version.json for AI Gaming Assistant
Usage:
    uv run python scripts/bump_version.py --bump patch --title "My fix" --changes "Fixed X" "Added Y"
    uv run python scripts/bump_version.py --bump minor --title "New feature" --changes "Added Z"
    uv run python scripts/bump_version.py --set 1.0.0 --title "Major release" --changes "Full rewrite"
"""
import argparse
import json
import os
import re
import sys
from datetime import date

# Safety limits — prevents accidental binary blobs or CI noise from entering version.json
_MAX_FIELD_LEN = 400
_MAX_CHANGELOG_ENTRIES = 50

VERSION_FILE = os.path.join(os.path.dirname(__file__), "..", "backend", "version.json")


def load():
    with open(VERSION_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save(data):
    with open(VERSION_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"version.json updated -> v{data['version']}")


def bump(current: str, part: str) -> str:
    major, minor, patch = map(int, current.split("."))
    if part == "major":
        return f"{major + 1}.0.0"
    elif part == "minor":
        if minor >= 9:
            return f"{major + 1}.0.0"
        return f"{major}.{minor + 1}.0"
    elif part == "patch":
        if patch >= 9:
            if minor >= 9:
                return f"{major + 1}.0.0"
            return f"{major}.{minor + 1}.0"
        return f"{major}.{minor}.{patch + 1}"
    raise ValueError(f"Unknown bump part: {part}")


def main():
    parser = argparse.ArgumentParser(description="Bump AI Gaming Assistant version")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--bump", choices=["major", "minor", "patch"],
                       help="Auto-increment this part of the version")
    group.add_argument("--set", metavar="X.Y.Z",
                       help="Set an explicit version number")

    parser.add_argument("--title", required=True, help="Short release title")
    parser.add_argument("--changes", nargs="+", required=True,
                        metavar="CHANGE", help="List of change bullet points")
    parser.add_argument("--image", help="Optional URL or path to a preview image")
    parser.add_argument("--date", default=str(date.today()),
                        help="Release date (default: today)")

    args = parser.parse_args()

    # Validate and sanitize all text inputs
    args.title = _sanitize("--title", args.title)
    args.changes = [_sanitize(f"--changes[{i}]", c) for i, c in enumerate(args.changes)]

    data = load()
    old_ver = data["version"]

    if args.set:
        new_ver = args.set
    else:
        new_ver = bump(old_ver, args.bump)

    # Split change strings on semicolons, newlines, or pipes if passed as a single string
    split_changes = []
    for c in args.changes:
        for part in re.split(r'[;\n\|]', c):
            clean_part = part.strip()
            if clean_part:
                split_changes.append(clean_part)

    # Build new changelog entry
    entry = {
        "version": new_ver,
        "date": args.date,
        "title": args.title,
        "highlights": split_changes if split_changes else args.changes
    }
    
    if args.image:
        entry["image_url"] = args.image

    # Prepend to changelog (newest first) and cap size
    data["changelog"].insert(0, entry)
    data["changelog"] = data["changelog"][:_MAX_CHANGELOG_ENTRIES]
    data["version"] = new_ver

    save(data)
    update_package_files(new_ver)
    update_patches_md(entry)
    print(f"   Previous: v{old_ver}")
    print(f"   New     : v{new_ver}")
    print(f"   Title   : {args.title}")
    print(f"   Changes : {len(args.changes)} items")


def update_package_files(new_ver):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # 1. Update frontend/package.json
    frontend_pkg = os.path.join(base_dir, "frontend", "package.json")
    if os.path.exists(frontend_pkg):
        with open(frontend_pkg, "r", encoding="utf-8") as f:
            content = f.read()
        updated = re.sub(r'(?m)^(\s*"version"\s*:\s*)"[^"]+"', rf'\g<1>"{new_ver}"', content, count=1)
        with open(frontend_pkg, "w", encoding="utf-8") as f:
            f.write(updated)
        print(f"frontend/package.json updated -> version = {new_ver}")

    # 2. Update website/package.json
    website_pkg = os.path.join(base_dir, "website", "package.json")
    if os.path.exists(website_pkg):
        with open(website_pkg, "r", encoding="utf-8") as f:
            content = f.read()
        updated = re.sub(r'(?m)^(\s*"version"\s*:\s*)"[^"]+"', rf'\g<1>"{new_ver}"', content, count=1)
        with open(website_pkg, "w", encoding="utf-8") as f:
            f.write(updated)
        print(f"website/package.json updated -> version = {new_ver}")

    # 3. Update backend/pyproject.toml
    backend_toml = os.path.join(base_dir, "backend", "pyproject.toml")
    if os.path.exists(backend_toml):
        with open(backend_toml, "r", encoding="utf-8") as f:
            content = f.read()
        updated = re.sub(r'(?m)^version\s*=\s*"[^"]+"', f'version = "{new_ver}"', content, count=1)
        with open(backend_toml, "w", encoding="utf-8") as f:
            f.write(updated)
        print(f"backend/pyproject.toml updated -> version = {new_ver}")

    # 4. Sync version.json into all PyInstaller dist directories
    import shutil
    src_ver_json = os.path.join(base_dir, "backend", "version.json")
    dist_paths = [
        os.path.join(base_dir, "backend", "dist", "MissionControl", "_internal", "version.json"),
        os.path.join(base_dir, "backend", "dist", "MissionControl", "version.json"),
        os.path.join(base_dir, "frontend", "backend", "MissionControl", "_internal", "version.json"),
        os.path.join(base_dir, "frontend", "backend", "MissionControl", "version.json"),
    ]
    for dp in dist_paths:
        if os.path.exists(os.path.dirname(dp)):
            shutil.copy2(src_ver_json, dp)
            print(f"Synced version.json -> {os.path.relpath(dp, base_dir)}")



def _sanitize(field_name: str, value: str) -> str:
    """Strip non-printable chars and enforce max length to prevent binary blobs."""
    # Keep only printable ASCII + common Unicode letters/punctuation
    cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', value)
    if len(cleaned) > _MAX_FIELD_LEN:
        print(f"WARNING: {field_name} truncated from {len(cleaned)} to {_MAX_FIELD_LEN} chars", file=sys.stderr)
        cleaned = cleaned[:_MAX_FIELD_LEN]
    return cleaned


def update_patches_md(entry):
    PATCHES_FILE = os.path.join(os.path.dirname(__file__), "..", "docs", "backend", "patches.md")
    if not os.path.exists(PATCHES_FILE):
        return

    with open(PATCHES_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    # Create the new patch markdown entry
    new_entry = f"### Patch: {entry['date']} — v{entry['version']}: {entry['title']}\n\n"
    
    if "image_url" in entry:
        new_entry += f"![Preview]({entry['image_url']})\n\n"
        
    for highlight in entry["highlights"]:
        new_entry += f"- {highlight}\n"
    new_entry += "\n"

    # Insert after the header (usually line 3 or 4)
    # We look for the first "### Patch:" and insert before it
    marker = "### Patch:"
    index = content.find(marker)
    if index != -1:
        updated_content = content[:index] + new_entry + content[index:]
    else:
        updated_content = content + "\n" + new_entry

    with open(PATCHES_FILE, "w", encoding="utf-8") as f:
        f.write(updated_content)
    print(f"patches.md updated with v{entry['version']}")


if __name__ == "__main__":
    main()
