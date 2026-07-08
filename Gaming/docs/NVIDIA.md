# 🎯 NVIDIA Technology Integration Guide

This document outlines the specific NVIDIA hardware and software technologies utilized by the Mission Control Gaming Assistant.

## 🚀 NVIDIA NIM (Inference Microservices)
The assistant leverages **NVIDIA NIM** to provide world-class reasoning without local VRAM penalties.
*   **Hybrid Inference:** Intelligent switching detects connectivity. When offline, the system bypasses cloud calls to prevent latency spikes and falls back to local reasoning.
*   **Strategic Reasoning:** Uses `meta/llama-3.1-8b-instruct` for fast long-term strategy.
*   **Tactical Analysis:** Uses `meta/llama-3.1-8b-instruct` for real-time combat advice.
*   **Vision Enrichment:** Uses `meta/llama-3.2-11b-vision-instruct` for robust scene understanding.
*   **Voice Engine:** Hybrid system utilizing **Google Cloud TTS** and **ElevenLabs** for high-fidelity responses, ensuring reliability beyond deprecated NIM audio endpoints.

## ⚡ TensorRT (High-Performance Inference)
The vision pipeline is powered exclusively by **TensorRT 10.x**.
*   **Pure TRT Mode:** Unlike standard AI apps, Mission Control does not load the PyTorch runtime during gameplay. This saves **~1,000MB of VRAM**.
*   **Engine Optimization:** YOLOv8 models are compiled into FP16 `.engine` files specifically tuned for the user's GPU architecture (Turing, Ampere, Ada, or Blackwell).

## 📊 NVML (NVIDIA Management Library)
Real-time hardware monitoring is handled via `pynvml`.
*   **Metrics:** GPU Core Util, VRAM usage, Temperature, Power Draw (Watts), and Clock Speeds.
*   **Performance Advisor:** Recommends **DLSS**, **Frame Generation**, **Reflex**, and **Path Tracing** settings based on live bottleneck analysis.
*   **Feature Verification:** Automatically detects support for **Overdrive Mode** and hardware-accelerated **Path Tracing** for compatible GPUs.

## 🎮 DLSS & Blackwell Support
Mission Control is future-proofed for the latest hardware features:
*   **DLSS 3.x/4.x:** Monitoring and advice for Frame Generation and Multi-Frame Gen.
*   **Blackwell (RTX 50-series):** Specialized support for architectural features and thermal profiles of the latest GPUs.
*   **NVIDIA Reflex:** Integrated latency monitoring to ensure sub-ms input response.

---
*Powered by the NVIDIA RTX AI Toolkit.*
