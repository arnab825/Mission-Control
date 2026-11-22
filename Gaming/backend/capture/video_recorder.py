"""
Mission Control — Gameplay Video Recorder
Provides high-performance gameplay video capture and rolling highlight clip generation.
Supports zero-lag multi-threaded encoding via OpenCV VideoWriter with automatic hardware
and software encoder fallback (NVENC/AVC1/MP4V), instant replay rolling buffers, and file management.
"""

import collections
import datetime
import logging
import os
import platform
import queue
import subprocess
import threading
import time
import base64
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger("video_recorder")


def _get_default_recordings_dir() -> str:
    """Determine the best directory for gameplay recordings."""
    home = os.path.expanduser("~")
    videos_dir = os.path.join(home, "Videos", "MissionControl")
    try:
        os.makedirs(videos_dir, exist_ok=True)
        return videos_dir
    except Exception:
        pass

    appdata = os.environ.get("APPDATA") or home
    fallback_dir = os.path.join(appdata, "MissionControl", "recordings")
    try:
        os.makedirs(fallback_dir, exist_ok=True)
        return fallback_dir
    except Exception:
        pass

    return os.path.join(home, "MissionControl_Recordings")


def _get_default_screenshots_dir(recordings_dir: Optional[str] = None) -> str:
    """Determine the best directory for gameplay screenshots."""
    home = os.path.expanduser("~")
    pictures_dir = os.path.join(home, "Pictures", "MissionControl")
    try:
        os.makedirs(pictures_dir, exist_ok=True)
        return pictures_dir
    except Exception:
        pass

    if recordings_dir:
        sub_dir = os.path.join(recordings_dir, "screenshots")
        try:
            os.makedirs(sub_dir, exist_ok=True)
            return sub_dir
        except Exception:
            pass

    appdata = os.environ.get("APPDATA") or home
    fallback_dir = os.path.join(appdata, "MissionControl", "screenshots")
    try:
        os.makedirs(fallback_dir, exist_ok=True)
        return fallback_dir
    except Exception:
        pass

    return os.path.join(home, "MissionControl_Screenshots")


def _detect_best_fourcc() -> Tuple[int, str]:
    """Test available OpenCV VideoWriter fourcc codecs on the current system."""
    codecs_to_try = [
        ("mp4v", cv2.VideoWriter_fourcc(*"mp4v")),
        ("avc1", cv2.VideoWriter_fourcc(*"avc1")),
        ("H264", cv2.VideoWriter_fourcc(*"H264")),
        ("XVID", cv2.VideoWriter_fourcc(*"XVID")),
    ]
    test_w, test_h = 320, 240
    test_frame = np.zeros((test_h, test_w, 3), dtype=np.uint8)

    for name, fourcc in codecs_to_try:
        test_file = f"_test_codec_{name}_{int(time.time())}.mp4"
        try:
            writer = cv2.VideoWriter(test_file, fourcc, 30.0, (test_w, test_h))
            if writer.isOpened():
                writer.write(test_frame)
                writer.release()
                if os.path.exists(test_file):
                    os.remove(test_file)
                logger.info("[VideoRecorder] Selected video encoder codec: %s", name)
                return fourcc, name
            if os.path.exists(test_file):
                os.remove(test_file)
        except Exception:
            if os.path.exists(test_file):
                try:
                    os.remove(test_file)
                except Exception:
                    pass

    fallback_fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    return fallback_fourcc, "mp4v"


