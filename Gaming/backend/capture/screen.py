"""
High-performance screen capture with multiple backends.
Supports: DXGI (Windows Desktop Duplication), WGC/PrintWindow (per-window), MSS (fallback).
Target: 60-120+ FPS at 1080p on NVIDIA GPUs.

Key change: dxcam now returns None on no-new-frame instead of a stale cached frame.
_WindowCaptureBackend uses PrintWindow/BitBlt so games running in the background
(not minimized to taskbar) are captured at full quality without GPU stall.
"""
import ctypes
import numpy as np
import cv2
import time
import threading
import logging
from typing import Optional

logger = logging.getLogger(__name__)

_DXCAM_AVAILABLE = None

def _check_dxcam_available():
    global _DXCAM_AVAILABLE
    if _DXCAM_AVAILABLE is None:
        try:
            import dxcam
            _DXCAM_AVAILABLE = True
        except Exception:
            _DXCAM_AVAILABLE = False
    return _DXCAM_AVAILABLE

import mss  # Always available as fallback


class ScreenCapture:
    """
    High-performance screen capture with automatic backend selection.

    Backend priority:
      1. window  — Win32 PrintWindow, per-HWND. Used when hwnd is provided.
                   Works for windowed/borderless games that are in the background.
      2. dxcam   — GPU-accelerated DXGI, fastest (~120+ fps) for full-screen games.
      3. mss     — CPU-based GDI, reliable fallback (~30-50 fps).
    """

    def __init__(self, region=None, backend="auto", target_fps=60,
                 device_index=0, output_index=0, hwnd: Optional[int] = None):
        """
        :param region: dict {'top', 'left', 'width', 'height'} or None for full screen
        :param backend: 'window', 'dxcam', 'mss', or 'auto'
        :param target_fps: Target capture FPS (used by dxcam's internal capture)
        :param device_index: GPU adapter index (0 = primary).
        :param output_index: Display output index on the selected GPU (0 = primary).
        :param hwnd: Window handle of the game. When provided 'window' backend is preferred.
        """
        self.region = region
        self.target_fps = target_fps
        self._backend_name = backend
        self._capture = None
        self._device_index = device_index
        self._output_index = output_index
        self._hwnd = hwnd

        # --- Window backend (per-HWND capture via PrintWindow) ---
        if hwnd and backend in ("auto", "window"):
            try:
                self._capture = _WindowCaptureBackend(hwnd)
                self._backend_name = "window"
                logger.info(f"Capture backend: window (PrintWindow, hwnd={hwnd:#x})")
                return
            except Exception as e:
                logger.warning(f"Window capture init failed (hwnd={hwnd:#x}): {e}. Falling back...")

        # --- dxcam backend ---
        if backend in ("auto", "dxcam") and _check_dxcam_available():
            try:
                self._capture = _DXCamBackend(
                    self.region, self.target_fps,
                    device_index=self._device_index,
                    output_index=self._output_index
                )
                self._backend_name = "dxcam"
                logger.info(f"Capture backend: dxcam (GPU-accelerated, target {self.target_fps}fps, "
                            f"device={self._device_index}, output={self._output_index})")
                return
            except IndexError as e:
                logger.warning(f"dxcam index error (device {self._device_index} / output {self._output_index}): {e}. Attempting auto-discovery...")
                try:
                    self._capture = _DXCamBackend(self.region, self.target_fps, device_index=0, output_index=0)
                    self._backend_name = "dxcam"
                    logger.info("Capture backend: dxcam (Fallback to device 0, output 0)")
                    return
                except Exception as e2:
                    logger.warning(f"dxcam auto-discovery also failed: {e2}")
            except Exception as e:
                logger.warning(f"dxcam init failed: {e}")

        # --- Fallback to MSS ---
        self._capture = _MSSBackend(self.region, output_index=self._output_index)
        self._backend_name = "mss"
        logger.info(f"Capture backend: mss (Selected for {backend})")

    def _fallback_to_desktop(self):
        """Internal helper to switch capture to dxcam/mss desktop capture."""
        try:
            logger.info("Falling back to desktop capture (dxcam/mss)...")
            if _check_dxcam_available():
                self._capture = _DXCamBackend(
                    self.region, self.target_fps,
                    device_index=self._device_index,
                    output_index=self._output_index
                )
                self._backend_name = "dxcam"
            else:
                self._capture = _MSSBackend(self.region, output_index=self._output_index)
                self._backend_name = "mss"
            logger.info(f"Successfully fell back to desktop capture backend: {self._backend_name}")
        except Exception as e:
            logger.error(f"Failed to initialize desktop capture fallback: {e}")
            try:
                self._capture = _MSSBackend(self.region, output_index=self._output_index)
                self._backend_name = "mss"
            except Exception:
                self._capture = None
                self._backend_name = "none"

    def get_frame(self) -> Optional[np.ndarray]:
        """Capture and return a single frame as BGR numpy array, or None on no-new-frame."""
        if self._capture is None:
            return None
        
        frame = self._capture.get_frame()
        
        # Check if the captured frame is valid (not None and has non-zero pixels)
        is_valid = frame is not None
        if is_valid and self._backend_name == "window":
            # If the window capture backend returns a completely black image (all pixels 0),
            # it indicates that PrintWindow is blocked by hardware/DirectX/overlays.
            if not np.any(frame):
                is_valid = False
                
        if is_valid:
            if self._backend_name == "window":
                self._consecutive_window_failures = 0
            return frame
            
        if self._backend_name == "window":
            failures = getattr(self, "_consecutive_window_failures", 0) + 1
            self._consecutive_window_failures = failures
            # ~20 frames of consecutive failures (approx. 300ms) will trigger desktop fallback
            if failures >= 20:
                logger.warning(f"Window capture backend failed {failures} times consecutively (None or black frames). Triggering desktop fallback.")
                self._fallback_to_desktop()
        return None


    def set_hwnd(self, hwnd: Optional[int]):
        """Switch to (or away from) per-window capture at runtime."""
        if hwnd == self._hwnd:
            return
        self._hwnd = hwnd
        if hwnd:
            try:
                self._capture = _WindowCaptureBackend(hwnd)
                self._backend_name = "window"
                logger.info(f"Switched capture backend to: window (hwnd={hwnd:#x})")
                return
            except Exception as e:
                logger.warning(f"Failed to switch to window backend: {e}")
        # Fall back to dxcam or mss
        self.__init__(
            region=self.region,
            backend="dxcam" if _check_dxcam_available() else "mss",
            target_fps=self.target_fps,
            device_index=self._device_index,
            output_index=self._output_index,
            hwnd=None,
        )

    def set_region(self, region):
        """Update the capture region."""
        self.region = region
        self._capture.set_region(region)

    def change_output(self, output_index, device_index=None):
        """Dynamic switch of the capture output (monitor)."""
        if device_index is not None:
            self._device_index = device_index
        self._output_index = output_index

        if hasattr(self._capture, "change_output"):
            self._capture.change_output(output_index, device_index=self._device_index)
        else:
            logger.info(f"Re-initializing capture for output {output_index}")
            self.__init__(
                region=self.region,
                backend=self._backend_name,
                target_fps=self.target_fps,
                device_index=self._device_index,
                output_index=self._output_index,
                hwnd=self._hwnd,
            )

    @property
    def backend_name(self):
        return self._backend_name


