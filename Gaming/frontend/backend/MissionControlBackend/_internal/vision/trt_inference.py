import os
import sys
import logging

# 1. Handle TensorRT DLLs FIRST before any other imports (like cv2 or numpy)
import glob

def find_tensorrt_path():
    """
    Dynamically locates the TensorRT installation directory.
    Priority: 1. TENSORRT_PATH env var, 2. Search common root directories.
    """
    # 1. Check environment variable first
    env_path = os.environ.get("TENSORRT_PATH")
    if env_path and os.path.exists(env_path):
        return env_path

    # 2. Search common installation roots
    search_locations = [
        "C:\\", 
        "C:\\Program Files", 
        os.environ.get("ProgramFiles", "C:\\Program Files"),
        "C:\\NVIDIA"
    ]
    
    found_paths = []
    for root in search_locations:
        if not os.path.exists(root):
            continue
        # Look for folders starting with "TensorRT"
        for folder in glob.glob(os.path.join(root, "TensorRT*")):
            if os.path.isdir(folder):
                found_paths.append(folder)
    
    if found_paths:
        # Sort descending to pick the latest version (e.g., 10.16 > 10.1)
        found_paths.sort(key=lambda x: os.path.basename(x), reverse=True)
        return found_paths[0]
    
    return None

# Handle TensorRT DLLs FIRST
if sys.platform == 'win32':
    trt_path = find_tensorrt_path()
    
    if trt_path:
        logging.info(f"Auto-detected TensorRT at: {trt_path}")
        # Check both 'lib' and 'bin' for DLLs
        for subfolder in ["lib", "bin"]:
            full_path = os.path.join(trt_path, subfolder)
            if os.path.exists(full_path):
                try:
                    os.add_dll_directory(full_path)
                    os.environ["PATH"] = full_path + os.pathsep + os.environ["PATH"]
                except Exception as e:
                    logging.warning(f"Could not add DLL directory {full_path}: {e}")
    else:
        logging.error("TensorRT installation not found. Please set TENSORRT_PATH environment variable.")

import cv2
import numpy as np
import time

logger = logging.getLogger(__name__)

