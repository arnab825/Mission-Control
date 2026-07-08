import sys
from pathlib import Path

try:
    from ultralytics import YOLO
except ImportError:
    print("Please install ultralytics first: uv pip install ultralytics")
    sys.exit(1)

def export_model():
    # Get the directory of the script
    script_dir = Path(__file__).parent.absolute()
    model_name = "yolov8n.pt"
    model_path = script_dir / model_name
    
    if not model_path.exists():
        print(f"Error: Could not find {model_name} in {script_dir}")
        print("Please ensure the .pt file is in the same folder as this script.")
        return

    print(f"Exporting {model_path} to TensorRT (FP16)...")
    print("This may take 5-10 minutes. The GPU will be heavily utilized during this process.")
    
    # Load the PyTorch model
    model = YOLO(str(model_path))
    
    # Export to TensorRT with half-precision (FP16)
    # half=True reduces VRAM footprint by 50% and speeds up inference on RTX cards
    # imgsz=640 is the default, ensuring the engine is optimized for 640x640 inputs
    # workspace=4 allows up to 4GB of workspace RAM during compilation (does not affect inference)
    try:
        # The export will create yolov8n.engine in the same directory as the script
        model.export(
            format="engine",
            half=True,       # FP16 precision for RTX 20/30 series optimization
            device="0",      # Run export on primary GPU
            imgsz=640,       # Optimize for 640x640 inputs
            workspace=4      # Max RAM workspace for TensorRT builder
        )
        
        engine_path = script_dir / "yolov8n.engine"
        print(f"\nExport complete! The model '{engine_path}' has been created.")
        print("\nIMPORTANT: Ensure config/settings.yaml points to this new location:")
        print(f"  yolo_model: \"scripts/yolov8n.engine\"")
        
    except Exception as e:
        print(f"\nExport failed: {e}")
        print("Make sure you have the CUDA toolkit and TensorRT installed on your system.")

if __name__ == "__main__":
    export_model()
