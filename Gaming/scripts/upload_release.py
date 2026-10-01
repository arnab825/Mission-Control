#!/usr/bin/env python3
"""
Upload Mission Control release binaries and metadata to GitHub Releases.
"""

import os
import sys
import json
import mimetypes
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

def find_token() -> str:
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if token:
        return token
    
    scripts_dir = Path(__file__).resolve().parent
    env_paths = [
        scripts_dir / ".." / "publisher-gui" / ".env",
        scripts_dir / ".." / "backend" / ".env",
        scripts_dir / ".." / "frontend" / ".env",
        scripts_dir / ".." / "website" / ".env",
        scripts_dir / ".." / ".." / ".env",
    ]
    for p in env_paths:
        if p.exists():
            try:
                for line in p.read_text(encoding="utf-8").splitlines():
                    line = line.strip()
                    if line.startswith("GH_TOKEN=") or line.startswith("GITHUB_TOKEN="):
                        val = line.split("=", 1)[1].strip().strip('"').strip("'")
                        if val:
                            return val
            except Exception:
                pass
    return ""

def get_latest_version_info():
    scripts_dir = Path(__file__).resolve().parent
    version_json = scripts_dir / ".." / "backend" / "version.json"
    data = json.loads(version_json.read_text(encoding="utf-8"))
    version = data.get("version", "3.4.1")
    changelog = data.get("changelog", [])
    entry = next((c for c in changelog if c.get("version") == version), changelog[0] if changelog else {})
    return version, entry