class PureTRTDetector:
    """
    Pure TensorRT inference engine.
    Does NOT import torch or ultralytics. Runs purely on tensorrt and cuda-python.
    Results in ZERO PyTorch VRAM overhead (~1GB saved).
    """
    def __init__(self, engine_path, target_classes=None):
        self.engine_path = engine_path
        self.target_classes = target_classes
        self.logger = None
        self.runtime = None
        self.engine = None
        self.context = None
        
        self.inputs = []
        self.outputs = []
        self.bindings = []
        self.stream = None
        self.cudart = None
        
        self._load_engine()

    def _load_engine(self):
        try:
            import tensorrt as trt
            # Support for cuda-python 13.x structure
            try:
                from cuda.bindings import runtime as cudart
            except ImportError:
                from cuda import cudart
            self.cudart = cudart
        except ImportError as e:
            logger.error(f"PureTRTDetector initialization failed: {e}")
            logger.error("Make sure TensorRT is installed and TENSORRT_PATH is set if using the Zip-file version.")
            logger.error("Run: uv pip install cuda-python and ensure the TRT wheel is installed.")
            return

        # Setup TensorRT Logger and Runtime
        self.logger = trt.Logger(trt.Logger.WARNING)
        try:
            trt.init_libnvinfer_plugins(self.logger, namespace="")
        except Exception:
            logger.warning("Could not initialize TensorRT plugins. Some custom layers may not work.")
        
        self.runtime = trt.Runtime(self.logger)
        
        # Required for TensorRT 10.x to allow loading engines with host code (like YOLO)
        try:
            self.runtime.engine_host_code_allowed = True
        except AttributeError:
            pass # Older versions don't have this attribute
        
        # Deserialize Engine
        logger.info(f"Loading Pure TensorRT engine from: {self.engine_path}")
        with open(self.engine_path, "rb") as f:
            engine_data = f.read()
            self.engine = self.runtime.deserialize_cuda_engine(engine_data)
            
        if self.engine is None:
            logger.error("Failed to deserialize TensorRT engine.")
            logger.error("This usually means the engine was built with a different TensorRT version or architecture.")
            logger.error("Try rebuilding the engine with the --versionCompatible flag.")
            return

        self.context = self.engine.create_execution_context()
        
        # Allocate buffers for inputs and outputs
        for i in range(self.engine.num_io_tensors):
            name = self.engine.get_tensor_name(i)
            is_input = self.engine.get_tensor_mode(name) == trt.TensorIOMode.INPUT
            dtype = trt.nptype(self.engine.get_tensor_dtype(name))
            shape = self.engine.get_tensor_shape(name)
            
            # Resolve dynamic batch sizes to 1
            if shape[0] == -1:
                shape = (1,) + shape[1:]
                
            size = trt.volume(shape) * np.dtype(dtype).itemsize
            
            # Allocate device memory (VRAM)
            err, d_mem = self.cudart.cudaMalloc(size)
            if err != self.cudart.cudaError_t.cudaSuccess:
                raise RuntimeError(f"cudaMalloc failed with error code {err}")
                
            # Allocate host memory (RAM)
            h_mem = np.empty(shape, dtype=dtype)
            
            self.bindings.append(int(d_mem))
            
            if is_input:
                self.inputs.append({"host": h_mem, "device": d_mem, "shape": shape, "dtype": dtype, "name": name})
                self.context.set_input_shape(name, shape)
            else:
                self.outputs.append({"host": h_mem, "device": d_mem, "shape": shape, "dtype": dtype, "name": name})

        # Create CUDA stream
        err, self.stream = self.cudart.cudaStreamCreate()
        if err != self.cudart.cudaError_t.cudaSuccess:
            raise RuntimeError(f"cudaStreamCreate failed: {err}")
            
        logger.info("TensorRT engine loaded and memory allocated successfully! (0 MB PyTorch Overhead)")

    def detect(self, frame, conf_threshold=0.35, iou_threshold=0.45):
        if not self.engine:
            return [], {}
            
        # 1. PRE-PROCESSING
        pre_start = time.perf_counter()
        input_shape = self.inputs[0]["shape"] # Usually (1, 3, 640, 640)
        img_h, img_w = input_shape[2], input_shape[3]
        orig_h, orig_w = frame.shape[:2]
        
        # Convert BGR to RGB
        img = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        # Resize to network input size
        img = cv2.resize(img, (img_w, img_h))
        # Normalize (0-255 -> 0.0-1.0) and transpose to Channel-First (CHW)
        img = img.astype(np.float32) / 255.0
        img = np.transpose(img, (2, 0, 1))
        
        # Copy image to host memory buffer
        # self.inputs[0]["host"] has shape (1, 3, 640, 640)
        # img has shape (3, 640, 640)
        self.inputs[0]["host"][0] = img
        pre_end = time.perf_counter()
        
        # 2. EXECUTION
        inf_start = time.perf_counter()
        # Transfer input data to GPU
        self.cudart.cudaMemcpyAsync(
            self.inputs[0]["device"],
            self.inputs[0]["host"].ctypes.data,
            self.inputs[0]["host"].nbytes,
            self.cudart.cudaMemcpyKind.cudaMemcpyHostToDevice,
            self.stream
        )
        
        # Bind memory addresses to the context
        for i in range(len(self.bindings)):
            name = self.engine.get_tensor_name(i)
            self.context.set_tensor_address(name, self.bindings[i])
            
        # Run inference async
        self.context.execute_async_v3(stream_handle=self.stream)
        
        # Transfer results back to CPU
        for out in self.outputs:
            self.cudart.cudaMemcpyAsync(
                out["host"].ctypes.data,
                out["device"],
                out["host"].nbytes,
                self.cudart.cudaMemcpyKind.cudaMemcpyDeviceToHost,
                self.stream
            )
            
        # Wait for everything to finish
        self.cudart.cudaStreamSynchronize(self.stream)
        inf_end = time.perf_counter()
        
        # 3. POST-PROCESSING (YOLOv8 specific)
        post_start = time.perf_counter()
        # Output shape is typically (1, 84, 8400), where 84 = 4 bounding box coords + 80 class probabilities
        preds = self.outputs[0]["host"][0] # Shape: (84, 8400)
        preds = np.transpose(preds)        # Shape: (8400, 84)
        
        boxes = []
        scores = []
        class_ids = []
        
        x_factor = orig_w / img_w
        y_factor = orig_h / img_h

        # Extract bounding boxes and class scores
        for i in range(preds.shape[0]):
            row = preds[i]
            class_scores = row[4:]
            _, max_score, _, max_idx = cv2.minMaxLoc(class_scores)
            
            if max_score >= conf_threshold:
                cls_id = max_idx[1]
                if self.target_classes is None or cls_id in self.target_classes:
                    x, y, w, h = row[0], row[1], row[2], row[3]
                    
                    # YOLOv8 returns center x, center y, width, height
                    left = int((x - 0.5 * w) * x_factor)
                    top = int((y - 0.5 * h) * y_factor)
                    width = int(w * x_factor)
                    height = int(h * y_factor)
                    
                    boxes.append([left, top, width, height])
                    scores.append(float(max_score))
                    class_ids.append(cls_id)
                    
        # Apply Non-Maximum Suppression (NMS) via OpenCV (fast C++ implementation)
        indices = cv2.dnn.NMSBoxes(boxes, scores, conf_threshold, iou_threshold)
        
        detections = []
        if len(indices) > 0:
            for i in indices.flatten():
                box = boxes[i]
                left, top, width, height = box[0], box[1], box[2], box[3]
                cls_id = class_ids[i]
                
                # Try to use dict mapping or fallback to basic string
                if isinstance(self.target_classes, dict) and cls_id in self.target_classes:
                    label = self.target_classes[cls_id]
                else:
                    label = f"class_{cls_id}"
                
                detections.append({
                    "box": [left, top, left + width, top + height],
                    "conf": scores[i],
                    "class": cls_id,
                    "label": label
                })
        
        post_end = time.perf_counter()
        profiling = {
            "pre": (pre_end - pre_start) * 1000,
            "inference": (inf_end - inf_start) * 1000,
            "post": (post_end - post_start) * 1000
        }
                
        return detections, profiling

    def __del__(self):
        """Clean up GPU memory manually."""
        try:
            if hasattr(self, 'cudart') and self.cudart:
                for inp in self.inputs:
                    self.cudart.cudaFree(inp["device"])
                for out in self.outputs:
                    self.cudart.cudaFree(out["device"])
                if self.stream is not None:
                    self.cudart.cudaStreamDestroy(self.stream)
        except Exception:
            pass

