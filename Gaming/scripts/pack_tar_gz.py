#!/usr/bin/env python3
"""
pack_tar_gz.py — Fast, cross-platform standalone Linux tar.gz packager for Mission Control.
Packages 'linux-unpacked' into 'MissionControl-Linux-{version}.tar.gz'.
Uses system tar (bsdtar on Windows 10/11, GNU tar on Linux) with Python tarfile fallback.
"""

import os
import sys
import json
import shutil
import subprocess
import time
from pathlib import Path


def pack_tar_gz(version: str = "", dist_dir: Path = None):
    script_dir = Path(__file__).resolve().parent
    if not dist_dir:
        dist_dir = script_dir.parent / "frontend" / "out" / "dist"
    
    if not version:
        version_file = script_dir.parent / "backend" / "version.json"
        if version_file.exists():
            with open(version_file, "r", encoding="utf-8") as f:
                version = json.load(f).get("version", "3.9.8")
        else:
            version = "3.9.8"

    linux_unpacked = dist_dir / "linux-unpacked"
    output_tar_gz = dist_dir / f"MissionControl-Linux-{version}.tar.gz"

    if not linux_unpacked.exists():
        raise FileNotFoundError(f"linux-unpacked directory not found at {linux_unpacked}")

    print(f"[TAR.GZ] Packaging '{linux_unpacked.name}' into '{output_tar_gz.name}' (v{version})...")
    start_time = time.time()

    # Remove any partial or corrupted tar.gz file first
    if output_tar_gz.exists():
        try:
            output_tar_gz.unlink()
        except Exception as e:
            print(f"Warning removing existing {output_tar_gz}: {e}")

    # Method 1: System tar (available natively on Windows 10/11 and Linux)
    tar_exe = shutil.which("tar")
    success = False
    if tar_exe:
        try:
            print(f"[TAR.GZ] Using system tar: {tar_exe}...")
            cmd = [tar_exe, "-czf", str(output_tar_gz), "-C", str(dist_dir), "linux-unpacked"]
            res = subprocess.run(cmd, check=True)
            if res.returncode == 0 and output_tar_gz.exists() and output_tar_gz.stat().st_size > 10 * 1024 * 1024:
                success = True
        except Exception as e:
            print(f"[TAR.GZ] System tar failed: {e}. Falling back to Python tarfile...")

    # Method 2: Python tarfile fallback
    if not success:
        import tarfile
        print("[TAR.GZ] Using Python tarfile mode w:gz...")
        with tarfile.open(output_tar_gz, "w:gz", compresslevel=6) as tar:
            tar.add(linux_unpacked, arcname="linux-unpacked")
        success = True

    elapsed = time.time() - start_time
    size_mb = output_tar_gz.stat().st_size / (1024 * 1024)
    print(f"[SUCCESS] Generated Linux tar.gz: {output_tar_gz} ({size_mb:.1f} MB in {elapsed:.1f}s)")
    return output_tar_gz


if __name__ == "__main__":
    ver = sys.argv[1].lstrip("v") if len(sys.argv) > 1 else ""
    pack_tar_gz(ver)
