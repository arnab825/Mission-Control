"""
OCR-based text detection for story/single-player games.
Extracts dialogue, quest objectives, item names, and UI text from game frames.
Uses EasyOCR for robust multi-language text detection when configured.

This module avoids importing heavy optional dependencies (`cv2`, `easyocr`)
at import time. Both OpenCV and EasyOCR are loaded lazily only when OCR is
requested, so the application can start without them when OCR is disabled.
"""
import numpy as np
import logging

logger = logging.getLogger(__name__)


class OCRReader:
    """
    Extracts text from game frames using OCR.
    Optimized for gaming UI: dialogues, quest markers, item names, subtitles.
    """

    def __init__(self, config=None):
        self.config = config or {}
        self.languages = self.config.get("languages", ["en"])
        self.backend = self.config.get("backend", "auto")
        self._reader = None
        # Track whether we've attempted to import/initialize EasyOCR
        self._easyocr_attempted = False
        import threading
        self._init_lock = threading.Lock()
        self._loading = False

        # ROI presets for common game UI areas (as fractions of frame size)
        self.roi_presets = {
            "subtitle": [0.1, 0.80, 0.9, 0.95],   # Bottom center — subtitles/dialogue
            "quest":    [0.65, 0.05, 0.98, 0.30],  # Top right — quest tracker
            "dialogue": [0.1, 0.65, 0.9, 0.85],    # Lower center — dialogue box
            "item":     [0.35, 0.40, 0.65, 0.60],  # Center — item pickup prompts
            "tooltip":  [0.6, 0.4, 0.95, 0.7],     # Right side — tooltips
        }
        # Allow config overrides
        custom_rois = self.config.get("rois", {})
        self.roi_presets.update(custom_rois)

        # Defer heavy backend initialization until first use
        self._init_backend()

    def _init_backend(self):
        """Detect preferred OCR backend but defer heavy initialization.

        If `backend` is `easyocr` or `auto` we will attempt to initialize
        EasyOCR lazily when a read is first requested. Otherwise OCR is
        disabled (`none`).
        """
        if self.backend in ("easyocr", "auto"):
            # Mark intention to use EasyOCR but don't import it now
            self.backend = "easyocr"
            logger.debug("OCR backend set to 'easyocr' (initialization deferred)")
            return

        # Explicitly disabled or unknown backend
        self.backend = "none"
        logger.debug("OCR backend set to 'none'")

    def _ensure_easyocr_reader(self):
        """Lazily import and initialize EasyOCR Reader when needed.

        Returns True if the Reader is ready, False otherwise (and switches
        backend to 'none').
        """
        if self._reader is not None:
            return True

        with self._init_lock:
            if self._reader is not None:
                return True

            # Avoid repeating failed import attempts
            if self._easyocr_attempted:
                return False
            self._easyocr_attempted = True

            try:
                import easyocr
            except Exception as e:
                logger.warning("EasyOCR import failed: %s", e)
                self.backend = "none"
                return False

            try:
                gpu_flag = self.config.get("gpu", True)
                try:
                    # Attempt to create the Reader with the configured GPU flag
                    reader = easyocr.Reader(self.languages, gpu=gpu_flag, verbose=False)
                except Exception as cuda_err:
                    if gpu_flag:
                        logger.warning(
                            "Failed to initialize EasyOCR Reader with GPU: %s. Retrying with CPU fallback...",
                            cuda_err
                        )
                        reader = easyocr.Reader(self.languages, gpu=False, verbose=False)
                    else:
                        raise cuda_err
                self.backend = "easyocr"
                self._reader = reader  # Assign it last once fully constructed
                logger.info("OCR backend: EasyOCR initialized (lazy)")
                return True
            except Exception as e:
                logger.error(f"Failed to initialize EasyOCR Reader: {e}")
                self.backend = "none"
                return False

    def _ensure_easyocr_reader_async(self):
        """Start EasyOCR Reader initialization in a background thread if not already loaded or loading."""
        if self._reader is not None:
            return
            
        with self._init_lock:
            if self._reader is not None or self._loading:
                return
            self._loading = True
            
        import threading
        def bg_load():
            try:
                self._ensure_easyocr_reader()
            except Exception as e:
                logger.error(f"Background EasyOCR model loading failed: {e}")
            finally:
                self._loading = False
                
        thread = threading.Thread(target=bg_load, name="OCRBgLoader", daemon=True)
        thread.start()

    def unload_model(self):
        """Unload the EasyOCR Reader from RAM/VRAM and clean up PyTorch/CUDA resources."""
        if self._reader is None:
            return

        logger.info("Unloading EasyOCR Reader model...")
        self._reader = None
        self._easyocr_attempted = False

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
                logger.debug(f"Error clearing CUDA cache from OCR reader: {e}")

        # Win32 Memory flush
        if sys.platform == "win32":
            try:
                import ctypes
                import psutil
                process = psutil.Process()
                ctypes.windll.psapi.EmptyWorkingSet(process.pid)
                logger.info(f"RAM Reclaimed: Triggered EmptyWorkingSet for PID {process.pid} after unloading OCR")
            except Exception as e:
                pass

        logger.info("EasyOCR Reader model unloaded successfully.")

    def read_region(self, frame, roi_name=None, roi_coords=None, preprocess=True):
        """
        Extract text from a specific region of the frame.

        :param frame: Full game frame (BGR numpy array)
        :param roi_name: Name of a preset ROI (e.g., "subtitle", "quest")
        :param roi_coords: Custom ROI as [x_start, y_start, x_end, y_end] fractions
        :param preprocess: Whether to preprocess the ROI for better OCR accuracy
        :returns: list of dicts with 'text', 'confidence', 'bbox'
        """
        if self.backend == "none":
            return []

        # If EasyOCR is the chosen backend, ensure the Reader is initialized lazily
        if self.backend == "easyocr":
            if self._reader is None:
                self._ensure_easyocr_reader_async()
                return []

        # Determine ROI
        if roi_coords is not None:
            roi = roi_coords
        elif roi_name and roi_name in self.roi_presets:
            roi = self.roi_presets[roi_name]
        else:
            roi = [0, 0, 1, 1]  # Full frame

        # Crop to ROI
        h, w = frame.shape[:2]
        x1, y1 = int(roi[0] * w), int(roi[1] * h)
        x2, y2 = int(roi[2] * w), int(roi[3] * h)
        
        # Ensure bounds are within image
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        
        cropped = frame[y1:y2, x1:x2]

        if cropped.size == 0 or cropped.shape[0] < 5 or cropped.shape[1] < 5:
            return []

        # Preprocess for better OCR on game text
        if preprocess:
            cropped = self._preprocess(cropped)

        # Run OCR
        if self.backend == "easyocr":
            return self._read_easyocr(cropped, x1, y1)

        return []

    def read_all_regions(self, frame, region_names=None):
        """
        Read text from multiple ROI regions at once.

        :param frame: Full game frame
        :param region_names: List of ROI names to scan (or None for all presets)
        :returns: dict mapping region_name → list of text results
        """
        results = {}
        
        # 1. Read preset regions
        active_presets = region_names if region_names is not None else list(self.roi_presets.keys())
        for name in active_presets:
            results[name] = self.read_region(frame, roi_name=name)

        # 2. Dynamic Region Detection (find text outside presets)
        if self.config.get("dynamic_mode", False):
            dynamic_rois = self.find_dynamic_regions(frame)
            if dynamic_rois:
                # Deduplicate against presets (rough check)
                unique_dynamics = []
                for dr in dynamic_rois:
                    is_preset = False
                    for pr in self.roi_presets.values():
                        # Simple overlap check: if center is inside preset, skip
                        cx, cy = (dr[0] + dr[2]) / 2, (dr[1] + dr[3]) / 2
                        if pr[0] <= cx <= pr[2] and pr[1] <= cy <= pr[3]:
                            is_preset = True
                            break
                    if not is_preset:
                        unique_dynamics.append(dr)
                
                # Scan dynamic regions (limit to top 5 to preserve FPS)
                for i, droi in enumerate(unique_dynamics[:5]):
                    res = self.read_region(frame, roi_coords=droi)
                    if res:
                        results[f"dynamic_{i}"] = res

        return results

    def find_dynamic_regions(self, frame, max_regions=10):
        """
        Detect potential text regions using image processing (MSER-lite).
        Groups high-contrast edge clusters that look like text blocks.
        """
        try:
            import cv2
        except ImportError:
            return []

        h, w = frame.shape[:2]
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Use Morpological gradient to find text-like edges
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 2))
        grad = cv2.morphologyEx(gray, cv2.MORPH_GRADIENT, kernel)
        _, thresh = cv2.threshold(grad, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
        
        # Connect characters into words/lines
        close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 3))
        connected = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, close_kernel)
        
        contours, _ = cv2.findContours(connected, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        rois = []
        for cnt in contours:
            x, y, rw, rh = cv2.boundingRect(cnt)
            
            # Filter by size and aspect ratio typical for game text overlays
            aspect = rw / float(rh) if rh > 0 else 0
            if rw > 40 and rh > 10 and aspect > 1.2:
                # Convert to fractions
                roi = [x / w, y / h, (x + rw) / w, (y + rh) / h]
                rois.append(roi)
        
        # Sort by area (descending)
        rois.sort(key=lambda r: (r[2]-r[0]) * (r[3]-r[1]), reverse=True)
        return rois[:max_regions]

    def detect_dialogue(self, frame):
        """
        Specifically detect dialogue/subtitle text.
        Returns the combined text string and confidence.
        """
        results = []
        for region in ["subtitle", "dialogue"]:
            texts = self.read_region(frame, roi_name=region)
            results.extend(texts)

        if not results:
            return "", 0.0

        combined = " ".join(r["text"] for r in results if r["confidence"] > 0.3)
        avg_conf = np.mean([r["confidence"] for r in results]) if results else 0.0
        return combined.strip(), float(avg_conf)

    def detect_quest_text(self, frame):
        """
        Detect quest/objective text from the quest tracker area.
        """
        results = self.read_region(frame, roi_name="quest")
        texts = [r["text"] for r in results if r["confidence"] > 0.4]
        return texts

    def _preprocess(self, img):
        """
        Preprocess image for better OCR accuracy on game UIs.
        Enhanced to handle dynamic overlays with varying backgrounds.
        """
        try:
            import cv2
        except Exception:
            return img

        # 1. Grayscale & Contrast
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Contrast Stretching (min-max normalization)
        p2, p98 = np.percentile(gray, (2, 98))
        gray = np.clip((gray - p2) * 255.0 / (p98 - p2), 0, 255).astype(np.uint8)

        # 2. Noise reduction
        gray = cv2.GaussianBlur(gray, (3, 3), 0)

        # 3. Dynamic Thresholding
        # Game overlays often have shadows; Gaussian thresholding handles this best
        binary = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV, 11, 2
        )
        
        # Check if we should invert (if text is darker than background)
        # In games, overlays are 90% bright text on dark. 
        # We assume binary should have white text on black background for EasyOCR.
        if np.mean(binary) > 127:
            binary = cv2.bitwise_not(binary)

        # 4. Clean up
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 1))
        binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)

        return binary

    def _read_easyocr(self, img, offset_x=0, offset_y=0):
        """Run EasyOCR on preprocessed image."""
        if self._reader is None:
            logger.debug("EasyOCR Reader not initialized in _read_easyocr")
            return []

        try:
            # Use workers=0 to avoid spawning background processes on Windows
            raw = self._reader.readtext(img, detail=1, workers=0)
        except Exception as e:
            logger.error("EasyOCR read failed: %s", e)
            return []

        results = []
        for (bbox, text, conf) in raw:
            if len(text.strip()) < 2:  # Skip single characters / noise
                continue
            # bbox is list of 4 points; take top-left and bottom-right
            tl = bbox[0]
            br = bbox[2]
            results.append({
                "text": text.strip(),
                "confidence": conf,
                "bbox": [
                    int(tl[0]) + offset_x, int(tl[1]) + offset_y,
                    int(br[0]) + offset_x, int(br[1]) + offset_y
                ]
            })
        return results


if __name__ == "__main__":
    # Quick test — only runs when executed directly. This test tolerates
    # missing optional deps and will skip drawing if OpenCV isn't present.
    reader = OCRReader()
    dummy = np.zeros((1080, 1920, 3), dtype=np.uint8)

    try:
        import cv2
        cv2.putText(dummy, "Quest: Find the Lost Sword", (1300, 100),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        cv2.putText(dummy, "Press E to interact", (700, 900),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
    except Exception:
        # No cv2 — test image stays blank
        pass

    results = reader.read_all_regions(dummy)
    for region, texts in results.items():
        if texts:
            print(f"[{region}]: {[t['text'] for t in texts]}")
    print(f"Backend: {reader.backend}")
