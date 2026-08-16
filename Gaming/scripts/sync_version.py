#!/usr/bin/env python3
"""
sync_version.py — Synchronizes the latest version from backend/version.json
across all frontend/website package.json files, pyproject.toml, and documentation files.
"""
import json
import os
import re
from datetime import date

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERSION_FILE = os.path.join(BASE_DIR, "backend", "version.json")

def sync():
    if not os.path.exists(VERSION_FILE):
        print(f"Error: {VERSION_FILE} not found.")
        return

    with open(VERSION_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    latest_ver = data.get("version")
    changelog = data.get("changelog", [])
    latest_entry = changelog[0] if changelog else {
        "version": latest_ver,
        "date": str(date.today()),
        "title": "Latest Release",
        "highlights": ["Performance and stability improvements."]
    }

    print(f"[*] Syncing Mission Control version: v{latest_ver}")

    # 1. Frontend package.json
    frontend_pkg = os.path.join(BASE_DIR, "frontend", "package.json")
    if os.path.exists(frontend_pkg):
        with open(frontend_pkg, "r", encoding="utf-8") as f:
            content = f.read()
        updated = re.sub(r'(?m)^(\s*"version"\s*:\s*)"[^"]+"', rf'\g<1>"{latest_ver}"', content, count=1)
        with open(frontend_pkg, "w", encoding="utf-8") as f:
            f.write(updated)
        print(" -> frontend/package.json synchronized")

    # 2. Website package.json
    website_pkg = os.path.join(BASE_DIR, "website", "package.json")
    if os.path.exists(website_pkg):
        with open(website_pkg, "r", encoding="utf-8") as f:
            content = f.read()
        updated = re.sub(r'(?m)^(\s*"version"\s*:\s*)"[^"]+"', rf'\g<1>"{latest_ver}"', content, count=1)
        with open(website_pkg, "w", encoding="utf-8") as f:
            f.write(updated)
        print(" -> website/package.json synchronized")

    # 3. Backend pyproject.toml
    backend_toml = os.path.join(BASE_DIR, "backend", "pyproject.toml")
    if os.path.exists(backend_toml):
        with open(backend_toml, "r", encoding="utf-8") as f:
            content = f.read()
        updated = re.sub(r'(?m)^version\s*=\s*"[^"]+"', f'version = "{latest_ver}"', content, count=1)
        with open(backend_toml, "w", encoding="utf-8") as f:
            f.write(updated)
        print(" -> backend/pyproject.toml synchronized")

    # 4. SUMMARY.md
    summary_file = os.path.join(BASE_DIR, "docs", "SUMMARY.md")
    if os.path.exists(summary_file):
        with open(summary_file, "r", encoding="utf-8") as f:
            content = f.read()
        if f"v{latest_ver} (Latest)" not in content:
            # Strip previous (Latest)
            content = content.replace(" (Latest)**", "**")
            marker = "## 🔄 Recent Changes\n\n| Version | Key Feature / Change Description |\n| :--- | :--- |"
            if marker in content:
                desc = latest_entry.get("highlights", ["Latest release features and fixes"])[0]
                new_row = f"\n| **v{latest_ver} (Latest)** | **{latest_entry['title']}** — {desc} |"
                split_idx = content.find(marker) + len(marker)
                content = content[:split_idx] + new_row + content[split_idx:]
            with open(summary_file, "w", encoding="utf-8") as f:
                f.write(content)
            print(" -> docs/SUMMARY.md synchronized")

    print(f"[SUCCESS] All modules & docs fully synchronized to v{latest_ver}")

if __name__ == "__main__":
    sync()
