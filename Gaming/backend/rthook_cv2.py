import os
import sys

# ── PyInstaller Runtime Hook for OpenCV (cv2) ──────────────────────────────────
# OpenCV's python loader (__init__.py) calls load_first_config() which checks for
# physical files: 'config.py', 'config-3.py', 'config-3.X.py', and 'load_config_py3.py'.
# In frozen PyInstaller environments, this hook ensures those files exist on disk
# in all possible loader locations before cv2 is imported.

def _ensure_opencv_config():
    candidates = []
    
    # 1. PyInstaller extraction / bundle directory
    if hasattr(sys, '_MEIPASS'):
        candidates.append(os.path.join(sys._MEIPASS, 'cv2'))
        candidates.append(os.path.join(sys._MEIPASS, '_internal', 'cv2'))
        candidates.append(sys._MEIPASS)
        
    # 2. Executable directory
    if hasattr(sys, 'executable') and sys.executable:
        exe_dir = os.path.dirname(os.path.abspath(sys.executable))
        candidates.append(os.path.join(exe_dir, 'cv2'))
        candidates.append(os.path.join(exe_dir, '_internal', 'cv2'))
        candidates.append(exe_dir)
        
    # 3. Current file location
    current_dir = os.path.dirname(os.path.abspath(__file__))
    candidates.append(os.path.join(current_dir, 'cv2'))
    candidates.append(os.path.join(current_dir, '_internal', 'cv2'))

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

    for cdir in candidates:
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
                        
                if cdir not in sys.path:
                    sys.path.insert(0, cdir)
            except Exception:
                pass

_ensure_opencv_config()
