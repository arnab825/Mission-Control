import os
import sys
import types

# ── Bulletproof PyInstaller Runtime Hook & In-Memory Fallback for OpenCV (cv2) ─
# OpenCV's python loader (__init__.py) calls load_first_config() which checks for
# physical files: 'config.py', 'config-3.py', 'config-3.X.py', and 'load_config_py3.py'.
# In frozen environments or installations under protected paths (e.g. C:\Program Files),
# writing to disk fails with PermissionError and physical files might be missing.
#
# This hook uses a 3-layer architecture:
# 1. Intercepts os.path.exists for cv2 config files so load_first_config() always succeeds.
# 2. Injects cv2.load_config_py3 and cv2.load_config_py2 into sys.modules with an
#    in-memory exec_file_wrapper that correctly sets BINARIES_PATHS and PYTHON_EXTENSIONS_PATHS.
# 3. Best-effort physical file creation on disk when write permissions allow.
#
# CRITICAL: Do NOT insert the cv2 directory into sys.path! cv2 contains a subpackage
# named 'typing' (cv2.typing), and adding cv2 directly to sys.path hijacks Python's
# standard library 'typing' module, breaking functools, pkgutil, and numpy._core.

def _install_opencv_zero_disk_loader():
    # Layer 1: Hook os.path.exists specifically for OpenCV config file lookups
    _orig_exists = os.path.exists
    def _patched_exists(path):
        try:
            if isinstance(path, (str, bytes)):
                p_str = path if isinstance(path, str) else path.decode('utf-8', errors='ignore')
                norm = os.path.normpath(p_str)
                parts = norm.replace('\\', '/').split('/')
                # Check if path is looking for cv2 config files
                if len(parts) >= 2 and parts[-2] == 'cv2' and parts[-1].startswith('config') and parts[-1].endswith('.py'):
                    return True
                if len(parts) >= 2 and parts[-2] == 'cv2' and parts[-1] in ('load_config_py3.py', 'load_config_py2.py'):
                    return True
        except Exception:
            pass
        return _orig_exists(path)
    os.path.exists = _patched_exists

    # Layer 2: In-memory module injection for cv2.load_config_py3 & cv2.load_config_py2
    def _create_load_config_module(name):
        mod = types.ModuleType(name)
        def exec_file_wrapper(fpath, g_vars, l_vars):
            loader_dir = l_vars.get('LOADER_DIR', os.path.dirname(os.path.abspath(fpath)))
            # If the physical file exists, try reading and executing it
            if _orig_exists(fpath):
                try:
                    with open(fpath, 'r', encoding='utf-8') as f:
                        code = compile(f.read(), fpath, 'exec')
                        exec(code, g_vars, l_vars)
                        return
                except Exception:
                    pass
            # In-memory execution fallback
            fname = os.path.basename(fpath)
            if fname == 'config.py':
                if 'BINARIES_PATHS' in l_vars:
                    vc_bin = os.path.join(loader_dir, '../../x64/vc17/bin')
                    l_vars['BINARIES_PATHS'] = [loader_dir, vc_bin] + l_vars['BINARIES_PATHS']
            elif fname.startswith('config-'):
                if 'PYTHON_EXTENSIONS_PATHS' in l_vars:
                    l_vars['PYTHON_EXTENSIONS_PATHS'] = [loader_dir] + l_vars['PYTHON_EXTENSIONS_PATHS']
        mod.exec_file_wrapper = exec_file_wrapper
        return mod

    for mod_name in ['cv2.load_config_py3', 'cv2.load_config_py2']:
        if mod_name not in sys.modules:
            sys.modules[mod_name] = _create_load_config_module(mod_name)

    # Layer 3: Best-effort physical file creation on disk if writable
    cv2_dirs = []
    if hasattr(sys, '_MEIPASS'):
        cv2_dirs.append(os.path.join(sys._MEIPASS, 'cv2'))
        cv2_dirs.append(os.path.join(sys._MEIPASS, '_internal', 'cv2'))
    if hasattr(sys, 'executable') and sys.executable:
        exe_dir = os.path.dirname(os.path.abspath(sys.executable))
        cv2_dirs.append(os.path.join(exe_dir, 'cv2'))
        cv2_dirs.append(os.path.join(exe_dir, '_internal', 'cv2'))
    current_dir = os.path.dirname(os.path.abspath(__file__))
    cv2_dirs.append(os.path.join(current_dir, 'cv2'))
    cv2_dirs.append(os.path.join(current_dir, '_internal', 'cv2'))

    config_py_content = "import os\nBINARIES_PATHS = [LOADER_DIR] + BINARIES_PATHS\n"
    config_3_content = "import sys, os\nPYTHON_EXTENSIONS_PATHS = [LOADER_DIR] + PYTHON_EXTENSIONS_PATHS\n"
    load_config_content = """import os, sys
if sys.version_info[:2] >= (3, 0):
    def exec_file_wrapper(fpath, g_vars, l_vars):
        with open(fpath, 'r', encoding='utf-8') as f:
            exec(compile(f.read(), fpath, 'exec'), g_vars, l_vars)
"""
    py_major = sys.version_info[0]
    py_minor = sys.version_info[1]

    for cdir in cv2_dirs:
        if os.path.isdir(cdir):
            try:
                cfg = os.path.join(cdir, 'config.py')
                if not _orig_exists(cfg):
                    with open(cfg, 'w', encoding='utf-8') as f:
                        f.write(config_py_content)
                cfg3 = os.path.join(cdir, f'config-{py_major}.py')
                if not _orig_exists(cfg3):
                    with open(cfg3, 'w', encoding='utf-8') as f:
                        f.write(config_3_content)
                cfg_ver = os.path.join(cdir, f'config-{py_major}.{py_minor}.py')
                if not _orig_exists(cfg_ver):
                    with open(cfg_ver, 'w', encoding='utf-8') as f:
                        f.write(config_3_content)
                cfg_loader = os.path.join(cdir, 'load_config_py3.py')
                if not _orig_exists(cfg_loader):
                    with open(cfg_loader, 'w', encoding='utf-8') as f:
                        f.write(load_config_content)
            except Exception:
                pass

_install_opencv_zero_disk_loader()
