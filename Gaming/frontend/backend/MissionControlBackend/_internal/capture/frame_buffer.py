"""
Thread-safe double-buffered frame exchange for high-performance capture pipelines.
Allows a producer (capture thread) to write frames without blocking the consumer (vision thread).
"""
import threading
import time
import numpy as np

try:
    from fps_counter.fps_counter_dx import fps_counter as _fps_counter  # type: ignore
except Exception:
    _fps_counter = None



class FrameBuffer:
    """
    Lock-free-ish double-buffered frame exchange.
    
    The capture thread writes to the 'back' buffer, then swaps.
    The vision thread reads from the 'front' buffer without blocking capture.
    """

    def __init__(self):
        self._front = None        # Consumer reads from here
        self._back = None         # Producer writes here
        self._lock = threading.Lock()
        self._new_frame = threading.Event()
        self._frame_id = 0        # Monotonic frame counter
        self._last_read_id = -1   # Last frame ID consumed
        self._timestamp = 0.0     # Capture timestamp of front buffer
        self._fps_counter = _FPSCounter()

    def push(self, frame: np.ndarray):
        """
        Called by the capture thread to submit a new frame.
        Non-blocking for the consumer — just swaps the buffer pointer.
        """
        with self._lock:
            self._back = frame
            self._front, self._back = self._back, self._front
            self._frame_id += 1
            self._timestamp = time.perf_counter()
        self._new_frame.set()
        self._fps_counter.tick()
        # Note: The native C++ ETW timer tracks true hardware FPS autonomously.
        # We no longer manually call _fps_counter.update() here, as that only measured the capture loop.

    def get(self, timeout: float = 0.05) -> tuple:
        """
        Called by the vision thread to get the latest frame.
        Returns (frame, frame_id, is_new) or (None, -1, False) on timeout.
        
        :param timeout: Max seconds to wait for a new frame.
        :returns: (frame_copy, frame_id, is_new_frame)
        """
        self._new_frame.wait(timeout=timeout)
        self._new_frame.clear()

        with self._lock:
            if self._front is None:
                return None, -1, False
            
            frame = self._front  # Direct reference (no copy for speed)
            fid = self._frame_id
            is_new = fid != self._last_read_id
            self._last_read_id = fid
            return frame, fid, is_new

    def get_latest_copy(self, timeout: float = 0.05) -> tuple:
        """
        Non-blocking retrieval of the latest frame copy.
        Returns (frame_copy, frame_id, is_new) without waiting for or clearing the event.
        """
        with self._lock:
            if self._front is None:
                return None, -1, False
            frame = self._front.copy()
            fid = self._frame_id
            return frame, fid, True

    @property
    def capture_fps(self) -> float:
        """Returns the measured capture FPS."""
        return self._fps_counter.fps

    @property
    def average_fps(self) -> float:
        """Session average FPS (from C++ QPC layer, or 0.0 if unavailable)."""
        if _fps_counter is not None:
            try:
                return _fps_counter.average_fps
            except Exception:
                pass
        return 0.0

    @property
    def frame_count(self) -> int:
        """Total frame count processed by C++ QPC layer."""
        if _fps_counter is not None:
            try:
                return _fps_counter.frame_count
            except Exception:
                pass
        return 0

    @property
    def min_avg_fps(self) -> float:
        """Session minimum average FPS (from C++ QPC layer, or 0.0 if unavailable)."""
        if _fps_counter is not None:
            try:
                return _fps_counter.min_avg_fps
            except Exception:
                pass
        return 0.0

    @property
    def max_avg_fps(self) -> float:
        """Session maximum average FPS (from C++ QPC layer, or 0.0 if unavailable)."""
        if _fps_counter is not None:
            try:
                return _fps_counter.max_avg_fps
            except Exception:
                pass
        return 0.0

    @property
    def min_fps(self) -> float:
        """Session absolute minimum FPS (from C++ QPC layer, or 0.0 if unavailable)."""
        if _fps_counter is not None:
            try:
                return _fps_counter.min_fps
            except Exception:
                pass
        return 0.0

    @property
    def max_fps(self) -> float:
        """Session absolute maximum FPS (from C++ QPC layer, or 0.0 if unavailable)."""
        if _fps_counter is not None:
            try:
                return _fps_counter.max_fps
            except Exception:
                pass
        return 0.0

    @property
    def one_percent_low(self) -> float:
        """1% lows FPS (from C++ QPC layer, or 0.0 if unavailable)."""
        if _fps_counter is not None:
            try:
                return _fps_counter.one_percent_low
            except Exception:
                pass
        return 0.0

    @property
    def frametimes(self) -> list[float]:
        """Array of recent frame delta times in ms (from C++ QPC layer, or empty list if unavailable)."""
        if _fps_counter is not None:
            try:
                if hasattr(_fps_counter, 'get_recent_frametimes'):
                    return _fps_counter.get_recent_frametimes()
            except Exception:
                pass
        return []

    @property
    def frame_age_ms(self) -> float:
        """Returns how old the current front-buffer frame is, in milliseconds."""
        with self._lock:
            if self._timestamp == 0:
                return 0.0
            return (time.perf_counter() - self._timestamp) * 1000.0

    @property
    def capture_frame_count(self) -> int:
        return self._frame_id

    def reset(self):
        """Flush all FPS tracking state for a clean game-session transition."""
        with self._lock:
            self._last_read_id = -1
            self._timestamp = 0.0
            self._frame_id = 0
        self._fps_counter.reset()


class _FPSCounter:
    """Rolling FPS counter using a fixed-size window."""

    def __init__(self, window_size: int = 60):
        self._window_size = window_size
        self._timestamps = []
        self._lock = threading.Lock()

    def tick(self):
        now = time.perf_counter()
        with self._lock:
            self._timestamps.append(now)
            if len(self._timestamps) > self._window_size:
                self._timestamps.pop(0)

    def reset(self):
        """Clear all timestamps for a fresh session."""
        with self._lock:
            self._timestamps.clear()

    @property
    def fps(self) -> float:
        with self._lock:
            if len(self._timestamps) < 2:
                return 0.0
            elapsed = self._timestamps[-1] - self._timestamps[0]
            if elapsed <= 0:
                return 0.0
            return (len(self._timestamps) - 1) / elapsed