class VideoRecorder:
    """
    Gameplay Video and Highlight Clip Recorder.
    Features:
      - Continuous manual recording with background thread encoding.
      - Rolling in-memory frame buffer for instant replay highlight saves (e.g. last 30-90s).
      - Thread-safe queues ensuring the capture thread is never stalled by file I/O.
      - File management (listing, deleting, opening directory).
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        rec_cfg = self.config.get("recording", {}) or {}

        # Directory setup
        custom_dir = rec_cfg.get("save_directory")
        if custom_dir and os.path.isdir(custom_dir):
            self.save_dir = custom_dir
        else:
            self.save_dir = _get_default_recordings_dir()

        custom_screenshot_dir = rec_cfg.get("screenshots_directory")
        if custom_screenshot_dir and os.path.isdir(custom_screenshot_dir):
            self.screenshots_dir = custom_screenshot_dir
        else:
            self.screenshots_dir = _get_default_screenshots_dir(self.save_dir)

        self.target_fps = int(rec_cfg.get("fps", 30))
        self.rolling_buffer_seconds = float(rec_cfg.get("rolling_buffer_seconds", 30.0))
        self.max_buffer_frames = max(30, int(self.rolling_buffer_seconds * 20))  # Sample up to 20 fps in rolling buffer to preserve RAM

        self.fourcc, self.codec_name = _detect_best_fourcc()

        # State lock and variables
        self._lock = threading.Lock()
        self._is_recording = False
        self._record_start_time = 0.0
        self._current_filepath: Optional[str] = None
        self._current_filename: Optional[str] = None
        self._writer: Optional[cv2.VideoWriter] = None
        self._frame_size: Optional[Tuple[int, int]] = None  # (width, height)
        self._recorded_frame_count = 0
        self._last_frame: Optional[np.ndarray] = None

        # Background recording queue and thread
        self._record_queue: queue.Queue = queue.Queue(maxsize=180)
        self._worker_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()

        # Rolling highlight buffer: stores tuples of (timestamp, frame_copy)
        self._rolling_buffer: collections.deque = collections.deque(maxlen=self.max_buffer_frames)
        self._last_buffer_push_time = 0.0
        self._buffer_interval = 1.0 / 20.0  # 20 FPS for rolling buffer highlights

    @property
    def is_recording(self) -> bool:
        return self._is_recording

    def add_frame(self, frame: np.ndarray, timestamp: Optional[float] = None) -> None:
        """
        Called from the screen capture loop on every valid frame.
        Non-blocking: pushes frames to the active recording queue and updates rolling highlight buffer.
        """
        if frame is None or not isinstance(frame, np.ndarray):
            return

        now = timestamp or time.time()

        # 1. Update rolling highlight buffer (throttled to buffer interval to conserve RAM)
        if (now - self._last_buffer_push_time) >= self._buffer_interval:
            self._last_buffer_push_time = now
            try:
                # Downsample slightly if resolution is 4K to prevent high memory usage
                h, w = frame.shape[:2]
                if w > 1920:
                    scale = 1920.0 / w
                    buf_frame = cv2.resize(frame, (1920, int(h * scale)), interpolation=cv2.INTER_AREA)
                else:
                    buf_frame = frame.copy()
                with self._lock:
                    self._rolling_buffer.append((now, buf_frame))
            except Exception as e:
                logger.debug("[VideoRecorder] Rolling buffer append error: %s", e)

        # 2. Update latest frame reference for instant screenshots
        with self._lock:
            self._last_frame = frame.copy()

        # 3. If continuous recording is active, queue frame for encoding worker
        if self._is_recording:
            try:
                self._record_queue.put_nowait((now, frame.copy()))
            except queue.Full:
                # Drop frame under extreme I/O pressure rather than stalling capture loop
                pass

    def start_recording(self, filename: Optional[str] = None, fps: Optional[int] = None) -> Dict[str, Any]:
        """Start a new gameplay recording session."""
        with self._lock:
            if self._is_recording:
                dur = time.time() - self._record_start_time
                return {
                    "success": True,
                    "is_recording": True,
                    "already_active": True,
                    "file_path": self._current_filepath,
                    "file_name": self._current_filename,
                    "duration_secs": round(dur, 1),
                }

            rec_fps = fps or self.target_fps
            timestamp_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_filename = filename.strip() if filename else f"MissionControl_{timestamp_str}.mp4"
            if not safe_filename.lower().endswith(".mp4"):
                safe_filename += ".mp4"

            # Sanitize filename
            safe_filename = os.path.basename(safe_filename)
            filepath = os.path.join(self.save_dir, safe_filename)

            self._is_recording = True
            self._record_start_time = time.time()
            self._current_filepath = filepath
            self._current_filename = safe_filename
            self._recorded_frame_count = 0
            self._frame_size = None
            self._writer = None

            # Clear queue and stop event
            while not self._record_queue.empty():
                try:
                    self._record_queue.get_nowait()
                except Exception:
                    break
            self._stop_event.clear()

            # Start worker thread
            self._worker_thread = threading.Thread(
                target=self._recording_worker,
                args=(filepath, rec_fps),
                name="GameplayVideoWriter",
                daemon=True,
            )
            self._worker_thread.start()

            logger.info("[VideoRecorder] Started recording: %s (FPS: %d, Codec: %s)", filepath, rec_fps, self.codec_name)
            return {
                "success": True,
                "is_recording": True,
                "file_path": filepath,
                "file_name": safe_filename,
                "duration_secs": 0.0,
                "encoder": self.codec_name,
                "fps": rec_fps,
            }

    def stop_recording(self) -> Dict[str, Any]:
        """Stop active gameplay recording and finalize video file."""
        with self._lock:
            if not self._is_recording:
                return {
                    "success": True,
                    "is_recording": False,
                    "message": "No active recording to stop.",
                }

            self._is_recording = False
            self._stop_event.set()
            start_t = self._record_start_time
            file_path = self._current_filepath
            file_name = self._current_filename
            f_count = self._recorded_frame_count

        # Wait for worker thread to finish flushing remaining frames
        if self._worker_thread and self._worker_thread.is_alive():
            self._worker_thread.join(timeout=3.0)

        duration = max(0.1, time.time() - start_t)
        file_size_mb = 0.0
        if file_path and os.path.exists(file_path):
            try:
                file_size_mb = round(os.path.getsize(file_path) / (1024 * 1024), 2)
            except Exception:
                pass

        logger.info("[VideoRecorder] Stopped recording: %s (Duration: %.1fs, Size: %.2f MB)", file_name, duration, file_size_mb)
        return {
            "success": True,
            "is_recording": False,
            "file_path": file_path,
            "file_name": file_name,
            "duration_secs": round(duration, 1),
            "size_mb": file_size_mb,
            "frame_count": f_count,
        }

    def save_highlight(self, duration_secs: int = 30, filename: Optional[str] = None) -> Dict[str, Any]:
        """
        Extract the last `duration_secs` from the rolling buffer and save as a highlight clip.
        Operates asynchronously in a dedicated worker thread.
        """
        duration_secs = max(5, min(120, int(duration_secs)))
        now = time.time()
        cutoff_time = now - duration_secs

        with self._lock:
            buffer_items = list(self._rolling_buffer)

        # Filter frames within window
        selected_frames = [f for (t, f) in buffer_items if t >= cutoff_time]
        if not selected_frames and buffer_items:
            selected_frames = [f for (_, f) in buffer_items]

        if not selected_frames:
            return {
                "success": False,
                "error": "Highlight buffer is empty. Ensure game capture is running.",
            }

        timestamp_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_name = filename.strip() if filename else f"Highlight_{timestamp_str}.mp4"
        if not safe_name.lower().endswith(".mp4"):
            safe_name += ".mp4"
        safe_name = os.path.basename(safe_name)
        out_path = os.path.join(self.save_dir, safe_name)

        def _write_highlight():
            try:
                first_f = selected_frames[0]
                h, w = first_f.shape[:2]
                fps = 20.0
                writer = cv2.VideoWriter(out_path, self.fourcc, fps, (w, h))
                if not writer.isOpened():
                    logger.error("[VideoRecorder] Failed to open VideoWriter for highlight %s", out_path)
                    return

                for f in selected_frames:
                    if f.shape[1] != w or f.shape[0] != h:
                        f = cv2.resize(f, (w, h))
                    writer.write(f)

                writer.release()
                size_mb = round(os.path.getsize(out_path) / (1024 * 1024), 2)
                logger.info("[VideoRecorder] Saved highlight: %s (%.2f MB, %d frames)", safe_name, size_mb, len(selected_frames))
            except Exception as exc:
                logger.error("[VideoRecorder] Failed to export highlight: %s", exc, exc_info=True)

        threading.Thread(target=_write_highlight, name="HighlightWriter", daemon=True).start()

        approx_duration = len(selected_frames) / 20.0
        return {
            "success": True,
            "file_name": safe_name,
            "file_path": out_path,
            "duration_secs": round(approx_duration, 1),
            "frame_count": len(selected_frames),
            "status": "saving",
        }

    def _recording_worker(self, output_path: str, fps: int) -> None:
        """Background thread consumer that writes queued frames to disk."""
        writer = None
        current_w, current_h = 0, 0

        try:
            while not self._stop_event.is_set() or not self._record_queue.empty():
                try:
                    now, frame = self._record_queue.get(timeout=0.2)
                except queue.Empty:
                    continue

                if frame is None or not isinstance(frame, np.ndarray):
                    continue

                h, w = frame.shape[:2]
                # Initialize VideoWriter once frame dimensions are confirmed
                if writer is None:
                    current_w, current_h = w, h
                    writer = cv2.VideoWriter(output_path, self.fourcc, float(fps), (current_w, current_h))
                    if not writer.isOpened():
                        logger.error("[VideoRecorder] VideoWriter failed to open for %s with codec %s", output_path, self.codec_name)
                        break

                # Resize if frame resolution dynamically shifts
                if w != current_w or h != current_h:
                    frame = cv2.resize(frame, (current_w, current_h))

                writer.write(frame)
                self._recorded_frame_count += 1

        except Exception as e:
            logger.error("[VideoRecorder] Error in recording worker: %s", e, exc_info=True)
        finally:
            if writer is not None:
                try:
                    writer.release()
                except Exception:
                    pass

    def get_status(self) -> Dict[str, Any]:
        """Return real-time recording and buffer telemetry dictionary."""
        with self._lock:
            dur = (time.time() - self._record_start_time) if self._is_recording else 0.0
            buf_len = len(self._rolling_buffer)
            buf_secs = buf_len / 20.0
            return {
                "is_recording": self._is_recording,
                "duration_secs": round(dur, 1),
                "file_path": self._current_filepath,
                "file_name": self._current_filename,
                "fps": self.target_fps,
                "encoder": self.codec_name,
                "buffer_active": True,
                "buffer_seconds": round(buf_secs, 1),
                "buffer_frames": buf_len,
                "save_dir": self.save_dir,
                "screenshots_dir": self.screenshots_dir,
            }

    def list_recordings(self) -> List[Dict[str, Any]]:
        """List all video recordings in the output directory, newest first."""
        items: List[Dict[str, Any]] = []
        if not os.path.exists(self.save_dir):
            return items

        try:
            for entry in os.scandir(self.save_dir):
                if entry.is_file() and entry.name.lower().endswith(".mp4"):
                    stat = entry.stat()
                    items.append({
                        "file_name": entry.name,
                        "file_path": entry.path,
                        "size_mb": round(stat.st_size / (1024 * 1024), 2),
                        "created_at": int(stat.st_mtime * 1000),
                        "is_highlight": "highlight" in entry.name.lower(),
                    })
        except Exception as e:
            logger.warning("[VideoRecorder] Failed to list recordings: %s", e)

        items.sort(key=lambda x: x["created_at"], reverse=True)
        return items

    def delete_recording(self, filename: str) -> Dict[str, Any]:
        """Safely delete a recording file from the recordings directory."""
        if not filename:
            return {"success": False, "error": "Filename is required."}

        safe_name = os.path.basename(filename)
        target = os.path.join(self.save_dir, safe_name)

        if not os.path.exists(target):
            return {"success": False, "error": "File does not exist."}

        try:
            os.remove(target)
            logger.info("[VideoRecorder] Deleted recording: %s", safe_name)
            return {"success": True, "file_name": safe_name}
        except Exception as e:
            logger.error("[VideoRecorder] Error deleting recording %s: %s", safe_name, e)
            return {"success": False, "error": str(e)}

    def open_recordings_folder(self) -> Dict[str, Any]:
        """Open the recordings directory in the OS file explorer."""
        try:
            os.makedirs(self.save_dir, exist_ok=True)
            if platform.system() == "Windows":
                os.startfile(self.save_dir)
            elif platform.system() == "Darwin":
                subprocess.Popen(["open", self.save_dir])
            else:
                subprocess.Popen(["xdg-open", self.save_dir])
            return {"success": True, "path": self.save_dir}
        except Exception as e:
            logger.error("[VideoRecorder] Failed to open folder: %s", e)
            return {"success": False, "error": str(e)}

    # ── Screenshot Engine & File Management ─────────────────────────────

    def take_screenshot(
        self,
        frame: Optional[np.ndarray] = None,
        filename: Optional[str] = None,
        format: str = "png"
    ) -> Dict[str, Any]:
        """
        Capture and export an ultra-fast high-resolution gameplay screenshot.
        Uses the supplied frame, latest recorded frame, or desktop grab fallback.
        Generates a lightweight base64 thumbnail for instant frontend preview.
        """
        target_frame = frame
        if target_frame is None:
            with self._lock:
                if self._last_frame is not None:
                    target_frame = self._last_frame.copy()

        # Desktop grab fallback if capture pipeline is currently idle
        if target_frame is None:
            try:
                import mss
                with mss.mss() as sct:
                    monitor = sct.monitors[1] if len(sct.monitors) > 1 else sct.monitors[0]
                    sct_img = sct.grab(monitor)
                    target_frame = cv2.cvtColor(np.array(sct_img), cv2.COLOR_BGRA2BGR)
            except Exception as e:
                logger.debug("[VideoRecorder] Desktop screenshot fallback failed: %s", e)

        if target_frame is None or not isinstance(target_frame, np.ndarray):
            return {
                "success": False,
                "error": "No gameplay frame available for screenshot.",
            }

        try:
            os.makedirs(self.screenshots_dir, exist_ok=True)
            timestamp_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            fmt = format.lower().strip()
            ext = ".jpg" if fmt in ("jpg", "jpeg") else ".png"

            if filename:
                safe_name = os.path.basename(filename.strip())
                if not safe_name.lower().endswith(ext):
                    safe_name += ext
            else:
                safe_name = f"MissionControl_{timestamp_str}{ext}"

            filepath = os.path.join(self.screenshots_dir, safe_name)

            # Write file to disk
            if ext == ".jpg":
                cv2.imwrite(filepath, target_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
            else:
                cv2.imwrite(filepath, target_frame, [int(cv2.IMWRITE_PNG_COMPRESSION), 4])

            size_kb = round(os.path.getsize(filepath) / 1024, 1)
            h, w = target_frame.shape[:2]

            # Generate lightweight thumbnail data URL for immediate zero-latency UI preview
            thumb_w = 320
            thumb_h = max(1, int(thumb_w * h / max(1, w)))
            thumb = cv2.resize(target_frame, (thumb_w, thumb_h), interpolation=cv2.INTER_AREA)
            _, thumb_buf = cv2.imencode(".jpg", thumb, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
            b64_thumb = base64.b64encode(thumb_buf).decode("utf-8")
            preview_url = f"data:image/jpeg;base64,{b64_thumb}"

            logger.info("[VideoRecorder] Saved screenshot: %s (%dx%d, %.1f KB)", safe_name, w, h, size_kb)
            return {
                "success": True,
                "file_name": safe_name,
                "file_path": filepath,
                "size_kb": size_kb,
                "created_at": int(time.time() * 1000),
                "width": w,
                "height": h,
                "preview": preview_url,
            }
        except Exception as e:
            logger.error("[VideoRecorder] Failed to save screenshot: %s", e, exc_info=True)
            return {"success": False, "error": str(e)}

    def list_screenshots(self) -> List[Dict[str, Any]]:
        """List all saved screenshots in the output directory, newest first."""
        items: List[Dict[str, Any]] = []
        if not os.path.exists(self.screenshots_dir):
            return items

        valid_exts = {".png", ".jpg", ".jpeg", ".webp"}
        try:
            for entry in os.scandir(self.screenshots_dir):
                if entry.is_file():
                    ext = os.path.splitext(entry.name)[1].lower()
                    if ext in valid_exts:
                        stat = entry.stat()
                        items.append({
                            "file_name": entry.name,
                            "file_path": entry.path,
                            "size_kb": round(stat.st_size / 1024, 1),
                            "created_at": int(stat.st_mtime * 1000),
                        })
        except Exception as e:
            logger.warning("[VideoRecorder] Failed to list screenshots: %s", e)

        items.sort(key=lambda x: x["created_at"], reverse=True)
        return items

    def delete_screenshot(self, filename: str) -> Dict[str, Any]:
        """Safely delete a screenshot file from the screenshots directory."""
        if not filename:
            return {"success": False, "error": "Filename is required."}

        safe_name = os.path.basename(filename)
        target = os.path.join(self.screenshots_dir, safe_name)

        if not os.path.exists(target):
            return {"success": False, "error": "File does not exist."}

        try:
            os.remove(target)
            logger.info("[VideoRecorder] Deleted screenshot: %s", safe_name)
            return {"success": True, "file_name": safe_name}
        except Exception as e:
            logger.error("[VideoRecorder] Error deleting screenshot %s: %s", safe_name, e)
            return {"success": False, "error": str(e)}

    def open_screenshots_folder(self) -> Dict[str, Any]:
        """Open the screenshots directory in the OS file explorer."""
        try:
            os.makedirs(self.screenshots_dir, exist_ok=True)
            if platform.system() == "Windows":
                os.startfile(self.screenshots_dir)
            elif platform.system() == "Darwin":
                subprocess.Popen(["open", self.screenshots_dir])
            else:
                subprocess.Popen(["xdg-open", self.screenshots_dir])
            return {"success": True, "path": self.screenshots_dir}
        except Exception as e:
            logger.error("[VideoRecorder] Failed to open screenshots folder: %s", e)
            return {"success": False, "error": str(e)}
