---
title: "Controller & Gamepad Input Mapping"
category: "Core Logic"
badge: "Input Engine"
badgeColor: "text-neon-green"
excerpt: "Complete guide to Mission Control's interactive HTML5 & XInput Gamepad Configurator, custom action combos, analog stick deadzone tuning, and force feedback haptics."
---

# Controller & Gamepad Input Mapping

*Unified Hardware Gamepad Abstraction, Real-Time Polling & Custom Haptics*

![Controller Mapping Diagram](/images/controller_mapping.png)

> [!NOTE]
> Mission Control features full dual-stack Gamepad support across **XInput**, **DirectInput**, and the browser **HTML5 Gamepad API**. Whether you play with an Xbox Wireless Controller, DualSense, DualShock 4, or generic DirectInput gamepad, Mission Control auto-detects and binds hardware inputs in real time.

---

## Key Features

1. **Interactive Visual SVG Diagram**: Real-time neon-green button highlights and stick vector indicators for both Xbox and PlayStation button layouts.
2. **Custom Feature Action Binds**:
   - `LB + RB`: Multi-button instant Boost overlay trigger.
   - `D-PAD UP`: Activates Aero AI Voice Assistant.
   - `Y / Triangle`: Triggers Tactical Recon overlay analysis.
   - `X / Square`: Performs automated Story & Cutscene Auto-Skip.
   - `SELECT / SHARE`: Toggles HUD overlay visibility.
3. **Analog Stick Deadzone Control**: Configurable deadzone filtering (5% to 35%) to eliminate drift on worn analog sticks.
4. **Dual-Motor Haptics Vibration**: Live test suite for left (heavy low-frequency rumble) and right (high-frequency haptic impulse) vibration motors via XInput `XInputSetState`.

---

## Supported Controller Architectures

| Controller Family | Detection Mechanism | Native Vibration | Special Features |
| :--- | :--- | :--- | :--- |
| **Xbox Wireless / Elite** | XInput & HTML5 Gamepad API | Dual Impulse Motors | Full Guide Button & Trigger Haptics |
| **PlayStation DualSense / DS4** | DirectInput & Pygame | Dual Actuators | Adaptive Trigger telemetry mapping |
| **Generic DirectInput** | Pygame / WinMM Fallback | Single Motor | Auto-mapping fallback profile |

---

## Python Backend Integration (`input_manager.py`)

The backend Python daemon routes gamepad inputs directly to system macros and overlay functions:

```python
# System IPC handler for controller vibration
from control.input_manager import input_manager

# Trigger haptic impulse feedback (0.0 to 1.0 intensity)
input_manager.trigger_rumble(left_motor=0.8, right_motor=0.5, duration_ms=300)
```

> [!TIP]
> You can fine-tune your controller deadzones directly in **Settings -> Controller & Input Mapping** inside the desktop app or web dashboard.
