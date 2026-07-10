"""Bridge-facing update checks / installs (no GUI dependencies)."""
import json
import os
import subprocess
import sys
import threading
import urllib.error
import urllib.request
import logging
from packaging.version import Version
from datetime import datetime

logger = logging.getLogger(__name__)

_CORE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.dirname(_CORE_DIR)
VERSION_FILE = os.path.join(BACKEND_ROOT, "version.json")


def _find_git_root(start: str) -> str:
    d = os.path.abspath(start)
    while True:
        if os.path.isdir(os.path.join(d, ".git")):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            return os.path.abspath(start)
        d = parent


PROJECT_ROOT = _find_git_root(BACKEND_ROOT)


def check_git_remote_version(project_root: str) -> str:
    import subprocess
    import re
    from packaging.version import Version
    
    startupinfo = None
    creationflags = 0
    if os.name == 'nt':
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        startupinfo.wShowWindow = 0
        creationflags = 0x08000000

    try:
        result = subprocess.run(
            ["git", "ls-remote", "--tags", "origin"],
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=15,
            startupinfo=startupinfo,
            creationflags=creationflags
        )
        if result.returncode != 0:
            logger.warning(f"git ls-remote failed: {result.stderr}")
            return "0.0.0"
            
        versions = []
        for line in result.stdout.strip().splitlines():
            parts = line.split("\t")
            if len(parts) < 2:
                continue
            ref = parts[1]
            if ref.endswith("^{}"):
                continue
            if ref.startswith("refs/tags/"):
                tag = ref[len("refs/tags/"):]
                if tag.startswith("v"):
                    ver_str = tag[1:]
                    try:
                        ver = Version(ver_str)
                        versions.append((ver, tag))
                    except Exception:
                        pass
        if not versions:
            return "0.0.0"
        return max(versions, key=lambda x: x[0])[1]
    except Exception as e:
        logger.warning(f"Error querying remote tags via git: {e}")
        return "0.0.0"


