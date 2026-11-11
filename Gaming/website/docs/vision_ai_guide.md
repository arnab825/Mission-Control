---
title: "Vision On-Demand AI & Perception Models"
category: "AI Models"
badge: "Vision Engine"
badgeColor: "text-neon-yellow"
excerpt: "Architectural overview of Mission Control's AI Vision pipeline, YOLOv8 object detection, Whisper-Tiny voice recognition, and direct in-app model weight downloader."
---

# Vision On-Demand AI & Perception Models

*Real-Time Game Screen Analysis, Object Bounding Boxes & On-Demand Model Downloader*

![TensorRT YOLO Vision Detection](/screenshots/vision.webp)

> [!NOTE]
> Mission Control incorporates lightweight, high-speed Computer Vision models (**YOLOv8 Nano/Small**) and Automatic Speech Recognition (**Whisper-Tiny**) for real-time tactical game screen analysis, enemy/health bar detection, and voice-command activation.

---

## On-Demand Model Weight Pipeline

Instead of bundling heavy GGUF/PyTorch model weights into the initial installer, Mission Control downloads models on demand directly into `Gaming/backend/models`.

### Supported Models

| Model ID | Task | Size | Precision | Download Source |
| :--- | :--- | :--- | :--- | :--- |
| **YOLOv8n** | Real-time Object & HUD Detection | 6.2 MB | FP16 / INT8 | In-App Direct Download |
| **YOLOv8s** | High-Accuracy Tactical Recon | 22.5 MB | FP16 | In-App Direct Download |
| **Whisper-Tiny** | Voice AI & Offline Speech Commands | 75.0 MB | FP16 | In-App Direct Download |

---

## Direct In-App Model Downloader

When an AI model weight update is available, the Vision interface streams model weights in-app with real-time download telemetry:

```typescript
// Trigger in-app streaming download without external browser redirects
sendCommand('download_ai_model', { model_id: 'yolov8n' });
```

> [!IMPORTANT]
> Downloaded weights are verified with SHA-256 checksums before loading into ONNX Runtime or PyTorch execution providers.

---

## Performance & Overhead

- **GPU Acceleration**: Uses TensorRT execution providers on NVIDIA RTX GPUs for sub-5ms screen inference.
- **CPU Fallback**: Uses OpenVINO / ONNX Runtime CPU execution provider with zero memory leaks.