def run_performance_test(engine_path):
    """
    High-performance test script.
    Uses DXCAM to capture the screen and PureTRTDetector to find targets.
    """
    try:
        import dxcam
    except Exception:
        print("❌ dxcam not found or failed to initialize. Please verify display connection/dxcam installation.")
        return

    # Initialize DXCAM (High-performance GPU capture)
    camera = dxcam.create(output_color="BGR")
    
    # Initialize Detector with a professional class map
    # 0 is usually 'person' in COCO, we map it to 'OPPONENT' for a gaming context
    class_map = {0: "OPPONENT", 1: "VEHICLE", 2: "CHARACTER"}
    detector = PureTRTDetector(engine_path, target_classes=class_map)
    
    print(f"\n--- AIGS TENSORRT DIAGNOSTICS ---")
    print(f"MODEL:    {os.path.basename(engine_path)}")
    print(f"CAPTURE:  DXGI Desktop Duplication")
    print(f"GPU:      RTX 5050 Series (Active)")
    print(f"STATUS:   Ready. Press CTRL+C to terminate.\n")
    
    try:
        while True:
            # 1. Capture the actual screen
            cap_start = time.perf_counter()
            frame = camera.grab()
            cap_end = time.perf_counter()
            
            if frame is None:
                continue 

            # 2. Run Inference with profiling
            detections, prof = detector.detect(frame)
            
            # 3. Calculate Total Pipeline Latency
            cap_lat = (cap_end - cap_start) * 1000
            total_lat = cap_lat + prof["pre"] + prof["inference"] + prof["post"]
            
            # 4. Premium Output
            if detections:
                for d in detections:
                    print(f"[{d['label']:<10}] Conf: {d['conf']:.2f} | Pipelined Latency: {total_lat:4.1f}ms [Cap: {cap_lat:3.1f} | Inf: {prof['inference']:3.1f} | Post: {prof['post']:3.1f}]")
            else:
                # print(f"SCANNING... {total_lat:4.1f}ms", end='\r')
                pass
                
    except KeyboardInterrupt:
        print("\n\nTest stopped by user.")
    finally:
        del camera

if __name__ == "__main__":
    # Point this to your generated .engine file
    engine_file = "models/yolov8n.engine"
    
    logging.basicConfig(level=logging.INFO)
    
    if os.path.exists(engine_file):
        run_performance_test(engine_file)
    else:
        print(f"❌ Engine file not found at: {engine_file}")
        print("Please run the trtexec conversion command provided in the guide first.")
        print(f"Usage: PureTRTDetector('{engine_file}')")
