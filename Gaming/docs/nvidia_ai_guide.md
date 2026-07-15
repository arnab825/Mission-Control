[← Back to Main Project Guide](./README.md)

# 🛡️ Guide: NVIDIA AI & Gaming Technologies

Comprehensive guide for leveraging NVIDIA's hardware and software for the AI Gaming Assistant.

---

## 1. Local Vision AI (Low Latency)
For real-time detection, we use **YOLO** optimized for NVIDIA GPUs.

### How to optimize:
*   **CUDA:** Ensure `torch.cuda.is_available()` returns `True`. This ensures the model runs on your GPU, not your CPU.
*   **TensorRT:** Once your model works, convert it to a `.engine` file for massive speed gains.
    ```python
    from ultralytics import YOLO
    model = YOLO("yolov8n.pt")
    model.export(format="engine") # Runs up to 10x faster
    ```

---

## 2. Achieving 60fps+ Capture

### Why `mss` caps at ~30fps
The `mss` library uses Windows GDI, which copies pixels from the CPU. At 1080p, each frame is ~6MB of data going through the CPU.

### Solution: DXGI Desktop Duplication via `dxcam`
`dxcam` uses the Windows Desktop Duplication API (DXGI), which captures frames directly from the GPU framebuffer — **zero CPU-side pixel copies**.

```python
# Old (MSS) — ~30fps
import mss
sct = mss.mss()
frame = sct.grab(monitor)  # CPU-bound, slow

# New (dxcam) — 120fps+
import dxcam
cam = dxcam.create(output_color="BGR")
frame = cam.grab()  # GPU-accelerated, fast
```

### Performance comparison:
| Backend | 1080p FPS | 1440p FPS | CPU Usage |
|---------|-----------|-----------|-----------|
| `mss`   | 25-45     | 15-30     | High      |
| `dxcam` | 90-144+   | 60-120    | Low       |

### Multi-threaded pipeline
Our architecture decouples capture from processing:
```
Capture (120hz) → FrameBuffer → Vision (60hz) → Brain (10hz)
```
Each thread runs at its own rate. Vision can skip frames when overloaded without blocking capture.

---

## 3. NVIDIA Gaming Technologies

### 3.1 DLSS (Deep Learning Super Sampling)

DLSS uses Tensor Cores to perform AI-powered upscaling, rendering at a lower resolution internally and reconstructing to your native resolution.

| Version | What It Does | GPU Required |
|---------|-------------|-------------|
| **DLSS 2 (Super Resolution)** | AI upscaling from lower res → native. Quality modes: DLAA, Quality, Balanced, Performance, Ultra Performance | RTX 20+ (Turing) |
| **DLSS 3 (Frame Generation)** | Generates entire new frames between rendered ones, effectively 2x FPS. Uses Optical Flow Accelerator. | RTX 40+ (Ada Lovelace) |
| **DLSS 3.5 (Ray Reconstruction)** | Replaces hand-tuned denoisers with AI, producing cleaner ray-traced images at lower ray counts | RTX 40+ (Ada Lovelace) |
| **DLSS 4 (Multi Frame Generation)** | Generates up to 3 frames per rendered frame → up to 8x total FPS boost | RTX 50+ (Blackwell) |
| **DLSS 4.5 (Dynamic FG)** | Dynamically adjusts the number of generated frames based on scene complexity and motion for smoother experience | RTX 50+ (Blackwell) |

**When to use:**
- FPS below target → Enable DLSS Super Resolution (Balanced or Performance)
- FPS still low with DLSS SR → Add Frame Generation (RTX 40+)
- Ray Tracing enabled → Use DLSS 3.5 Ray Reconstruction for cleaner RT
- Always pair DLSS 3/4 Frame Gen with **NVIDIA Reflex** to keep latency low

### 3.2 Ray Tracing & Path Tracing

| Technology | Description | Performance Impact |
|-----------|-------------|-------------------|
| **Ray Tracing (RT)** | Simulates realistic light for shadows, reflections, and GI. Uses dedicated RT Cores. | Moderate-High (use DLSS to compensate) |
| **Path Tracing** | Full light simulation — every ray is physically traced. Used in Cyberpunk 2077 RT Overdrive, Portal RTX, Alan Wake 2. | Very High (requires DLSS + RTX 40+) |

**Our assistant automatically detects** if your GPU has RT Cores and recommends enabling/disabling RT based on your current FPS headroom.

### 3.3 NVIDIA Reflex

Reduces render queue latency by synchronizing the CPU and GPU. Critical for:
- **Competitive gaming:** Up to 50% lower input-to-display latency
- **DLSS 3 Frame Generation:** Frame Gen adds latency; Reflex compensates

**Our advisor always recommends Reflex ON** when Frame Generation is available.

### 3.4 GPU Architecture Capabilities

Our `nvidia/capabilities.py` detects your GPU's architecture and maps features:

```
┌──────────────┬─────────┬──────────┬──────────┬───────────┬───────────┐
│ Feature      │ Turing  │ Ampere   │ Ada      │ Blackwell │ Required  │
│              │ RTX 20  │ RTX 30   │ RTX 40   │ RTX 50    │           │
├──────────────┼─────────┼──────────┼──────────┼───────────┼───────────┤
│ CUDA         │   ✅    │    ✅    │    ✅    │     ✅    │ All       │
│ RT Cores     │   ✅    │    ✅    │    ✅    │     ✅    │ Turing+   │
│ Tensor Cores │   ✅    │    ✅    │    ✅    │     ✅    │ Turing+   │
│ DLSS 2       │   ✅    │    ✅    │    ✅    │     ✅    │ Turing+   │
│ DLSS 3 FG    │   ❌    │    ❌    │    ✅    │     ✅    │ Ada+      │
│ DLSS 4 MFG   │   ❌    │    ❌    │    ❌    │     ✅    │ Blackwell │
│ DLSS 4.5 DFG │   ❌    │    ❌    │    ❌    │     ✅    │ Blackwell │
│ Path Tracing │   ❌    │    ❌    │    ✅    │     ✅    │ Ada+      │
│ Reflex       │   ✅    │    ✅    │    ✅    │     ✅    │ Turing+   │
│ TensorRT     │   ✅    │    ✅    │    ✅    │     ✅    │ All       │
│ NVENC AV1    │   ❌    │    ❌    │    ✅    │     ✅    │ Ada+      │
└──────────────┴─────────┴──────────┴──────────┴───────────┴───────────┘
```

---

## 4. GPU Monitoring (NVML)

The assistant uses **pynvml** (NVIDIA Management Library) to track real-time GPU metrics:

```python
import pynvml
pynvml.nvmlInit()
handle = pynvml.nvmlDeviceGetHandleByIndex(0)

# Core metrics
util = pynvml.nvmlDeviceGetUtilizationRates(handle)    # GPU & memory utilization
mem = pynvml.nvmlDeviceGetMemoryInfo(handle)            # VRAM used/total
temp = pynvml.nvmlDeviceGetTemperature(handle, 0)       # Temperature °C
power = pynvml.nvmlDeviceGetPowerUsage(handle) / 1000   # Power in watts
```

**Tracked metrics:**
- GPU Core utilization (%)
- VRAM used / total (MB)
- GPU temperature (°C) with color-coded warnings
- Power draw vs power limit (W)
- Clock speeds (GPU & Memory MHz)
- NVENC/NVDEC encoder/decoder utilization

---

## 5. NVIDIA NeMo (LLM Reasoning)

### Options:
*   **Local (Heavy):** Download models like `Nemotron-Mini` or `Llama-3-8B` and run them using the NeMo toolkit. Requires 8GB+ VRAM.
*   **API (Production):** Use **NVIDIA NIM** (NVIDIA Inference Microservices). Integrated via the OpenAI Python client.
    *   **Reasoning:** `meta/llama-3.1-70b-instruct` or `nvidia/nemotron-4-340b-instruct`.
    *   **VLM (Vision):** `nvidia/vlm-vila-1.5-40b` for visual game context.
    *   **Implementation:** See `ai_brain/decision_maker.py` for the agentic reasoning layer.


---

## 6. Real-Time Audio (NVIDIA Riva)
NVIDIA has specific models for high-performance voice:
*   **STT (Listening):** `nvidia/parakeet-ctc-1.1b` or `nvidia/canary-1b`. Optimized for noisy gaming environments.
*   **TTS (Speaking):** `nvidia/fastpitch`. Expressive, natural-sounding voice for the agent.
*   **Audio Effects:** Use the Broadcast NIM to remove keyboard/fan noise from your microphone.
*   **Implementation:** Configured in `config/settings.yaml` under `ai_agent` and managed by `voice/voice_manager.py`.


---

## 7. OCR for Story Games
For single-player and story games, we use **RapidOCR** (ONNX-accelerated) to read:
- Dialogue and subtitle text
- Quest objectives and waypoints
- Item names and descriptions
- Interaction prompts

```python
from rapidocr_onnxruntime import RapidOCR
reader = RapidOCR()
results, elapsed_time = reader(frame_region)
```

---

## 8. Getting Started Checklist
1. [ ] **Drivers:** Install the latest [NVIDIA Game Ready Drivers](https://www.nvidia.com/download/index.aspx).
2. [ ] **CUDA Toolkit:** Install [CUDA 12.x](https://developer.nvidia.com/cuda-downloads).
3. [ ] **cuDNN:** Download the [cuDNN library](https://developer.nvidia.com/cudnn) and add it to your PATH.
4. [ ] **API Keys:** Sign up at [NVIDIA Build](https://build.nvidia.com/) for free cloud credits.
5. [ ] **dxcam:** `uv pip install dxcam` for 60fps+ screen capture.
6. [ ] **RapidOCR:** `uv pip install rapidocr-onnxruntime` for story mode text detection.
7. [ ] **pynvml:** `uv pip install pynvml` for GPU monitoring.
8. [ ] **pygame:** `uv pip install pygame` for controller support.