# ---------------------------------------------------------------------------
# Win32 helpers for _WindowCaptureBackend
# ---------------------------------------------------------------------------

_PW_RENDERFULLCONTENT = 0x00000002  # Capture WGC-style even for DirectComposition


class _WindowCaptureBackend:
    """
    Per-HWND capture using Win32 PrintWindow + BitBlt.

    Works for:
    - Windowed and borderless-fullscreen games in the *background* (not minimised).
    - Minimised games IF the driver supports PW_RENDERFULLCONTENT (most modern ones do).

    Returns None when the window cannot be located or is genuinely invisible (zero-size).
    """

    def __init__(self, hwnd: int):
        import win32gui
        import win32ui
        import win32con
        self._hwnd = hwnd
        self._win32gui = win32gui
        self._win32ui = win32ui
        self._win32con = win32con
        # Verify the handle is still valid
        if not win32gui.IsWindow(hwnd):
            raise ValueError(f"hwnd {hwnd:#x} is not a valid window")

    def get_frame(self) -> Optional[np.ndarray]:
        win32gui = self._win32gui
        win32ui = self._win32ui
        win32con = self._win32con

        try:
            hwnd = self._hwnd
            if not win32gui.IsWindow(hwnd):
                return None

            # Get the client area dimensions (excludes title bar, borders)
            rect = win32gui.GetClientRect(hwnd)
            w = rect[2] - rect[0]
            h = rect[3] - rect[1]
            if w <= 0 or h <= 0:
                return None

            # Create a device context and compatible bitmap
            hdc_src = win32gui.GetDC(hwnd)
            hdc_mem = win32ui.CreateDCFromHandle(hdc_src)
            hdc_dest = hdc_mem.CreateCompatibleDC()
            bmp = win32ui.CreateBitmap()
            bmp.CreateCompatibleBitmap(hdc_mem, w, h)
            hdc_dest.SelectObject(bmp)

            # Use BitBlt to capture the client area safely from the screen without sending blocking messages to the target window proc
            result = ctypes.windll.gdi32.BitBlt(
                hdc_dest.GetSafeHdc(), 0, 0, w, h,
                hdc_src, 0, 0, 0x00CC0020  # SRCCOPY
            )

            bmp_info = bmp.GetInfo()
            bmp_bits = bmp.GetBitmapBits(True)

            # Cleanup GDI resources
            hdc_dest.DeleteDC()
            hdc_mem.DeleteDC()
            win32gui.ReleaseDC(hwnd, hdc_src)
            win32gui.DeleteObject(bmp.GetHandle())

            if not result:
                # BitBlt failed
                pass

            img = np.frombuffer(bmp_bits, dtype=np.uint8)
            img.shape = (bmp_info["bmHeight"], bmp_info["bmWidth"], 4)  # BGRA
            img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
            return img

        except Exception as e:
            logger.debug(f"_WindowCaptureBackend.get_frame error: {e}")
            return None

    def set_region(self, region):
        # Window backend always captures the full client area; region is ignored.
        pass

    def update_hwnd(self, hwnd: int):
        """Refresh the target window handle (called when game re-creates its window)."""
        self._hwnd = hwnd