def load_local_version() -> dict:
    with open(VERSION_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def handle_bridge_update_commands(cmd_type: str, payload: dict, bridge_instance) -> bool:
    """
    Handles update-related bridge commands from background threads.
    Returns True if the command was handled.
    """
    if cmd_type == "get_changelogs":
        try:
            local = load_local_version()
            # Copy to avoid mutating cached structure if any
            local_copy = dict(local)
            local_copy["changelog"] = list(local_copy.get("changelog", []))
            bridge_instance.update_state({"changelogs": local_copy})
        except Exception as e:
            bridge_instance.update_state({"changelogs": {"error": str(e)}})
        return True

    if cmd_type == "check_updates":
        # Software updates are static and anonymous, so they do not leak telemetry and are permitted.
        bridge_instance.update_state({"update_state": {"status": "checking"}})

        def _check_run():
            try:
                local = load_local_version()
                local_ver = local.get("version", "0.0.0")
                
                # Check if this is a local git repo
                is_git_repo = os.path.isdir(os.path.join(PROJECT_ROOT, ".git"))
                remote_ver = None
                
                if is_git_repo:
                    try:
                        latest_tag = check_git_remote_version(PROJECT_ROOT)
                        if latest_tag.startswith("v"):
                            remote_ver = latest_tag[1:]
                    except Exception as git_err:
                        logger.warning(f"Failed to check updates via git: {git_err}")

                remote = None
                if not remote_ver:
                    # Fallback to URL check
                    url = local.get("update_check_url", "")
                    if not url:
                        bridge_instance.update_state(
                            {
                                "update_state": {
                                    "status": "failed",
                                    "reason": "No update URL configured.",
                                }
                            }
                        )
                        return

                    import socket
                    socket.setdefaulttimeout(6.0)
                    req = urllib.request.Request(
                        url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
                    )
                    try:
                        with urllib.request.urlopen(req, timeout=6) as resp:
                            remote = json.loads(resp.read().decode("utf-8"))
                            remote_ver = remote.get("version", "0.0.0")
                    except urllib.error.HTTPError as e:
                        if e.code == 404:
                            bridge_instance.update_state(
                                {
                                    "update_state": {
                                        "status": "up_to_date",
                                        "current_version": local_ver,
                                    }
                                }
                            )
                        else:
                            bridge_instance.update_state(
                                {
                                    "update_state": {
                                        "status": "failed",
                                        "reason": f"Server error: HTTP {e.code}",
                                    }
                                }
                            )
                        return
                    except Exception as e:
                        err_str = str(e)
                        reason = (
                            "Update server took too long to respond. (Timeout)"
                            if "timed out" in err_str.lower()
                            else f"Network error: {err_str}"
                        )
                        bridge_instance.update_state(
                            {"update_state": {"status": "failed", "reason": reason}}
                        )
                        return

                if Version(remote_ver) > Version(local_ver):
                    remote_log = []
                    if remote and isinstance(remote, dict):
                        remote_log = list(remote.get("changelog", []))
                    else:
                        remote_log = [{
                            "version": remote_ver,
                            "date": datetime.today().strftime('%Y-%m-%d'),
                            "title": f"Release v{remote_ver}",
                            "highlights": [f"New version v{remote_ver} is available on GitHub."]
                        }]
                    local_log = list(local.get("changelog", []))
                    
                    seen = {e["version"] for e in remote_log}
                    merged_changelog = list(remote_log) + [
                        e for e in local_log if e["version"] not in seen
                    ]

                    bridge_instance.update_state(
                        {
                            "update_state": {
                                "status": "available",
                                "current_version": local_ver,
                                "latest_version": remote_ver,
                                "changelog": merged_changelog,
                                "remote_data": remote if remote else {"version": remote_ver, "changelog": remote_log},
                            }
                        }
                    )
                else:
                    bridge_instance.update_state(
                        {
                            "update_state": {
                                "status": "up_to_date",
                                "current_version": local_ver,
                            }
                        }
                    )
            except Exception as e:
                logger.exception(f"[UpdateCheck] Unhandled error during version check: {e}")
                bridge_instance.update_state(
                    {"update_state": {"status": "failed", "reason": f"Version check error: {e}"}}
                )

        threading.Thread(target=_check_run, name="UpdateCheckBG", daemon=True).start()
        return True

    if cmd_type == "install_update":
        bridge_instance.update_state(
            {
                "update_install_state": {
                    "status": "installing",
                    "step": "Pulling latest code from GitHub...",
                }
            }
        )

        def _install_run():
            try:
                import shutil
                # Add startupinfo/creationflags to subprocess runs on Windows to hide windows
                si = None
                creationflags = 0
                if os.name == 'nt':
                    si = subprocess.STARTUPINFO()
                    si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                    si.wShowWindow = 0
                    creationflags = 0x08000000

                git_exe = shutil.which("git") or "git"
                uv_exe = shutil.which("uv") or "uv"

                bridge_instance.update_state(
                    {
                        "update_install_state": {
                            "status": "installing",
                            "step": "Verifying network connection...",
                        }
                    }
                )

                fetch_res = subprocess.run(
                    [git_exe, "fetch", "origin"],
                    cwd=PROJECT_ROOT,
                    capture_output=True,
                    text=True,
                    timeout=30,
                    startupinfo=si,
                    creationflags=creationflags
                )
                if fetch_res.returncode != 0:
                    bridge_instance.update_state(
                        {
                            "update_install_state": {
                                "status": "failed",
                                "reason": f"git fetch failed (check connection): {fetch_res.stderr.strip()[:100]}",
                            }
                        }
                    )
                    return

                bridge_instance.update_state(
                    {
                        "update_install_state": {
                            "status": "installing",
                            "step": "Pulling latest code from GitHub...",
                        }
                    }
                )

                result = subprocess.run(
                    [git_exe, "pull", "--rebase"],
                    cwd=PROJECT_ROOT,
                    capture_output=True,
                    text=True,
                    timeout=60,
                    startupinfo=si,
                    creationflags=creationflags
                )
                if result.returncode != 0:
                    bridge_instance.update_state(
                        {
                            "update_install_state": {
                                "status": "failed",
                                "reason": f"git pull failed: {result.stderr.strip()[:100]}",
                            }
                        }
                    )
                    return

                bridge_instance.update_state(
                    {
                        "update_install_state": {
                            "status": "installing",
                            "step": "Installing new dependencies...",
                        }
                    }
                )
                result = subprocess.run(
                    [uv_exe, "sync"],
                    cwd=BACKEND_ROOT,
                    capture_output=True,
                    text=True,
                    timeout=120,
                    startupinfo=si,
                    creationflags=creationflags
                )
                if result.returncode != 0:
                    # Don't fail the whole update just because uv sync failed (could be a frozen environment or no uv on PATH)
                    logger.warning(f"uv sync failed or not found: {result.stderr.strip()[:100]}")
                    bridge_instance.update_state(
                        {
                            "update_install_state": {
                                "status": "installing",
                                "step": "Skipped dependency sync, continuing...",
                            }
                        }
                    )

                bridge_instance.update_state(
                    {
                        "update_install_state": {
                            "status": "success",
                            "step": "Restarting application...",
                        }
                    }
                )

                import time

                time.sleep(1.2)

                python = sys.executable
                args = [python] + sys.argv
                subprocess.Popen(args, creationflags=creationflags)
                os.kill(os.getpid(), 9)

            except subprocess.TimeoutExpired:
                bridge_instance.update_state(
                    {
                        "update_install_state": {
                            "status": "failed",
                            "reason": "Update timed out. Check your internet connection.",
                        }
                    }
                )
            except Exception as e:
                bridge_instance.update_state(
                    {"update_install_state": {"status": "failed", "reason": str(e)}}
                )

    if cmd_type == "check_patches":
        bridge_instance.update_state({"patches_sync": {"status": "checking"}})

        def _patches_run():
            try:
                import platform
                import urllib.request
                import json

                # Get local system specs for hardware-matching
                os_name = platform.system()
                gpu_name = "Unknown"
                if os_name == "Windows":
                    try:
                        startupinfo = subprocess.STARTUPINFO()
                        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                        startupinfo.wShowWindow = 0 # SW_HIDE
                        out = subprocess.check_output(
                            'powershell -NoProfile -Command "Get-CimInstance -ClassName Win32_VideoController | Select-Object -ExpandProperty Name"',
                            shell=True, startupinfo=startupinfo, creationflags=0x08000000, timeout=3.0
                        ).decode("utf-8").strip().splitlines()
                        if out:
                            chosen = out[0].strip()
                            for line in out:
                                l = line.strip().lower()
                                if "nvidia" in l or "amd" in l or "radeon" in l:
                                    chosen = line.strip()
                                    break
                            gpu_name = chosen
                    except Exception as e:
                        logger.debug(f"Failed to query GPU via powershell: {e}")

                # Query the Next.js API for issues
                api_url = os.getenv("TELEMETRY_API_URL", "http://localhost:3000/api/issues")
                if api_url and not api_url.endswith("/api/issues") and not api_url.endswith("/api/issues/"):
                    api_url = api_url.rstrip("/") + "/api/issues"
                req = urllib.request.Request(
                    api_url, headers={"User-Agent": "MissionControl-Launcher/1.0"}
                )
                try:
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        issues = json.loads(resp.read().decode("utf-8"))
                except Exception as req_err:
                    # Fallback to downloading raw issues.json from GitHub if local/Next.js server is offline
                    github_fallback_url = "https://raw.githubusercontent.com/arnab825/Mission-Control/main/Gaming/website/data/issues.json"
                    try:
                        github_req = urllib.request.Request(
                            github_fallback_url, headers={"User-Agent": "MissionControl-Launcher/1.0"}
                        )
                        with urllib.request.urlopen(github_req, timeout=5) as resp:
                            issues = json.loads(resp.read().decode("utf-8"))
                    except Exception as gh_err:
                        # Final local resource fallback (if bundled in resources or backend data folder)
                        fallback_paths = [
                            os.path.join(PROJECT_ROOT, "Gaming", "website", "data", "issues.json"),
                            os.path.join(PROJECT_ROOT, "data", "issues.json")
                        ]
                        issues = []
                        for path in fallback_paths:
                            if os.path.exists(path):
                                try:
                                    with open(path, "r", encoding="utf-8") as f:
                                        issues = json.load(f)
                                    break
                                except Exception:
                                    pass
                        if not issues:
                            logger.warning(
                                f"Could not connect to telemetry API and fallback file not found. "
                                f"GitHub Err: {gh_err}, Local Err: {req_err}"
                            )

                # Filter issues matching our current OS or GPU
                matched_issues = []
                gpu_lower = gpu_name.lower()
                
                for issue in issues:
                    specs = issue.get("specs", {})
                    issue_os = specs.get("os", "").lower()
                    issue_gpu = specs.get("gpu", "").lower()
                    
                    is_os_match = issue_os == os_name.lower()
                    is_gpu_match = gpu_lower != "unknown" and (gpu_lower in issue_gpu or issue_gpu in gpu_lower)
                    has_gpu_spec = bool(issue_gpu.strip())
                    
                    if is_os_match and (not has_gpu_spec or is_gpu_match):
                        matched_issues.append({
                            "id": issue.get("id"),
                            "title": issue.get("title"),
                            "description": issue.get("description"),
                            "category": issue.get("category"),
                            "votes": issue.get("votes"),
                            "game": issue.get("game"),
                            "specs": specs,
                            "match_reason": "GPU Match" if is_gpu_match else "OS Match"
                        })

                bridge_instance.update_state({
                    "patches_sync": {
                        "status": "success",
                        "local_specs": {"os": os_name, "gpu": gpu_name},
                        "matched_issues": matched_issues,
                        "total_glitches": len(issues)
                    }
                })
            except Exception as e:
                bridge_instance.update_state({
                    "patches_sync": {
                        "status": "failed",
                        "error": str(e)
                    }
                })

        threading.Thread(target=_patches_run, name="PatchesCheckBG", daemon=True).start()
        return True

    return False
