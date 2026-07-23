"""
fps_counter_dx.py

Python binding layer for fps_counter.dll — a native C++/QPC frame timing library.

Loads fps_counter.dll via ctypes when available and exposes a clean API
for UpdateFPSCounter / GetAverageFPS / GetMinAvgFPS / GetMaxAvgFPS /
GetOnePercentLow / GetFrameCount / ResetFPSCounter.

If the DLL is missing (not yet compiled, or on a non-Windows platform), falls
back transparently to a pure-Python implementation so the rest of the backend
never has to handle the ImportError.

Usage:
    from fps_counter_dx import fps_counter
    fps_counter.update()                   # call once per captured frame
    avg  = fps_counter.average_fps
    lo   = fps_counter.one_percent_low
    lo_m = fps_counter.min_avg_fps
    hi_m = fps_counter.max_avg_fps
    fps_counter.reset()                    # call when a new game session starts
"""

from __future__ import annotations

import ctypes
import logging
import os
import threading
import time
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ── Locate the DLL ─────────────────────────────────────────────────────────
_THIS_DIR = Path(__file__).parent
_DLL_PATH = _THIS_DIR / "fps_counter.dll"


# ── Native DLL wrapper ───────────────────────────────────────────────────────
class FPSCounter:
    """Thin ctypes wrapper around fps_counter.dll."""

    def __init__(self, dll: ctypes.CDLL):
        self._dll = dll

        # Configure return types
        dll.GetAverageFPS.restype   = ctypes.c_double
        dll.GetMinAvgFPS.restype    = ctypes.c_double
        dll.GetMaxAvgFPS.restype    = ctypes.c_double
        dll.GetMinFPS.restype       = ctypes.c_double
        dll.GetMaxFPS.restype       = ctypes.c_double
        dll.GetOnePercentLow.restype = ctypes.c_double
        dll.GetFrameCount.restype   = ctypes.c_int

        # Configure argument types (all are void/no-arg except SetTargetPID)
        dll.SetTargetPID.argtypes      = [ctypes.c_int]
        dll.SetTargetPID.restype       = None
        
        dll.UpdateFPSCounter.argtypes  = []
        dll.GetAverageFPS.argtypes     = []
        dll.GetMinAvgFPS.argtypes      = []
        dll.GetMaxAvgFPS.argtypes      = []
        dll.GetMinFPS.argtypes         = []
        dll.GetMaxFPS.argtypes         = []
        dll.GetOnePercentLow.argtypes  = []
        dll.GetFrameCount.argtypes     = []
        dll.ResetFPSCounter.argtypes   = []
        dll.GetRecentFrametimes.argtypes = [ctypes.POINTER(ctypes.c_double), ctypes.c_int]
        dll.GetRecentFrametimes.restype = ctypes.c_int

        logger.info("[FPSCounter] Native ETW/DXGI mode active — fps_counter.dll loaded")

    def set_target_pid(self, pid: int) -> None:
        self._dll.SetTargetPID(pid)

    def update(self) -> None:
        self._dll.UpdateFPSCounter()

    def reset(self) -> None:
        self._dll.ResetFPSCounter()

    @property
    def average_fps(self) -> float:
        return float(self._dll.GetAverageFPS())

    @property
    def min_avg_fps(self) -> float:
        return float(self._dll.GetMinAvgFPS())

    @property
    def max_avg_fps(self) -> float:
        return float(self._dll.GetMaxAvgFPS())

    @property
    def min_fps(self) -> float:
        return float(self._dll.GetMinFPS())

    @property
    def max_fps(self) -> float:
        return float(self._dll.GetMaxFPS())

    @property
    def one_percent_low(self) -> float:
        return float(self._dll.GetOnePercentLow())

    @property
    def frame_count(self) -> int:
        return int(self._dll.GetFrameCount())

    def get_recent_frametimes(self, max_count: int = 128) -> list[float]:
        """Returns the most recent frametimes in milliseconds."""
        buffer = (ctypes.c_double * max_count)()
        count = self._dll.GetRecentFrametimes(buffer, max_count)
        return [buffer[i] for i in range(count)]


# ── Factory: resolve at import time ─────────────────────────────────────────
def _build_counter():
    """Load the native DLL. Hard requirement as requested by the user."""
    if os.name != "nt":
        raise RuntimeError("fps_counter.dll is Windows-only. Cannot load on this platform.")

    if not _DLL_PATH.exists():
        raise FileNotFoundError(
            f"fps_counter.dll not found at {_DLL_PATH}. "
            "Please run compile_fps_counter.bat to compile the native library."
        )

    try:
        dll = ctypes.CDLL(str(_DLL_PATH))
        return FPSCounter(dll)
    except OSError as exc:
        raise RuntimeError(f"Failed to load fps_counter.dll: {exc}")


# ── Module-level singleton ────────────────────────────────────────────────────
fps_counter = _build_counter()
