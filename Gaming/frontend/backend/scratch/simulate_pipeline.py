import sys
import os
import time
import logging
import random
import numpy as np

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.pipeline_host import GamingAssistantPipeline
from nvidia.capabilities import GPUCapabilities

# Setup basic logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("simulation")

# Disable noisy logging
logging.getLogger("dxcam").setLevel(logging.ERROR)
logging.getLogger("core.pipeline_host").setLevel(logging.WARNING)

def high_precision_delay(duration_seconds):
    """Hybrid spin-sleep lock for sub-millisecond pacing precision."""
    target = time.perf_counter() + duration_seconds
    if duration_seconds > 0.002:
        time.sleep(duration_seconds - 0.001)
    while time.perf_counter() < target:
        pass

def get_base_fps_for_gpu(gpu_name: str) -> float:
    """Determine baseline 1080p Ultra FPS based on GPU model."""
    name_upper = gpu_name.upper()
    # Blackwell (RTX 50 Series)
    if "5090" in name_upper: return 240.0
    if "5080" in name_upper: return 180.0
    if "5070" in name_upper: return 140.0
    if "5060" in name_upper: return 100.0
    if "5050" in name_upper: return 80.0
    
    # Ada Lovelace (RTX 40 Series)
    if "4090" in name_upper: return 200.0
    if "4080" in name_upper: return 150.0
    if "4070" in name_upper: return 110.0
    if "4060" in name_upper: return 80.0
    if "4050" in name_upper: return 60.0
    
    # Ampere (RTX 30 Series)
    if "3090" in name_upper: return 140.0
    if "3080" in name_upper: return 110.0
    if "3070" in name_upper: return 85.0
    if "3060" in name_upper: return 65.0
    if "3050" in name_upper: return 50.0
    
    return 60.0  # Generic default

def calculate_simulated_fps(base_fps, dlss, frame_gen, ray_tracing, path_tracing, multiplier_str="2x"):
    """Calculate the target FPS based on hardware baseline and active settings."""
    fps = base_fps
    
    # Ray Tracing reduces FPS by ~45%
    if ray_tracing:
        fps *= 0.55
        
    # Path Tracing reduces FPS by ~70% (on top of RT)
    if path_tracing:
        fps *= 0.30
        
    # DLSS increases FPS by ~60%
    if dlss:
        fps *= 1.60
        
    # Frame Generation multiplies FPS by 2x or 3x
    if frame_gen and dlss:
        mult = 2.0
        if "3" in multiplier_str:
            mult = 3.0
        elif "4" in multiplier_str:
            mult = 4.0
        fps *= mult
        
    return max(5.0, fps)

