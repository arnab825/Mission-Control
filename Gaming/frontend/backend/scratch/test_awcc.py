"""Test specific bit-packed sensor arguments for Alienware."""
import subprocess

def test_awcc(method, a):
    script = f"""
$awcc = Get-CimInstance -Namespace 'root\WMI' -ClassName 'AWCCWmiMethodFunction' -ErrorAction Stop
$r = Invoke-CimMethod -InputObject $awcc -MethodName '{method}' -Arguments @{{arg2=[uint32]{a}}} -ErrorAction Stop
Write-Host $r.argr
"""
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", script],
        capture_output=True, text=True, timeout=5
    )
    val = result.stdout.strip()
    return val

args = [4, 260, 516, 772, 1028]
methods = ["Thermal_Information", "GetThermalInfo2", "GetFanSensors"]

print("=== Testing Sensor Structs ===")
for m in methods:
    print(f"\\n--- {m} ---")
    for a in args:
        val = test_awcc(m, a)
        if val and val not in ["4294967294", "4294967295"]:
            print(f"  arg2={a}: {val}")
