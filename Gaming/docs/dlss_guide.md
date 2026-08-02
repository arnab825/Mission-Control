# The Evolution of DLSS

*From AI Upscaling to Neural Rendering*

## DLSS 1 (AI Super Sampling)
**What Changed**: Deep-learning reconstruction from lower-resolution frames using a game-specific AI model.
**Key Tech**: NVIDIA Tensor Cores + Deep Learning Super Sampling.
**Impact**: The first step toward using AI to increase rendering performance.

## DLSS 2 (AI Super Resolution)
**What Changed**: Introduced a generalized AI model using temporal data, motion vectors, and Tensor Cores.
**Key Tech**: Temporal feedback + deep-learning reconstruction.
**Impact**: Better image quality and broad game support without per-game AI models.

## DLSS 3 (AI Frame Generation)
**What Changed**: Added AI Frame Generation, creating new frames between traditionally rendered frames.
**Key Tech**: Optical Flow Accelerator + Tensor Cores + NVIDIA Reflex.
**Impact**: Higher displayed frame rates with improved latency management.

## DLSS 3.5 (Ray Reconstruction)
**What Changed**: Replaced multiple hand-tuned ray-tracing denoisers with an AI-powered Ray Reconstruction model.
**Key Tech**: Deep-learning model trained to reconstruct higher-quality ray-traced images.
**Impact**: More detailed lighting, reflections and global illumination with improved temporal stability.

## DLSS 4 (Multi Frame Generation)
**What Changed**: Introduced Multi Frame Generation alongside Transformer-based models for key DLSS technologies.
**Key Tech**: Transformer models + 5th-gen Tensor Cores + Multi Frame Generation.
**Impact**: Up to 3 AI-generated frames per traditionally rendered frame on RTX 50 Series.

## DLSS 4.5 (Dynamic Multi Frame Generation)
**What Changed**: Introduced 2nd-gen Transformer models and Dynamic Multi Frame Generation.
**Key Tech**: 2nd-gen Transformer Super Resolution + Dynamic MFG.
**Impact**: Up to 5 AI-generated frames per rendered frame, enabling up to 6X frame generation on supported RTX 50 Series GPUs.

## DLSS 5 (Neural Rendering)
**What Changed**: Moves beyond reconstruction with real-time neural rendering designed to transform rendered pixels with photorealistic lighting and materials.
**Key Tech**: Neural rendering model integrated into the real-time graphics pipeline.
**Impact**: Aims to push real-time graphics closer to cinematic-level visual fidelity. 
**Status**: Coming Fall 2026.
