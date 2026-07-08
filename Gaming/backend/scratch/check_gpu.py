import sys
import os

# Add paths
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from nvidia.gpu_monitor import GPUMonitor, _NVML_AVAILABLE, _PDH_AVAILABLE

print("NVML Available:", _NVML_AVAILABLE)
print("PDH Available:", _PDH_AVAILABLE)

monitor = GPUMonitor()
print("Initialized:", monitor._initialized)
print("DXGI GPUs:", monitor._dxgi_gpus)

metrics = monitor.poll_once()
print("Metrics Poll 1:")
for k, v in metrics.items():
    if "vram" in k or "util" in k or "temp" in k:
        print(f"  {k}: {v}")

# Now let's try direct NVML memory query if initialized
if monitor._initialized and monitor._handle:
    import pynvml
    try:
        mem = pynvml.nvmlDeviceGetMemoryInfo(monitor._handle)
        print("Direct NVML Memory Info:")
        print(f"  used: {mem.used // (1024*1024)} MB")
        print(f"  free: {mem.free // (1024*1024)} MB")
        print(f"  total: {mem.total // (1024*1024)} MB")
    except Exception as e:
        print("Direct NVML failed:", e)
