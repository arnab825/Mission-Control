# Mission Control — Privacy Policy & Telemetry Governance

*Last Updated: November 24, 2026*

Mission Control is committed to protecting user privacy, ensuring absolute transparency regarding system telemetry, and maintaining a strict **local-first** security architecture. This document details what hardware telemetry is accessed, how it is processed, and what data leaves your device.

---

## 1. Executive Summary

| Category | On-Device (Local) | Leaves Device (Cloud Sync) |
| :--- | :--- | :--- |
| **Hardware Telemetry** (CPU, GPU, RAM, VRAM, temps, clocks, fans) | ✅ 100% Local | ❌ Never leaves device |
| **Display & MUX Routing** (Resolution, refresh rates, Optimus state) | ✅ 100% Local | ❌ Never leaves device |
| **Gameplay Screen Capture & Vision Feeds** (YOLOv8, video buffers) | ✅ 100% Local in RAM | ❌ Never leaves device |
| **Game Executables & Library Paths** (Steam, Epic, custom installs) | ✅ 100% Local | ❌ Never leaves device |
| **Account Profile & Settings** (Callsign, faction, UI theme) | ✅ Local cache | Optional (only when signed in) |
| **Benchmark Summary Reports** | ✅ Local storage | Optional (only when user clicks Share) |

---

## 2. Hardware Telemetry & Monitoring

### What is Read:
- **Graphics Processor (GPU)**: GPU core temperature, junction temperature, clock speeds, VRAM utilization, power draw (watts), and fan RPM via NVIDIA NVML (`nvidia-smi`) and Windows DirectX/DXGI APIs.
- **Central Processor (CPU)**: Per-core utilization, package temperatures, clock frequencies via Windows Performance Counters and `psutil`.
- **System Memory (RAM)**: Committed memory, working set sizes, available memory headroom.
- **Display Pipeline & MUX Routing**: Attached display identifiers, native resolutions, refresh rates, and active display scanout adapter via Windows `EnumDisplayDevicesW` and `Win32_VideoController`.

### How it is Processed:
- **100% In-Memory Processing**: All hardware telemetry streams are sampled locally and broadcasted exclusively over a local loopback WebSocket connection (`127.0.0.1`) between the local Python backend and Electron desktop client.
- **Zero Cloud Logging**: Hardware telemetry is **never** sent to any external server, analytics platform, or telemetry collector.

---

## 3. Online Synchronization & Cloud Services

When you optionally sign in to Mission Control (using your Discord or Google gaming profile):

### What Leaves the Device:
- **User Profile Preferences**: Your chosen gamer callsign (e.g., `OPERATIVE-01`), tactical faction affiliation, and active UI theme preset (e.g., `Emerald Protocol`).
- **Benchmark Reports (Explicit User Action Only)**: When you manually click **"Export"** or **"Share Benchmark"**, the summary benchmark metrics (1% lows, average FPS, frame time consistency curve) are packaged for export. No background benchmark telemetry is uploaded automatically.

### Authentication Provider:
- Authentication is handled via industry-standard protocols (Clerk SDK). Passwords, auth tokens, and session secrets are encrypted in transit via TLS 1.3 and never stored on local plain-text logs.

---

## 4. AI Assistant & Vision Pipeline Privacy

- **Privacy Shield**: When Privacy Shield is enabled in Mission Control, external web searches are automatically blocked to prevent external context leakage.
- **Vision AI Processing**: Gameplay screen frame analysis (YOLOv8, tactical target detection) runs **100% offline** on your local machine using local PyTorch / ONNX models. No screen captures or video replay buffers are ever uploaded to any cloud server.

---

## 5. Data Retention & User Rights

- **Local Storage Deletion**: All cached session histories, local benchmark logs, and configuration files can be permanently erased by clearing application storage in **Settings > Application > Purge Cache** or deleting `%APPDATA%\mission-control`.
- **Account Data Deletion**: You can request full deletion of any cloud-synced profile preferences at any time by contacting support or via our online portal at [https://mission-control-service-g7hfgye5hcamc9f2.centralindia-01.azurewebsites.net/privacy](https://mission-control-service-g7hfgye5hcamc9f2.centralindia-01.azurewebsites.net/privacy).

---

## 6. Contact & Bug Reports

For privacy inquiries, audit questions, or security disclosures:
- **Repository Issues**: [https://github.com/arnab825/Mission-Control/issues](https://github.com/arnab825/Mission-Control/issues)
- **Official Portal**: [https://mission-control-service-g7hfgye5hcamc9f2.centralindia-01.azurewebsites.net](https://mission-control-service-g7hfgye5hcamc9f2.centralindia-01.azurewebsites.net)
