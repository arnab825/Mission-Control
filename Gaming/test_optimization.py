import os
import sys

# Add backend to path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "backend"))
sys.path.insert(0, backend_path)

from dotenv import load_dotenv
env_path = os.path.join(backend_path, ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

from system.hw_checker import HardwareChecker
from system.preset_detector import GamePresetDetector
from ai_brain.core_optimization_engine import CoreOptimizationEngine
from core.config_loader import load_config

def test_pipeline():
    print("Testing Core Optimization Engine Pipeline...")
    
    config = load_config()
    game_title = "007 First Light"
    
    hw_checker = HardwareChecker()
    specs = hw_checker.get_system_specs()
    hw_str = f"CPU: {specs['hardware']['cpu']}, GPU: {specs['hardware']['gpu']} ({specs['vram_gb']}GB VRAM), RAM: {specs['hardware']['ram']}"
    print(f"Hardware Detected: {hw_str}")
    
    preset_detector = GamePresetDetector(config)
    candidates = preset_detector._discover_config_files(game_title)
    print(f"Candidates Discovered: {candidates}")
    presets_str = preset_detector.detect_presets(game_title)
    print(f"Presets Detected: {presets_str}")
    
    engine = CoreOptimizationEngine(config)
    print("Calling LLM... (this may take a few seconds)")
    advice = engine.get_optimization_advice(hw_str, game_title, presets_str)
    
    print("\n--- LLM Output ---")
    print(advice)
    print("------------------")

if __name__ == "__main__":
    test_pipeline()