def run_simulation():
    print("==================================================")
    print("Mission Control - HARDWARE-INFLUENCED FPS SIMULATION")
    print("==================================================")

    # 1. Detect GPU Capabilities
    caps = GPUCapabilities()
    gpu_name = caps.gpu_name
    base_fps = get_base_fps_for_gpu(gpu_name)
    
    print(f"[+] Detected GPU      : {gpu_name}")
    print(f"[+] Architecture      : {caps.architecture} ({caps.generation})")
    print(f"[+] Baseline 1080p FPS: {base_fps:.1f} FPS")
    print(f"[+] DLSS 3 Support    : {'YES' if caps.supports('dlss_3') else 'NO'}")
    print(f"[+] Ray Tracing Support: {'YES' if caps.supports('ray_tracing') else 'NO'}")
    print(f"[+] Path Tracing Support: {'YES' if caps.supports('path_tracing') else 'NO'}")
    print("==================================================\n")

    # Initialize pipeline
    config = {
        "game_mode": "competitive",
        "capture": {
            "region": None,
            "backend": "auto",
            "cap_fps": False,
            "fps_cap_limit": 60,
            "device_index": 0,
            "output_index": 0,
            "focus_mode": "Primary Only"
        },
        "vision": {
            "ocr": {"enabled": False},
            "detector": "rules",
            "scene_detection": {"enabled": True}
        },
        "memory": {"enabled": False},
        "nvidia": {
            "gpu_monitoring": {"enabled": False},
            "performance_advisor": {"enabled": False}
        },
        "voice": {"enabled": False},
        "headless": True
    }
    
    pipeline = GamingAssistantPipeline(config)
    pipeline._is_game_active = lambda: (True, True, "Simulated Hardware Game")
    
    # Grab one template frame for presentation
    template_frame = pipeline.capture.get_frame()
    if template_frame is None:
        template_frame = np.zeros((450, 800, 3), dtype=np.uint8)

    # Start backend threads
    pipeline.start()

    # Define the 5 simulation test phases
    phases = [
        {
            "name": "Phase 1: Baseline Rendering (RT OFF, DLSS OFF)",
            "rt": False, "pt": False, "dlss": False, "fg": False
        },
        {
            "name": "Phase 2: Ray Tracing Stress Test (RT ON, DLSS OFF)",
            "rt": True, "pt": False, "dlss": False, "fg": False
        },
        {
            "name": "Phase 3: Path Tracing Ultimate Stress Test (RT ON, PT ON, DLSS OFF)",
            "rt": True, "pt": True, "dlss": False, "fg": False
        },
        {
            "name": "Phase 4: DLSS Resolution Upscaling (RT ON, PT ON, DLSS ON, FG OFF)",
            "rt": True, "pt": True, "dlss": True, "fg": False
        },
        {
            "name": "Phase 5: Multi-Frame Gen Recovery (RT ON, PT ON, DLSS ON, FG ON)",
            "rt": True, "pt": True, "dlss": True, "fg": True
        }
    ]

    try:
        # Override the pipeline's capture loop to let us push frames manually at the simulated rate
        pipeline.running = True
        
        # Stop the default capture thread so we can push frames from this thread
        if hasattr(pipeline, "_capture_thread") and pipeline._capture_thread.is_alive():
            # A simple flag mock to make the default thread yield/exit
            pipeline.running = False
            pipeline._capture_thread.join(timeout=1.0)
            pipeline.running = True

        for idx, phase in enumerate(phases, 1):
            target_fps = calculate_simulated_fps(
                base_fps, 
                dlss=phase["dlss"], 
                frame_gen=phase["fg"], 
                ray_tracing=phase["rt"], 
                path_tracing=phase["pt"]
            )
            
            print(f"\n--- {phase['name']} ---")
            print(f"    Target Frame Rate: {target_fps:.2f} FPS")
            
            # Reset C++ QPC stats for a clean run per phase
            if hasattr(pipeline.frame_buffer, "_fps_counter") and pipeline.frame_buffer._fps_counter:
                pipeline.frame_buffer._fps_counter._timestamps = []
                
            from fps_counter.fps_counter_dx import fps_counter
            fps_counter.reset()
            
            # Run the phase loop for 3.5 seconds
            phase_end = time.time() + 3.5
            frame_count = 0
            
            while time.time() < phase_end:
                t_loop = time.perf_counter()
                
                # Push frame to buffer
                pipeline.frame_buffer.push(template_frame)
                frame_count += 1
                
                # Calculate required sleep with high precision
                elapsed = time.perf_counter() - t_loop
                target_interval = 1.0 / target_fps
                
                # Introduce realistic 1% frame-time jitter (occasional spikes)
                if frame_count > 0 and frame_count % 75 == 0:
                    jitter = random.uniform(0.04, 0.08)  # 12-25 FPS spike
                else:
                    jitter = random.uniform(-0.015, 0.015) * target_interval
                
                sleep_duration = max(0.0, target_interval - elapsed + jitter)
                high_precision_delay(sleep_duration)

            # Retrieve telemetry results
            avg_fps = fps_counter.average_fps
            min_fps = fps_counter.min_fps
            max_fps = fps_counter.max_fps
            low_1pct = fps_counter.one_percent_low
            
            print(f"    [QPC Results] Average: {avg_fps:.2f} FPS | Max: {max_fps:.2f} FPS | 1% Lows: {low_1pct:.2f} FPS")

    except KeyboardInterrupt:
        print("\n[!] Benchmark interrupted by user.")
    finally:
        print("\n[+] Stopping simulation...")
        pipeline.stop()
        print("[+] Simulation stopped.")
        
    print("\n==================================================")
    print("HARDWARE PERFORMANCE BENCHMARK COMPLETE")
    print("==================================================\n")

if __name__ == "__main__":
    run_simulation()
