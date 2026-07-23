import logging
import os
import time
from pathlib import Path

logger = logging.getLogger(__name__)

# Models are stored under backend/models/ after the refactor.
_BACKEND_DIR = Path(__file__).parent.parent
_MODELS_DIR = _BACKEND_DIR / "models"


class LocalVisionAnalyzer:
    def __init__(self):
        self.model = None
        self.enabled = False
        self.is_rtx = False

    def initialize(self):
        try:
            from ultralytics import YOLO
            import torch
            
            # Resolve model path: prefer models/ dir, fall back to CWD for backwards compat
            model_path = _MODELS_DIR / "yolov8n.pt"
            if not model_path.exists():
                model_path = Path("yolov8n.pt")  # legacy fallback

            # Use yolov8n as a lightweight placeholder for fast inference
            logger.info("[Vision] Loading lightweight YOLOv8n model from: %s", model_path)
            self.model = YOLO(str(model_path))
            
            # Send to CUDA if available for zero-latency
            if torch.cuda.is_available():
                self.model.to('cuda')
                logger.info(f"[Vision] Model loaded on GPU: {torch.cuda.get_device_name(0)}")
                self.is_rtx = 'RTX' in torch.cuda.get_device_name(0)
            else:
                logger.warning("[Vision] CUDA not available, falling back to CPU.")
                self.is_rtx = False
                
            self.enabled = True
            return True
        except ImportError:
            logger.error("[Vision] Ultralytics or Torch not installed. Local Vision disabled.")
            return False
        except Exception as e:
            logger.error(f"[Vision] Failed to initialize model: {e}")
            return False

    def analyze_frame(self, image_source):
        """
        Analyzes a single frame and returns bounding boxes.
        image_source can be a numpy array, PIL Image, or file path.
        """
        if not self.enabled or not self.model:
            return {"error": "Vision analyzer not enabled"}
            
        try:
            start_time = time.time()
            
            # run inference with confidence threshold 0.3
            results = self.model.predict(source=image_source, conf=0.3, verbose=False)
            
            latency = (time.time() - start_time) * 1000
            
            boxes = []
            for r in results:
                # get bounding boxes in xyxy format
                for box in r.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    conf = box.conf[0].item()
                    cls = int(box.cls[0].item())
                    name = r.names[cls]
                    boxes.append({
                        "label": name,
                        "confidence": conf,
                        "box": [x1, y1, x2, y2]
                    })
                    
            logger.debug(f"[Vision] Detected {len(boxes)} objects in {latency:.1f}ms")
            
            return {
                "boxes": boxes,
                "latency_ms": latency,
                "rtx_accelerated": self.is_rtx
            }
        except Exception as e:
            logger.error(f"[Vision] Inference failed: {e}")
            return {"error": str(e)}
