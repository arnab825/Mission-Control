import os
import sys
from pathlib import Path
import pkgutil
try:
    import mem0
    exclude_mem0_keywords = [
        'weaviate', 'qdrant', 'pinecone', 'milvus', 'elasticsearch', 'opensearch', 'redis', 
        'neptune', 'azure', 'baidu', 'cassandra', 'databricks', 'faiss', 'mongodb', 's3_vectors', 
        'supabase', 'turbopuffer', 'upstash', 'valkey', 'vertex', 'gemini', 'anthropic', 'aws_bedrock',
        'deepseek', 'lmstudio', 'minimax', 'vllm', 'groq', 'litellm', 'sarvam', 'together', 'xai'
    ]
    mem0_imports = []
    for _, name, _ in pkgutil.walk_packages(mem0.__path__, mem0.__name__ + "."):
        # Do not exclude configs as they contain Pydantic schemas statically imported by mem0 core
        if 'mem0.configs' in name:
            mem0_imports.append(name)
            continue
        # Exclude adapters that require uninstalled dependencies
        if any(k in name for k in exclude_mem0_keywords):
            continue
        mem0_imports.append(name)
    mem0_imports += ['mem0', 'mem0.configs', 'mem0.embeddings', 'mem0.llms', 'mem0.memory', 'mem0.reranker', 'mem0.utils', 'mem0.vector_stores']
except ImportError:
    mem0_imports = []


block_cipher = None

# Collect all data directories that the backend reads at runtime
datas = [
    # Core runtime data
    ('version.json',    '.'),
    ('.env.example',    '.'),
    # Sub-packages that contain non-Python assets
    ('config',          'config'),
    ('data',            'data'),
    ('rag_data',        'rag_data'),
    # App icon
    ('logo.ico',        '.'),
]

# Only bundle directories that actually exist (avoid CI failures)
for d in ['queries', 'vision', 'ai_brain', 'core', 'control',
          'capture', 'fps_counter', 'handlers', 'nvidia',
          'system', 'voice', 'overlay_pos.json', '.env']:
    src = Path(d)
    if src.exists():
        dest = d if src.is_dir() else '.'
        datas.append((d, dest))

from PyInstaller.utils.hooks import collect_all, collect_data_files, collect_submodules

def find_package_dir(pkg_name):
    """Dynamically resolve the installation directory for a python package across any environment layout."""
    try:
        import importlib.util
        spec = importlib.util.find_spec(pkg_name)
        if spec and spec.submodule_search_locations:
            for loc in spec.submodule_search_locations:
                if os.path.isdir(loc):
                    return loc
    except Exception:
        pass
    
    import sysconfig
    candidate_dirs = [
        sysconfig.get_paths().get('purelib', ''),
        sysconfig.get_paths().get('platlib', ''),
        os.path.join(SPECPATH, '.venv', 'Lib', 'site-packages'),
        os.path.join(SPECPATH, '.venv', 'lib', 'site-packages'),
        os.path.join(SPECPATH, '..', '.venv', 'Lib', 'site-packages'),
        os.path.join(SPECPATH, '..', '.venv', 'lib', 'site-packages'),
    ]
    for sp in candidate_dirs:
        if sp and os.path.isdir(os.path.join(sp, pkg_name)):
            return os.path.join(sp, pkg_name)
    return None

# 1. Resolve rapidocr_onnxruntime
rapidocr_datas = []
rapidocr_binaries = []
rapidocr_imports = []
try:
    rapidocr_datas, rapidocr_binaries, rapidocr_imports = collect_all('rapidocr_onnxruntime')
    print(f"INFO: Collected rapidocr_onnxruntime via collect_all: {len(rapidocr_datas)} datas, {len(rapidocr_imports)} submodules")
except Exception as e:
    print(f"WARNING: collect_all('rapidocr_onnxruntime') failed: {e}")

