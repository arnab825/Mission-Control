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

    enriched = enrich_with_ai(entry["title"], entry.get("highlights", []), entry["version"])
    short_desc = enriched.get("short_desc", entry.get("highlights", ["Stability & performance update"])[0])

    save(data)
    update_package_files(new_ver)
    update_patches_md(entry)
    update_summary_md(entry, short_desc)
    update_changes_summary_md(entry, enriched)
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
        os.path.join(base_dir, "backend", "dist", "MissionControlBackend", "_internal", "version.json"),
        os.path.join(base_dir, "backend", "dist", "MissionControlBackend", "version.json"),
        os.path.join(base_dir, "frontend", "backend", "MissionControlBackend", "_internal", "version.json"),
        os.path.join(base_dir, "frontend", "backend", "MissionControlBackend", "version.json"),
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

    new_entry = f"### Patch: {entry['date']} — v{entry['version']}: {entry['title']}\n\n"
    
    if "image_url" in entry:
        new_entry += f"![Preview]({entry['image_url']})\n\n"
        
    for highlight in entry["highlights"]:
        new_entry += f"- {highlight}\n"
    new_entry += "\n"

    marker = "### Patch:"
    index = content.find(marker)
    if index != -1:
        updated_content = content[:index] + new_entry + content[index:]
    else:
        updated_content = content + "\n" + new_entry

    with open(PATCHES_FILE, "w", encoding="utf-8") as f:
        f.write(updated_content)
    print(f"patches.md updated with v{entry['version']}")


def update_summary_md(entry, short_desc: str):
    """Automatically update the Recent Changes table in Gaming/docs/SUMMARY.md (Website Project Summary)."""
    summary_file = os.path.join(os.path.dirname(__file__), "..", "docs", "SUMMARY.md")
    if not os.path.exists(summary_file):
        return

    with open(summary_file, "r", encoding="utf-8") as f:
        content = f.read()

    # Find the Recent Changes section header
    marker = "## 🔄 Recent Changes\n\n| Version | Key Feature / Change Description |\n| :--- | :--- |"
    alt_marker = "## 🔄 Recent Changes\n\n| Version | Change |\n| :--- | :--- |"
    
    found_marker = marker if marker in content else (alt_marker if alt_marker in content else None)
    if not found_marker:
        return

    # Strip existing "(Latest)" tags from previous versions
    content = content.replace(" (Latest)**", "**")

    # Clean short description
    clean_desc = short_desc.strip().rstrip(".")
    new_row = f"\n| **v{entry['version']} (Latest)** | **{entry['title']}** — {clean_desc}. |"

    # Insert right after header separator
    split_idx = content.find(found_marker) + len(found_marker)
    updated_content = content[:split_idx] + new_row + content[split_idx:]

    with open(summary_file, "w", encoding="utf-8") as f:
        f.write(updated_content)
    print(f"SUMMARY.md (Website Project Summary) updated -> v{entry['version']} added to Recent Changes")


def generate_mermaid_diagram(title: str, highlights: list) -> str:
    """Generate a Mermaid architectural flow diagram based on the title and release highlights."""
    text = (title + " " + " ".join(highlights)).lower()
    
    if "mobile" in text or "responsive" in text or "ui" in text or "css" in text or "layout" in text:
        return """```mermaid
graph TD
    A[Mobile Client / DevTools (320px+)] --> B[Responsive CSS & Layout Container]
    B --> C[DocsClient Component & Cards]
    C --> D[MobileDocsSidebar Drawer & Header Bar]
    D --> E[Real-Time Mongo Telemetry & Render]
```"""
    elif "vision" in text or "yolo" in text or "camera" in text:
        return """```mermaid
graph TD
    A[Game Screen Frame Capture] --> B[YOLO Vision Inference Engine]
    B --> C[Detection Telemetry & Bounding Boxes]
    C --> D[Electron HUD Overlay]
```"""
    elif "backend" in text or "api" in text or "fastapi" in text or "python" in text:
        return """```mermaid
graph TD
    A[Electron Main IPC Engine] --> B[FastAPI Backend Host]
    B --> C[NVIDIA NIM AI Cloud Inference]
    C --> D[Directive Stream & Telemetry Bridge]
```"""
    else:
        return """```mermaid
graph TD
    A[Developer Push / Publish Pipeline] --> B[Version Stamping & AI Changelog Enforcer]
    B --> C[Mission Control System Core]
    C --> D[Website Documentation & Real-Time Sync]
```"""


