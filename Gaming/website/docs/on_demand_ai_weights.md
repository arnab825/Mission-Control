---
title: "On-Demand AI Model Weights"
category: "AI Models"
excerpt: "Comprehensive guide to Mission Control's on-demand neural weights: YOLOv8n, YOLOv8s, and Whisper-Tiny."
badge: "AI Engine"
badgeColor: "text-neon-green"
---

# On-Demand AI Model Weights

Mission Control keeps its base installation package lightweight (~60 MB) by offering optional AI neural network weights **on-demand**. This modular design ensures users can download only the specific neural capabilities required for their gaming setup.

---

## 1. Available Model Weights

### YOLOv8n Vision Model (`6.2 MB`)
* **Architecture**: YOLOv8 Nano (`yolov8n.pt`)
* **Primary Function**: Ultra-fast HUD target tracking & low-latency object detection.
* **Inference Speed**: ~2–5 ms per frame (GPU dependent).
* **VRAM Footprint**: Minimal (~150 MB VRAM overhead).
* **Best For**: Entry-level GPUs, budget setups, and competitive high-FPS gameplay requiring sub-5ms overlay tracking.

### YOLOv8s High Precision (`22.5 MB`)
* **Architecture**: YOLOv8 Small (`yolov8s.pt`)
* **Primary Function**: High-accuracy neural tracking & complex scene understanding.
* **Inference Speed**: ~6–12 ms per frame.
* **VRAM Footprint**: ~400 MB VRAM overhead.
* **Best For**: High-end GPUs, 1440p / 4K monitors, and complex game scenes requiring precise detection of small UI elements and distant enemy outlines.

### Whisper-Tiny Voice AI (`39.0 MB`)
* **Architecture**: OpenAI Whisper Tiny (`whisper-tiny.pt`)
* **Primary Function**: Offline neural Speech-to-Text (STT) & voice command engine.
* **Processing Mode**: 100% On-Device local processing.
* **Best For**: Hands-free voice commands, AI assistant voice interactions, and offline operational privacy with zero cloud API latency.

---

## 2. Technical Execution Pipeline

When a model weight is downloaded via the **Vision** or **Voice** dashboard:
1. The app fetches pre-trained neural weights directly from Mission Control's secure release mirror.
2. Weights are stored locally under `%APPDATA%\MissionControl\models\` (Windows) or `~/.config/MissionControl/models/` (Linux).
3. If an NVIDIA GPU is active, TensorRT 10.x automatically compiles `.pt` weights into optimized FP16/INT8 `.engine` binaries tailored to your GPU's exact compute architecture.

---

## 3. Managing Model Weights

* **Installation**: Open **Vision AI** or **Agent Settings** in Mission Control and click **Download** next to the desired model card.
* **Storage Location**:
  * Windows: `%APPDATA%\MissionControl\models\`
  * Linux: `~/.config/MissionControl/models/`
* **Removal**: Deleting model weight files from disk automatically reverts the UI state back to "Not Installed" without affecting base application functions.