def github_request(url: str, token: str, method: str = "GET", data: bytes = None, headers: dict = None):
    req_headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "MissionControl-ReleasePublisher",
    }
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            content = resp.read()
            if not content:
                return {}
            return json.loads(content.decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8") if e.fp else ""
        print(f"[HTTP {e.code}] {e.reason}: {body}", file=sys.stderr, flush=True)
        raise

def main():
    token = find_token()
    if not token:
        print("[ERROR] No GH_TOKEN or GITHUB_TOKEN found. Cannot publish release.", file=sys.stderr, flush=True)
        sys.exit(1)

    version, entry = get_latest_version_info()
    tag_name = f"v{version}"
    title = entry.get("title", f"Release v{version}")
    release_name = f"Release {tag_name}: {title}" if not title.startswith("Release") else title
    highlights = entry.get("highlights", [])
    
    highlights_md = "\n".join(f"- {h}" for h in highlights)
    body_md = f"""## What's Changed in {tag_name}

{highlights_md}

### 🚀 Fast Install via Windows Package Manager (Winget)
```powershell
winget install arnab825.MissionControl
```

### 📦 Downloads & Installers
- **Windows (.exe - Setup Installer)**: [{f"MissionControl-Setup.exe"}](https://github.com/arnab825/Mission-Control/releases/download/{tag_name}/MissionControl-Setup.exe)
- **Windows (.msi - Enterprise Installer)**: [{f"MissionControl-Setup.msi"}](https://github.com/arnab825/Mission-Control/releases/download/{tag_name}/MissionControl-Setup.msi)
- **Windows (.zip - Portable Archive)**: [{f"MissionControl-Setup.zip"}](https://github.com/arnab825/Mission-Control/releases/download/{tag_name}/MissionControl-Setup.zip)
- **Linux (.AppImage - Universal Linux)**: [{f"MissionControl-Linux-{version}.AppImage"}](https://github.com/arnab825/Mission-Control/releases/download/{tag_name}/MissionControl-Linux-{version}.AppImage)
- **Linux (.deb - Debian/Ubuntu Package)**: [{f"MissionControl-Linux-{version}.deb"}](https://github.com/arnab825/Mission-Control/releases/download/{tag_name}/MissionControl-Linux-{version}.deb)
- **Linux (.tar.gz - Standalone Linux Archive)**: [{f"MissionControl-Linux-{version}.tar.gz"}](https://github.com/arnab825/Mission-Control/releases/download/{tag_name}/MissionControl-Linux-{version}.tar.gz)
"""

    repo = "arnab825/Mission-Control"
    print(f"[*] Checking GitHub release for {repo} tag {tag_name}...", flush=True)
    
    # Try fetching release by tag first
    target_rel = None
    try:
        target_rel = github_request(f"https://api.github.com/repos/{repo}/releases/tags/{tag_name}", token)
    except urllib.error.HTTPError as e:
        if e.code != 404:
            pass

    if not target_rel:
        print(f"[*] Creating GitHub release {tag_name}...", flush=True)
        payload = {
            "tag_name": tag_name,
            "target_commitish": "main",
            "name": release_name,
            "body": body_md,
            "draft": False,
            "prerelease": False,
            "make_latest": "true",
        }
        target_rel = github_request(
            f"https://api.github.com/repos/{repo}/releases",
            token,
            method="POST",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        print(f"[SUCCESS] Created release: {target_rel.get('html_url')}", flush=True)
    else:
        print(f"[*] Release {tag_name} found (ID: {target_rel.get('id')}). Ensuring latest release metadata...", flush=True)
        payload = {
            "name": release_name,
            "body": body_md,
            "draft": False,
            "make_latest": "true",
        }
        target_rel = github_request(
            f"https://api.github.com/repos/{repo}/releases/{target_rel['id']}",
            token,
            method="PATCH",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        print(f"[SUCCESS] Updated release metadata: {target_rel.get('html_url')}", flush=True)

    release_id = target_rel["id"]
    existing_assets = {a["name"]: a["id"] for a in target_rel.get("assets", [])}
    print(f"[*] Already uploaded assets: {list(existing_assets.keys())}", flush=True)

    # Identify files to upload from frontend/out/release or frontend/out/dist
    release_dir = Path(__file__).resolve().parent / ".." / "frontend" / "out" / "release"
    dist_dir = Path(__file__).resolve().parent / ".." / "frontend" / "out" / "dist"

    target_filenames = [
        "MissionControl-Setup.exe",
        "latest.yml",
        "version.json",
        "MissionControl-Setup.msi",
        "MissionControl-Setup.zip",
        "MissionControl-Portable.zip",
        f"MissionControl-Linux-{version}.deb",
        f"MissionControl-Linux-{version}.tar.gz",
        f"MissionControl-Linux-{version}.AppImage",
        "latest-linux.yml",
    ]

    import time
    import requests

    backend_dir = Path(__file__).resolve().parent / ".." / "backend"

    for fname in target_filenames:
        candidates = []
        if release_dir.exists() and (release_dir / fname).exists():
            candidates.append(release_dir / fname)
        if dist_dir.exists() and (dist_dir / fname).exists():
            candidates.append(dist_dir / fname)
        if backend_dir.exists() and (backend_dir / fname).exists():
            candidates.append(backend_dir / fname)

        if not candidates:
            print(f"[WARNING] Asset file {fname} not found in release, dist, or backend. Skipping.", flush=True)
            continue

        # Choose the latest modified file among candidates
        fpath = max(candidates, key=lambda p: p.stat().st_mtime)
        file_size = fpath.stat().st_size
        size_mb = file_size / (1024 * 1024)

        # Refresh existing assets from GitHub API to handle retries and prevent state conflicts
        current_assets = {}
        try:
            assets_url = f"https://api.github.com/repos/{repo}/releases/{release_id}/assets"
            asset_list = github_request(assets_url, token)
            for a in asset_list:
                current_assets[a["name"]] = a
        except Exception as e:
            print(f"[WARNING] Could not list current release assets: {e}", flush=True)

        if fname in current_assets:
            existing_asset = current_assets[fname]
            if existing_asset.get("state") == "uploaded" and existing_asset.get("size") == file_size:
                print(f"[OK] {fname} ({size_mb:.2f} MB) is already completely uploaded and verified. Skipping.", flush=True)
                continue
            else:
                print(f"[*] Removing incomplete/outdated asset {fname} (ID: {existing_asset['id']}, State: {existing_asset.get('state')})...", flush=True)
                try:
                    del_url = f"https://api.github.com/repos/{repo}/releases/assets/{existing_asset['id']}"
                    github_request(del_url, token, method="DELETE")
                    time.sleep(1)
                    print(f"[OK] Removed existing {fname}.", flush=True)
                except Exception as e:
                    print(f"[WARNING] Could not delete existing asset {fname}: {e}", flush=True)

        content_type, _ = mimetypes.guess_type(str(fpath))
        if not content_type:
            content_type = "application/octet-stream"

        upload_url = f"https://uploads.github.com/repos/{repo}/releases/{release_id}/assets?name={urllib.parse.quote(fname)}"
        
        uploaded = False
        for attempt in range(1, 4):
            print(f"[*] Uploading {fname} ({size_mb:.2f} MB) [Attempt {attempt}/3]...", flush=True)
            try:
                with open(fpath, "rb") as f:
                    resp = requests.post(
                        upload_url,
                        data=f,
                        headers={
                            "Authorization": f"Bearer {token}",
                            "Content-Type": content_type,
                            "Accept": "application/vnd.github.v3+json",
                            "User-Agent": "MissionControl-ReleasePublisher",
                        },
                        timeout=1800,
                    )
                if resp.status_code in (200, 201):
                    print(f"[SUCCESS] Uploaded {fname} ({size_mb:.2f} MB) successfully!", flush=True)
                    uploaded = True
                    time.sleep(2)
                    break
                else:
                    print(f"[HTTP {resp.status_code}] Failed to upload {fname}: {resp.text}", file=sys.stderr, flush=True)
                    time.sleep(3)
            except Exception as ex:
                print(f"[ERROR] Exception during {fname} upload: {ex}", file=sys.stderr, flush=True)
                time.sleep(5)

        if not uploaded:
            print(f"[ERROR] Failed to upload {fname} after 3 attempts.", file=sys.stderr, flush=True)

    print(f"\n========================================================", flush=True)
    print(f"[ALL DONE] Release {tag_name} is now published and live!", flush=True)
    print(f"URL: {target_rel.get('html_url')}", flush=True)
    print(f"========================================================", flush=True)

if __name__ == "__main__":
    main()
