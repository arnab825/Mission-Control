"""Check if the current Python process is truly running as Administrator."""
import ctypes
import os
import sys

is_admin = ctypes.windll.shell32.IsUserAnAdmin() != 0
print(f"Is Admin (Python process): {is_admin}")
print(f"User: {os.environ.get('USERNAME', 'unknown')}")
print(f"Python: {sys.executable}")

# Also check if dotnet can read CPU temp when run elevated
if is_admin:
    import subprocess
    import json
    
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dll_path = os.path.join(base_dir, "system", "hardware_monitor", "bin", "Release", "net10.0", "HardwareMonitor.dll")
    
    proc = subprocess.Popen(
        ["dotnet", dll_path],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
    )
    
    line = proc.stdout.readline()
    if line:
        data = json.loads(line.strip())
        print(f"\nWith admin privileges:")
        print(f"  cpu_temp: {data.get('cpu_temp', 'MISSING')}")
        print(f"  cpu_power_w: {data.get('cpu_power_w', 'MISSING')}")
        print(f"  gpu_power_w: {data.get('gpu_power_w', 'MISSING')}")
        print(f"  All keys: {sorted(data.keys())}")
    
    proc.terminate()
else:
    print("\n⚠️  NOT running as admin. CPU temp/power will be blank.")
    print("The LHM helper MUST run in a process tree that started as Administrator.")
    print("If the Electron app starts the backend, the ELECTRON APP must be launched as admin.")
    print("\nTo test: open a PowerShell window as Administrator, then run:")
    print(f'  cd "{os.path.dirname(os.path.dirname(os.path.abspath(__file__)))}"')
    print(f'  uv run main.py')
