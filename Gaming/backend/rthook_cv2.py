import os
import sys

# ── PyInstaller Runtime Hook for OpenCV (cv2) ──────────────────────────────────
# OpenCV's python loader (__init__.py) calls load_first_config() which checks for
# physical files: 'config.py', 'config-3.py', 'config-3.X.py', and 'load_config_py3.py'.
# In frozen PyInstaller environments, this hook ensures those files exist on disk
# inside the cv2 directory before cv2 is imported.
#
# CRITICAL: Do NOT insert the cv2 directory into sys.path! cv2 contains a subpackage
# named 'typing' (cv2.typing), and adding cv2 directly to sys.path hijacks Python's
# standard library 'typing' module, breaking functools, pkgutil, and numpy._core.

def _ensure_opencv_config():
    cv2_dirs = []

    # 1. PyInstaller extraction / bundle directory
    if hasattr(sys, '_MEIPASS'):
        cv2_dirs.append(os.path.join(sys._MEIPASS, 'cv2'))
        cv2_dirs.append(os.path.join(sys._MEIPASS, '_internal', 'cv2'))

    # 2. Executable directory
    if hasattr(sys, 'executable') and sys.executable:
        exe_dir = os.path.dirname(os.path.abspath(sys.executable))
        cv2_dirs.append(os.path.join(exe_dir, 'cv2'))
        cv2_dirs.append(os.path.join(exe_dir, '_internal', 'cv2'))

    # 3. Current file location
    current_dir = os.path.dirname(os.path.abspath(__file__))
    cv2_dirs.append(os.path.join(current_dir, 'cv2'))
    cv2_dirs.append(os.path.join(current_dir, '_internal', 'cv2'))

    config_py_content = """import os
BINARIES_PATHS = [
    os.path.join(os.path.join(LOADER_DIR, '../../'), 'x64/vc17/bin'),
    LOADER_DIR
] + BINARIES_PATHS
"""

    config_3_content = """import sys, os
PYTHON_EXTENSIONS_PATHS = [
    LOADER_DIR
] + PYTHON_EXTENSIONS_PATHS
"""

    load_config_content = """import os, sys
if sys.version_info[:2] >= (3, 0):
    def exec_file_wrapper(fpath, g_vars, l_vars):
        with open(fpath, 'r', encoding='utf-8') as f:
            code = compile(f.read(), fpath, 'exec')
            exec(code, g_vars, l_vars)
"""

    py_major = sys.version_info[0]
    py_minor = sys.version_info[1]

    for cdir in cv2_dirs:
        if os.path.isdir(cdir):
            try:
                cfg = os.path.join(cdir, 'config.py')
                if not os.path.exists(cfg):
                    with open(cfg, 'w', encoding='utf-8') as f:
                        f.write(config_py_content)

                cfg3 = os.path.join(cdir, f'config-{py_major}.py')
                if not os.path.exists(cfg3):
                    with open(cfg3, 'w', encoding='utf-8') as f:
                        f.write(config_3_content)

                cfg_ver = os.path.join(cdir, f'config-{py_major}.{py_minor}.py')
                if not os.path.exists(cfg_ver):
                    with open(cfg_ver, 'w', encoding='utf-8') as f:
                        f.write(config_3_content)

                cfg_loader = os.path.join(cdir, 'load_config_py3.py')
                if not os.path.exists(cfg_loader):
                    with open(cfg_loader, 'w', encoding='utf-8') as f:
                        f.write(load_config_content)
            except Exception:
                pass

_ensure_opencv_config()
