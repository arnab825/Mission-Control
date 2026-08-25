import os
import sys
import io
import time
import json
import hashlib
import tarfile
from pathlib import Path

def create_ar_header(name: str, size: int, mode: int = 0o100644, mtime: int = 0, uid: int = 0, gid: int = 0) -> bytes:
    """Format a standard UNIX ar archive file member header."""
    # Debian ar format requires filenames up to 16 chars with a trailing slash or space
    name_str = name if name.endswith('/') else name
    formatted_name = name_str.ljust(16)[:16]
    formatted_mtime = str(int(mtime)).ljust(12)[:12]
    formatted_uid = str(uid).ljust(6)[:6]
    formatted_gid = str(gid).ljust(6)[:6]
    formatted_mode = oct(mode)[2:].ljust(8)[:8]
    formatted_size = str(size).ljust(10)[:10]
    magic = b"`\n"
    
    header = (
        formatted_name.encode('ascii') +
        formatted_mtime.encode('ascii') +
        formatted_uid.encode('ascii') +
        formatted_gid.encode('ascii') +
        formatted_mode.encode('ascii') +
        formatted_size.encode('ascii') +
        magic
    )
    return header

def pack_deb(linux_unpacked_dir: str, output_deb_path: str, version: str):
    print(f"[DEB] Packaging '{linux_unpacked_dir}' into '{output_deb_path}' (v{version})...")
    unpacked_path = Path(linux_unpacked_dir)
    if not unpacked_path.exists():
        raise FileNotFoundError(f"Linux unpacked directory not found at {linux_unpacked_dir}")

    # 1. debian-binary
    debian_binary = b"2.0\n"

    # 2. Build data.tar.gz
    data_tar_buffer = io.BytesIO()
    md5_entries = []
    
    install_prefix = "opt/Mission Control"
    
    with tarfile.open(fileobj=data_tar_buffer, mode="w:gz") as tar:
        # Add all files from linux-unpacked to ./opt/Mission Control/
        for root, dirs, files in os.walk(unpacked_path):
            rel_root = os.path.relpath(root, unpacked_path)
            tar_dir = f"./{install_prefix}" if rel_root == "." else f"./{install_prefix}/{rel_root.replace(os.sep, '/')}"
            
            # Directory entry
            dir_tarinfo = tarfile.TarInfo(name=tar_dir)
            dir_tarinfo.type = tarfile.DIRTYPE
            dir_tarinfo.mode = 0o755
            dir_tarinfo.mtime = int(time.time())
            dir_tarinfo.uname = "root"
            dir_tarinfo.gname = "root"
            tar.addfile(dir_tarinfo)
            
            for file in files:
                full_file_path = os.path.join(root, file)
                rel_file_path = os.path.relpath(full_file_path, unpacked_path).replace(os.sep, '/')
                tar_file_path = f"./{install_prefix}/{rel_file_path}"
                
                # Check executable permissions
                is_exec = file.startswith("mission-control") or file in ["chrome-sandbox", "chrome_crashpad_handler"] or file.endswith(".so") or file.endswith(".so.1")
                file_mode = 0o755 if is_exec else 0o644
                if file == "chrome-sandbox":
                    file_mode = 0o4755
                
                with open(full_file_path, "rb") as f:
                    file_bytes = f.read()
                
                # Compute MD5 for md5sums
                file_md5 = hashlib.md5(file_bytes).hexdigest()
                md5_entries.append(f"{file_md5}  {tar_file_path[2:]}\n")
                
                tarinfo = tarfile.TarInfo(name=tar_file_path)
                tarinfo.size = len(file_bytes)
                tarinfo.mode = file_mode
                tarinfo.mtime = int(time.time())
                tarinfo.uname = "root"
                tarinfo.gname = "root"
                tar.addfile(tarinfo, io.BytesIO(file_bytes))
        
        # Add Desktop entry (/usr/share/applications/mission-control.desktop)
        desktop_content = f"""[Desktop Entry]
Name=Mission Control
Exec="/opt/Mission Control/mission-control-frontend" %U
Terminal=false
Type=Application
Icon=mission-control
StartupWMClass=Mission Control
Comment=Mission Control desktop app for gamers.
Categories=Utility;Game;
""".encode('utf-8')
        
        desktop_tarinfo = tarfile.TarInfo(name="./usr/share/applications/mission-control.desktop")
        desktop_tarinfo.size = len(desktop_content)
        desktop_tarinfo.mode = 0o644
        desktop_tarinfo.mtime = int(time.time())
        desktop_tarinfo.uname = "root"
        desktop_tarinfo.gname = "root"
        tar.addfile(desktop_tarinfo, io.BytesIO(desktop_content))
        
        # Add Logo icon (/usr/share/icons/hicolor/512x512/apps/mission-control.png)
        logo_path = Path(__file__).resolve().parent.parent / "frontend" / "public" / "logo.png"
        if logo_path.exists():
            with open(logo_path, "rb") as f:
                logo_bytes = f.read()
            icon_tarinfo = tarfile.TarInfo(name="./usr/share/icons/hicolor/512x512/apps/mission-control.png")
            icon_tarinfo.size = len(logo_bytes)
            icon_tarinfo.mode = 0o644
            icon_tarinfo.mtime = int(time.time())
            icon_tarinfo.uname = "root"
            icon_tarinfo.gname = "root"
            tar.addfile(icon_tarinfo, io.BytesIO(logo_bytes))
            
            # Symlink / copy to /usr/share/pixmaps/mission-control.png
            pixmap_tarinfo = tarfile.TarInfo(name="./usr/share/pixmaps/mission-control.png")
            pixmap_tarinfo.size = len(logo_bytes)
            pixmap_tarinfo.mode = 0o644
            pixmap_tarinfo.mtime = int(time.time())
            pixmap_tarinfo.uname = "root"
            pixmap_tarinfo.gname = "root"
            tar.addfile(pixmap_tarinfo, io.BytesIO(logo_bytes))

        # Add binary symlink in /usr/bin/mission-control
        bin_link = tarfile.TarInfo(name="./usr/bin/mission-control")
        bin_link.type = tarfile.SYMTYPE
        bin_link.linkname = "/opt/Mission Control/mission-control-frontend"
        bin_link.mode = 0o777
        bin_link.mtime = int(time.time())
        bin_link.uname = "root"
        bin_link.gname = "root"
        tar.addfile(bin_link)

    data_tar_bytes = data_tar_buffer.getvalue()
    installed_size_kb = int(len(data_tar_bytes) / 1024 * 3)

    # 3. Build control.tar.gz
    control_content = f"""Package: mission-control
Version: {version}
Section: utils
Priority: optional
Architecture: amd64
Installed-Size: {installed_size_kb}
Depends: libgtk-3-0, libnotify4, libnss3, libxss1, xdg-utils, libsecret-1-0, libasound2
Maintainer: Arnab Roy and Anirudha Basu Thakur <support@missioncontrol.app>
Description: Mission Control desktop app for gamers.
 Mission Control delivers AI-driven gaming performance optimization, hardware telemetry, and real-time gaming assistance.
Homepage: https://github.com/arnab825/Mission-Control
""".encode('utf-8')

    postinst_content = b"""#!/bin/sh
set -e
if [ "$1" = "configure" ]; then
    chmod 4755 "/opt/Mission Control/chrome-sandbox" 2>/dev/null || true
    chmod 0755 "/opt/Mission Control/mission-control-frontend" 2>/dev/null || true
    if command -v update-desktop-database >/dev/null 2>&1; then
        update-desktop-database -q || true
    fi
    if command -v gtk-update-icon-cache >/dev/null 2>&1; then
        gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor 2>/dev/null || true
    fi
fi
"""

    postrm_content = b"""#!/bin/sh
set -e
if [ "$1" = "remove" ] || [ "$1" = "purge" ]; then
    rm -f "/usr/bin/mission-control" 2>/dev/null || true
    if command -v update-desktop-database >/dev/null 2>&1; then
        update-desktop-database -q || true
    fi
fi
"""

    control_tar_buffer = io.BytesIO()
    with tarfile.open(fileobj=control_tar_buffer, mode="w:gz") as ctar:
        # ./control
        cinfo = tarfile.TarInfo(name="./control")
        cinfo.size = len(control_content)
        cinfo.mode = 0o644
        cinfo.mtime = int(time.time())
        cinfo.uname = "root"
        cinfo.gname = "root"
        ctar.addfile(cinfo, io.BytesIO(control_content))

        # ./md5sums
        md5_content = "".join(sorted(md5_entries)).encode('utf-8')
        md5info = tarfile.TarInfo(name="./md5sums")
        md5info.size = len(md5_content)
        md5info.mode = 0o644
        md5info.mtime = int(time.time())
        md5info.uname = "root"
        md5info.gname = "root"
        ctar.addfile(md5info, io.BytesIO(md5_content))

        # ./postinst
        pinfo = tarfile.TarInfo(name="./postinst")
        pinfo.size = len(postinst_content)
        pinfo.mode = 0o755
        pinfo.mtime = int(time.time())
        pinfo.uname = "root"
        pinfo.gname = "root"
        ctar.addfile(pinfo, io.BytesIO(postinst_content))

        # ./postrm
        prminfo = tarfile.TarInfo(name="./postrm")
        prminfo.size = len(postrm_content)
        prminfo.mode = 0o755
        prminfo.mtime = int(time.time())
        prminfo.uname = "root"
        prminfo.gname = "root"
        ctar.addfile(prminfo, io.BytesIO(postrm_content))

    control_tar_bytes = control_tar_buffer.getvalue()

    # 4. Assemble final standard Debian .deb (AR archive)
    out_dir = os.path.dirname(os.path.abspath(output_deb_path))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    with open(output_deb_path, "wb") as deb_file:
        # AR magic signature
        deb_file.write(b"!<arch>\n")

        # 1. debian-binary
        deb_file.write(create_ar_header("debian-binary", len(debian_binary)))
        deb_file.write(debian_binary)
        if len(debian_binary) % 2 != 0:
            deb_file.write(b"\n")

        # 2. control.tar.gz
        deb_file.write(create_ar_header("control.tar.gz", len(control_tar_bytes)))
        deb_file.write(control_tar_bytes)
        if len(control_tar_bytes) % 2 != 0:
            deb_file.write(b"\n")

        # 3. data.tar.gz
        deb_file.write(create_ar_header("data.tar.gz", len(data_tar_bytes)))
        deb_file.write(data_tar_bytes)
        if len(data_tar_bytes) % 2 != 0:
            deb_file.write(b"\n")

    deb_size_mb = round(os.path.getsize(output_deb_path) / (1024 * 1024), 2)
    print(f"[SUCCESS] Generated Debian package: {output_deb_path} ({deb_size_mb} MB)")

if __name__ == "__main__":
    version_file = Path(__file__).resolve().parent.parent / "backend" / "version.json"
    ver = "3.2.9"
    if version_file.exists():
        with open(version_file, "r", encoding="utf-8") as f:
            ver = json.load(f).get("version", ver)
            
    frontend_dir = Path(__file__).resolve().parent.parent / "frontend"
    unpacked = frontend_dir / "out" / "dist" / "linux-unpacked"
    output_deb = frontend_dir / "out" / "dist" / f"MissionControl-Linux-{ver}.deb"
    
    if len(sys.argv) > 1:
        ver = sys.argv[1]
    if len(sys.argv) > 2:
        unpacked = Path(sys.argv[2])
    if len(sys.argv) > 3:
        output_deb = Path(sys.argv[3])
        
    pack_deb(str(unpacked), str(output_deb), ver)
