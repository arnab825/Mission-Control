import glob
import os

print("Searching logs in Roaming...")
roaming_logs = glob.glob(os.path.expanduser("~\\AppData\\Roaming\\**\\*.log"), recursive=True)
for lf in roaming_logs:
    if os.path.exists(lf) and os.path.getsize(lf) > 0:
        try:
            with open(lf, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
                for i, line in enumerate(lines):
                    if "list index out of range" in line or "index out of range" in line:
                        print(f"\n--- Found in {lf} at line {i+1}:")
                        start = max(0, i-5)
                        end = min(len(lines), i+15)
                        for idx in range(start, end):
                            print(f"{idx+1}: {lines[idx].strip()}")
        except Exception as e:
            pass

print("Searching logs in Local...")
local_logs = glob.glob(os.path.expanduser("~\\AppData\\Local\\**\\*.log"), recursive=True)
for lf in local_logs:
    # Skip huge/irrelevant directories like Gemin/ide/logs or similar
    if "antigravity-ide" in lf or "temp" in lf.lower():
        continue
    if os.path.exists(lf) and os.path.getsize(lf) > 0:
        try:
            with open(lf, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
                for i, line in enumerate(lines):
                    if "list index out of range" in line or "index out of range" in line:
                        print(f"\n--- Found in {lf} at line {i+1}:")
                        start = max(0, i-5)
                        end = min(len(lines), i+15)
                        for idx in range(start, end):
                            print(f"{idx+1}: {lines[idx].strip()}")
        except Exception as e:
            pass