if not rapidocr_datas:
    rapid_src = find_package_dir('rapidocr_onnxruntime')
    if rapid_src and os.path.isdir(rapid_src):
        for root, dirs, files in os.walk(rapid_src):
            for f in files:
                if f.endswith(('.yaml', '.onnx')):
                    full_path = os.path.join(root, f)
                    rel_path = os.path.relpath(root, rapid_src)
                    dest_dir = os.path.join('rapidocr_onnxruntime', rel_path) if rel_path != '.' else 'rapidocr_onnxruntime'
                    rapidocr_datas.append((full_path, dest_dir))
                elif f.endswith('.py') and not f.startswith('__'):
                    rel_file = os.path.relpath(os.path.join(root, f), rapid_src)
                    mod_name = 'rapidocr_onnxruntime.' + os.path.splitext(rel_file)[0].replace(os.path.sep, '.')
                    rapidocr_imports.append(mod_name)
        rapidocr_imports.append('rapidocr_onnxruntime')
        print(f"INFO: Collected {len(rapidocr_datas)} rapidocr data files via fallback search from {rapid_src}")

# 2. Resolve cv2 (OpenCV - including config.py, config-3.py, binaries, data)
cv2_datas = []
cv2_binaries = []
cv2_imports = []
try:
    cv2_datas, cv2_binaries, cv2_imports = collect_all('cv2')
    print(f"INFO: Collected cv2 via collect_all: {len(cv2_datas)} datas, {len(cv2_binaries)} binaries, {len(cv2_imports)} submodules")
except Exception as e:
    print(f"WARNING: collect_all('cv2') failed: {e}")

# ALWAYS ensure OpenCV configuration files (config.py, config-3.py, load_config_py3.py, etc.) are physically bundled as data files
cv2_src = find_package_dir('cv2')
if cv2_src and os.path.isdir(cv2_src):
    for root, dirs, files in os.walk(cv2_src):
        if '__pycache__' in root:
            continue
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(root, cv2_src)
            dest_dir = os.path.join('cv2', rel_path) if rel_path != '.' else 'cv2'
            # Prevent duplicate tuples in datas
            if not any(d[0] == full_path for d in cv2_datas):
                cv2_datas.append((full_path, dest_dir))
    print(f"INFO: Guaranteed total {len(cv2_datas)} cv2 data/config/binary files physically mapped from {cv2_src}")

datas += rapidocr_datas + cv2_datas
extra_binaries = rapidocr_binaries + cv2_binaries

if sys.platform == 'win32':
    platform_hiddenimports = [
        'pynput.keyboard._win32',
        'pynput.mouse._win32',
        'win32api',
        'win32con',
        'win32com',
        'win32com.client',
        'wmi',
        'psutil._pswindows',
        'pyttsx3.drivers',
        'pyttsx3.drivers.sapi5',
    ]
else:
    platform_hiddenimports = [
        'pynput.keyboard._xorg',
        'pynput.mouse._xorg',
        'psutil._pslinux',
        'pyttsx3.drivers',
        'pyttsx3.drivers.espeak',
    ]

a = Analysis(
    ['main.py'],
    pathex=['.'],
    binaries=extra_binaries,
    datas=datas,
    hiddenimports=[
        # ── websockets / asyncio ────────────────────────────────────────────
        'websockets',
        'websockets.legacy',
        'websockets.legacy.server',
        'websockets.legacy.client',
        # ── PIL ─────────────────────────────────────────────────────────────
        'PIL._tkinter_finder',
    ] + platform_hiddenimports + mem0_imports + rapidocr_imports + cv2_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=['rthook_cv2.py'],
    # Exclude very heavy optional packages that are not needed at runtime
    excludes=[
        'torch',          # only needed for ultralytics; ultralytics auto-loads
        'ultralytics',    # Exclude to prevent slow/hanging optional dependency compilation during PyInstaller build
        'torchvision',
        'torchaudio',
        'tensorrt',       # GPU-optional, loaded lazily — no CUDA on CI runner
        'cuda',
        'cuda_python',    # cuda-python pkg — requires CUDA runtime DLLs absent on CI
        'cuml',
        'notebook',
        'IPython',
        'matplotlib',
        'tkinter',
        'test',
        'tzdata',         # Suppress warnings
        'importlib_resources.trees',
        'pysqlite2',
        'MySQLdb',
    ],
    noarchive=False,
    optimize=1,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],                   # onedir: no binaries merged into exe
    exclude_binaries=True,
    name='MissionControlBackend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,        # no terminal window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['logo.ico'] if sys.platform == 'win32' and os.path.exists('logo.ico') else None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='MissionControlBackend',  # output folder: dist/MissionControlBackend/
)
