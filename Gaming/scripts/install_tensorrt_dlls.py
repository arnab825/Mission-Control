import os, shutil, glob, sys, site
src = r"C:\Program Files\TensorRT-10.16.1.11\bin"
# Dynamically compute dst based on current Python environment
site_packages = site.getsitepackages()[0] if site.getsitepackages() else os.path.join(os.path.dirname(sys.executable), '..', 'Lib', 'site-packages')
site_packages = os.path.abspath(site_packages)
dst = os.path.join(site_packages, 'tensorrt.libs')
print('Python:', sys.executable)
print('src:', src)
print('dst:', dst)
if not os.path.exists(src):
    print('Source bin not found')
    raise SystemExit(1)
os.makedirs(dst, exist_ok=True)
dlls = glob.glob(os.path.join(src, '*.dll'))
cnt=0
for f in dlls:
    try:
        shutil.copy2(f, dst)
        cnt+=1
    except Exception as e:
        print('copy error', f, e)
print('copied', cnt, 'dlls')