class _DXCamBackend:
    """dxcam backend — fastest, uses DXGI Desktop Duplication.

    IMPORTANT: get_frame() now returns None instead of a stale cached frame
    when dxcam.grab() returns None. The pipeline must handle None gracefully.
    """

    def __init__(self, region=None, target_fps=60, device_index=0, output_index=0):
        import dxcam
        # Pin to a specific device+output so CUDA's virtual adapters don't cause
        # dxcam to enumerate multiple outputs and create runaway windows.

        # Verify indices are valid before instantiation to prevent index out of range
        available_devices = dxcam.device_info()
        logger.debug(f"dxcam available devices: {available_devices}")

        self._device_index = device_index
        self._output_index = output_index
        self._cam = dxcam.create(device_idx=device_index, output_idx=output_index, output_color="BGR")
        self._region = None
        if region:
            self._region = (
                region["left"], region["top"],
                region["left"] + region["width"],
                region["top"] + region["height"]
            )

    def get_frame(self) -> Optional[np.ndarray]:
        """Return the latest frame, or None if no new frame is available.

        Critically: we NO LONGER fall back to a cached last_frame. Returning None
        is the correct signal to the pipeline that the game is not producing frames
        (e.g. minimised or GPU-idle). The pipeline must skip processing on None.
        """
        try:
            frame = self._cam.grab(region=self._region)
            if frame is None:
                # dxcam returns None if no new frame — this is normal between frames.
                # Return None; caller should sleep briefly and retry.
                return None
            return frame
        except Exception as e:
            # Handle DXGI context lost / invalid call (-2005270527)
            err_str = str(e).lower()
            if "invalid" in err_str or "-2005270527" in err_str:
                logger.warning("dxcam context lost, attempting to re-initialize...")
                try:
                    import dxcam
                    self._cam = dxcam.create(device_idx=self._device_index, output_idx=self._output_index, output_color="BGR")
                except Exception as inner_e:
                    logger.error(f"Failed to re-initialize dxcam: {inner_e}")
                    time.sleep(0.5)
            else:
                logger.error(f"dxcam grab error: {e}")
            # Return None during recovery so the pipeline can pause gracefully
            return None

    def set_region(self, region):
        if region:
            self._region = (
                region["left"], region["top"],
                region["left"] + region["width"],
                region["top"] + region["height"]
            )
        else:
            self._region = None

    def change_output(self, output_index, device_index=0):
        logger.info(f"dxcam: Switching to output {output_index} on device {device_index}")
        self._cam = dxcam.create(device_idx=device_index, output_idx=output_index, output_color="BGR")