def enrich_with_ai(title: str, raw_changes: list, version: str) -> dict:
    """Attempt concise, low-token AI enrichment via NVIDIA NIM API; fallback to smart rule-based enrichment."""
    api_key = os.environ.get("NVIDIA_API_KEY")
    if not api_key:
        for env_path in [
            os.path.join(os.path.dirname(__file__), "..", ".env"),
            os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
            os.path.join(os.path.dirname(__file__), "..", "website", ".env.local"),
        ]:
            if os.path.exists(env_path):
                try:
                    with open(env_path, "r", encoding="utf-8") as f:
                        for line in f:
                            if line.startswith("NVIDIA_API_KEY="):
                                val = line.split("=", 1)[1].strip().strip('"').strip("'")
                                if val and not val.startswith("your_"):
                                    api_key = val
                                    break
                except Exception:
                    pass

    if api_key and not api_key.startswith("your_"):
        try:
            import urllib.request
            import json

            prompt = f"""You are the release engineer for Mission Control. Generate a concise 1-sentence feature summary and 2-3 short bullet points for v{version}.

Title: {title}
Changes: {'; '.join(raw_changes)}

Respond ONLY with valid JSON:
{{
  "short_desc": "Single crisp sentence describing the primary update",
  "highlights": ["Short bullet 1", "Short bullet 2"],
  "technical_decisions": "1 concise sentence on architecture optimization."
}}"""

            req = urllib.request.Request(
                "https://integrate.api.nvidia.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                data=json.dumps({
                    "model": "meta/llama-3.1-8b-instruct",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 250
                }).encode("utf-8")
            )

            with urllib.request.urlopen(req, timeout=8) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                content = res_data["choices"][0]["message"]["content"]
                parsed = json.loads(content)
                print(f"[AI ENRICHER] Concise release summary auto-generated via NVIDIA NIM (low-token consumption)!")
                return parsed
        except Exception as e:
            print(f"[AI ENRICHER] Notice ({e}). Using smart rule-based enricher.")

    # Rule-based fallback
    highlights = [c.strip() for c in raw_changes if c.strip()]
    short_desc = highlights[0] if highlights else "Performance & telemetry stability updates"
    tech_decisions = f"Automated version bump and telemetry synchronization for Version v{version}. Ensures all backend pipelines and website documentation remain aligned in real-time."
    mermaid = generate_mermaid_diagram(title, highlights)
    file_changes = [
        {"file": "backend/version.json", "status": "Updated", "desc": f"Bumped version tag to v{version}"},
        {"file": "Gaming/docs/SUMMARY.md", "status": "Updated", "desc": "Updated Recent Changes table for website documentation"},
        {"file": "Gaming/docs/changes_summary.md", "status": "Updated", "desc": "Appended release history entry with Mermaid flowchart"},
        {"file": "frontend/package.json", "status": "Updated", "desc": "Synchronized npm package version"}
    ]
    return {
        "short_desc": short_desc,
        "highlights": highlights,
        "technical_decisions": tech_decisions,
        "mermaid_diagram": mermaid,
        "file_changes": file_changes
    }


def update_changes_summary_md(entry, enriched: dict):
    changes_file = os.path.join(os.path.dirname(__file__), "..", "docs", "changes_summary.md")
    if not os.path.exists(changes_file):
        return

    with open(changes_file, "r", encoding="utf-8") as f:
        content = f.read()

    # Calculate next Session number automatically
    session_matches = re.findall(r'## Session (\d+)', content)
    if session_matches:
        next_session = max(int(s) for s in session_matches) + 1
    else:
        next_session = 1

    new_entry = f"\n---\n\n## Session {next_session} — {entry['date']}: {entry['title']} (v{entry['version']})\n\n"
    new_entry += "### 🛠️ Key Features Added/Modified\n"
    for idx, highlight in enumerate(enriched.get("highlights", entry.get("highlights", [])), 1):
        new_entry += f"{idx}. **{highlight}**\n"

    if enriched.get("technical_decisions"):
        new_entry += f"\n### 🧩 Technical Decisions & Architecture\n* {enriched['technical_decisions']}\n"

    if enriched.get("mermaid_diagram"):
        diag = enriched["mermaid_diagram"].strip()
        if not diag.startswith("```"):
            diag = f"```mermaid\n{diag}\n```"
        new_entry += f"\n### 📊 System Architecture & Flow\n{diag}\n"

    if enriched.get("file_changes"):
        new_entry += "\n### 📋 File Changes\n| File | Status | Description |\n|---|---|---|\n"
        for fc in enriched["file_changes"]:
            new_entry += f"| `{fc['file']}` | **{fc['status']}** | {fc['desc']} |\n"

    if "image_url" in entry:
        new_entry += f"\n![Preview]({entry['image_url']})\n"

    new_content = content.rstrip() + "\n" + new_entry

    with open(changes_file, "w", encoding="utf-8") as f:
        f.write(new_content)
    print(f"changes_summary.md updated -> enriched release entry added for v{entry['version']}")


if __name__ == "__main__":
    main()
