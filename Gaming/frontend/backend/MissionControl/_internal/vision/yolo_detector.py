"""
YOLO object detection backend.
Lazily imports ultralytics and OpenCV to avoid forcing them at module load time.
"""
import logging
import os

logger = logging.getLogger(__name__)


class YOLODetector:
    def __init__(self, model_path="yolov8n.pt", target_classes=None):
        """
        Initializes the YOLO detector.
        Lazily imports and downloads the model on first instantiation.
        """
        # Set default empty dict for target classes and names if none provided
        target_classes = target_classes if target_classes is not None else None
        self.model_path = model_path
        self.model = None
        self.target_classes = target_classes  # Detect everything by default
        self.class_names = {}
        # Defer heavy YOLO initialization until first detect() call
        self._initialized = False
        import threading
        self._init_lock = threading.Lock()
        self._loading = False

    def _ensure_model(self):
        """Lazy-load YOLO model or TensorRT Engine on first use."""
        if self._initialized:
            return
            
        with self._init_lock:
            if self._initialized:
                return
            
            # ── DYNAMIC DISPATCHER ──
            # Check if we are running in pure TensorRT mode
            if str(self.model_path).endswith('.engine'):
                try:
                    from vision.trt_inference import PureTRTDetector
                    self.model = PureTRTDetector(self.model_path, target_classes=self.target_classes)
                    self.is_pure_trt = True
                    logger.info(f"Loaded PureTRTDetector dispatcher for {self.model_path}")
                    self._initialized = True
                    return
                except Exception as e:
                    logger.error(f"Failed to load PureTRTDetector. Make sure tensorrt is installed: {e}")
                    logger.warning("Falling back to Ultralytics engine loader (which imports PyTorch).")
                    self.is_pure_trt = False
            else:
                self.is_pure_trt = False

            # Fallback to PyTorch/Ultralytics (Heavy VRAM usage)
            try:
                from ultralytics import YOLO
            except Exception as e:
                logger.error("Failed to import ultralytics: %s", e)
                return

            try:
                self.model = YOLO(self.model_path)
                self.class_names = self.model.names if hasattr(self.model, 'names') else {}
                logger.info("YOLO PyTorch model loaded: %s", self.model_path)
                self._initialized = True
            except Exception as e:
                logger.error("Failed to load YOLO model: %s", e)

    def _ensure_model_async(self):
        """Start model loading in a background thread if not already loaded or loading."""
        if self._initialized:
            return
            
        with self._init_lock:
            if self._initialized or self._loading:
                return
            self._loading = True
            
        import threading
        def bg_load():
            try:
                self._ensure_model()
            except Exception as e:
                logger.error(f"Background YOLO model loading failed: {e}")
            finally:
                self._loading = False
                
        thread = threading.Thread(target=bg_load, name="YOLOBgLoader", daemon=True)
        thread.start()

    def unload_model(self):
        """Unload the YOLO model from RAM/VRAM and clean up PyTorch/CUDA resources."""
        if not self._initialized:
            return

        logger.info("Unloading YOLO detector model...")
        if self.model:
            if getattr(self, 'is_pure_trt', False):
                try:
                    if hasattr(self.model, '__del__'):
                        self.model.__del__()
                except Exception as e:
                    logger.error(f"Error during PureTRTDetector cleanup: {e}")
            self.model = None

        self._initialized = False

        # Aggressive garbage collection
        import gc
        gc.collect()

        # Clear PyTorch CUDA Cache if loaded
        import sys
        if 'torch' in sys.modules:
            try:
                import torch
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                    torch.cuda.ipc_collect()
            except Exception as e:
                logger.debug(f"Error clearing CUDA cache: {e}")

        # Win32 Memory flush
        if sys.platform == "win32":
            try:
                import ctypes
                import psutil
                process = psutil.Process()
                ctypes.windll.psapi.EmptyWorkingSet(process.pid)
                logger.info(f"RAM Reclaimed: Triggered EmptyWorkingSet for PID {process.pid} after unloading YOLO")
            except Exception as e:
                pass

        logger.info("YOLO detector model unloaded successfully.")

    def detect(self, frame):
        """
        Runs inference on the frame.
        Returns (detections, profiling).
        detections: [{'box': [x1, y1, x2, y2], 'conf': 0.5, 'class': 0}]
        profiling: {'pre': ms, 'inference': ms, 'post': ms}
        """
        if not self._initialized:
            self._ensure_model_async()
            return [], {"pre": 0, "inference": 0, "post": 0}
            
        if self.model is None:
            return [], {"pre": 0, "inference": 0, "post": 0}

        # ── Pure TensorRT Path ──
        if getattr(self, 'is_pure_trt', False):
            return self.model.detect(frame)

        # ── PyTorch / Ultralytics Execution Path ──
        try:
            results = self.model(frame, verbose=False, device='0', workers=0, half=True)
        except Exception as e:
            logger.error("YOLO GPU inference failed, falling back to CPU: %s", e)
            try:
                results = self.model(frame, verbose=False, device='cpu', workers=0)
            except Exception:
                return [], {"pre": 0, "inference": 0, "post": 0}
        
        detections = []
        profiling = {
            "pre": 0, 
            "inference": 0, 
            "post": 0,
            "model_type": "TensorRT" if getattr(self, 'is_pure_trt', False) else "PyTorch",
            "model_name": os.path.basename(self.model_path)
        }
        
        if results:
            for result in results:
                if hasattr(result, 'speed'):
                    profiling["pre"] = result.speed.get("preprocess", 0)
                    profiling["inference"] = result.speed.get("inference", 0)
                    profiling["post"] = result.speed.get("postprocess", 0)
                
                boxes = result.boxes
                for box in boxes:
                    cls = int(box.cls[0])
                    if self.target_classes is None or cls in self.target_classes:
                        coords = box.xyxy[0].tolist()
                        conf = float(box.conf[0])
                        label = "unknown"
                        try:
                            label = self.model.names[cls]
                        except Exception:
                            pass
                        detections.append({
                            "box": [int(c) for c in coords],
                            "conf": conf,
                            "class": cls,
                            "label": label
                        })
        
        return detections, profiling