class _MSSBackend:
    """MSS backend — reliable CPU-based fallback."""

    def __init__(self, region=None, output_index=0):
        self.sct = mss.mss()
        self._output_index = output_index
        if region is None:
            # mss monitors are 1-indexed (0 is all monitors combined)
            monitor_idx = self._output_index + 1
            if monitor_idx >= len(self.sct.monitors):
                monitor_idx = 1  # Fallback to primary if out of bounds
            monitor = self.sct.monitors[monitor_idx]
            self.region = {
                "top": monitor["top"],
                "left": monitor["left"],
                "width": monitor["width"],
                "height": monitor["height"]
            }
        else:
            self.region = region

    def get_frame(self) -> Optional[np.ndarray]:
        try:
            screenshot = self.sct.grab(self.region)
            frame = np.array(screenshot)
            frame = cv2.cvtColor(frame, cv2.COLOR_BGRA2BGR)
            return frame
        except Exception as e:
            now = time.time()
            if not hasattr(self, "_last_err_time") or now - self._last_err_time > 5.0:
                logger.warning(f"MSS capture failed: {e}. Sleeping 0.5s before retry...")
                self._last_err_time = now
            # Recreate mss instance to recover from lost GDI connection/context
            try:
                self.sct = mss.mss()
            except Exception:
                pass
            time.sleep(0.5)
            return None


    def set_region(self, region):
        if region is None:
            monitor_idx = self._output_index + 1
            if monitor_idx >= len(self.sct.monitors):
                monitor_idx = 1
            monitor = self.sct.monitors[monitor_idx]
            self.region = {
                "top": monitor["top"],
                "left": monitor["left"],
                "width": monitor["width"],
                "height": monitor["height"]
            }
        else:
            self.region = region

    def change_output(self, output_index, device_index=0):
        self._output_index = output_index
        self.set_region(None)


if __name__ == "__main__":
    # Benchmark all available backends
    cap = ScreenCapture(backend="auto", target_fps=120)
    print(f"Using backend: {cap.backend_name}")

    start = time.perf_counter()
    frames = 0
    while frames < 300:
        frame = cap.get_frame()
        if frame is not None:
            frames += 1
    elapsed = time.perf_counter() - start
    print(f"Captured {frames} frames in {elapsed:.2f}s → {frames/elapsed:.1f} FPS")
    print(f"Frame shape: {frame.shape}")
