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
          'system', 'voice', 'overlay_pos.json']:
    src = Path(d)
    if src.exists():
        dest = d if src.is_dir() else '.'
        datas.append((d, dest))

# Resolve rapidocr_onnxruntime files without importing (prevents build-time DLL load failures on CI runners)
site_packages = os.path.join(SPECPATH, '.venv', 'Lib', 'site-packages')

rapidocr_datas = []
rapidocr_imports = []

rapid_src = os.path.join(site_packages, 'rapidocr_onnxruntime')
if os.path.isdir(rapid_src):
    # Collect yaml/onnx data files manually
    for root, dirs, files in os.walk(rapid_src):
        for f in files:
            if f.endswith(('.yaml', '.onnx')):
                full_path = os.path.join(root, f)
                rel_path = os.path.relpath(root, rapid_src)
                dest_dir = os.path.join('rapidocr_onnxruntime', rel_path) if rel_path != '.' else 'rapidocr_onnxruntime'
                rapidocr_datas.append((full_path, dest_dir))
    
    # Collect Python submodules manually for hiddenimports
    for root, dirs, files in os.walk(rapid_src):
        for f in files:
            if f.endswith('.py') and not f.startswith('__'):
                rel_file = os.path.relpath(os.path.join(root, f), rapid_src)
                mod_name = 'rapidocr_onnxruntime.' + os.path.splitext(rel_file)[0].replace(os.path.sep, '.')
                rapidocr_imports.append(mod_name)
    rapidocr_imports.append('rapidocr_onnxruntime')
    print(f"INFO: Collected {len(rapidocr_datas)} data files and {len(rapidocr_imports)} submodules from {rapid_src}")
else:
    try:
        from PyInstaller.utils.hooks import collect_data_files, collect_submodules
        rapidocr_datas = collect_data_files('rapidocr_onnxruntime')
        rapidocr_imports = collect_submodules('rapidocr_onnxruntime')
        print("INFO: Collected rapidocr_onnxruntime via standard PyInstaller hooks")
    except Exception as e:
        import traceback
        print("=" * 60)
        print(f"ERROR: Failed to collect rapidocr_onnxruntime: {e}")
        traceback.print_exc()
        print("=" * 60)
        rapidocr_datas = []
        rapidocr_imports = []

datas += rapidocr_datas

a = Analysis(
    ['main.py'],
    pathex=['.'],
    binaries=[],
    datas=datas,
    hiddenimports=[
        # ── websockets / asyncio ────────────────────────────────────────────
        'websockets',
        'websockets.legacy',
        'websockets.legacy.server',
        'websockets.legacy.client',
        # ── pynput Windows backend ──────────────────────────────────────────
        'pynput.keyboard._win32',
        'pynput.mouse._win32',
        # ── WMI / win32 ─────────────────────────────────────────────────────
        'win32api',
        'win32con',
        'win32com',
        'win32com.client',
        'wmi',
        # ── psutil ──────────────────────────────────────────────────────────
        'psutil._pswindows',
        # ── pyttsx3 ─────────────────────────────────────────────────────────
        'pyttsx3.drivers',
        'pyttsx3.drivers.sapi5',
        # ── PIL ─────────────────────────────────────────────────────────────
        'PIL._tkinter_finder',
    ] + mem0_imports + rapidocr_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
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
    icon=['logo.ico'],
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
