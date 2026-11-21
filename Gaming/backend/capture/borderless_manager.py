"""
Borderless Window Manager — Non-invasive Win32 window style manipulation.
Coerces windowed games without native borderless options (e.g. Batman: Arkham Knight,
Sekiro: Shadows Die Twice, Dark Souls, older DX9/DX11 titles) into borderless
fullscreen windows.

Operates purely out-of-process via standard Win32 window management APIs.
Does NOT perform DLL injection, API hooking, or game process memory modification.
"""

from __future__ import annotations

import logging
import sys
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger(__name__)

# Safe imports for Windows
_WIN32_AVAILABLE = False
if sys.platform == "win32":
    try:
        import win32api
        import win32con
        import win32gui
        _WIN32_AVAILABLE = True
    except ImportError:
        logger.warning("[BorderlessManager] pywin32 modules not available.")


class BorderlessManager:
    """Manages out-of-process window style coercion to convert windowed games into borderless fullscreen."""

    def __init__(self) -> None:
        self._saved_window_styles: Dict[int, Dict[str, Any]] = {}

    @property
    def is_available(self) -> bool:
        return _WIN32_AVAILABLE

    def is_borderless(self, hwnd: int) -> bool:
        """Check if a window already lacks caption/thickframe borders."""
        if not _WIN32_AVAILABLE or not win32gui.IsWindow(hwnd):
            return False
        try:
            style = win32gui.GetWindowLong(hwnd, win32con.GWL_STYLE)
            has_caption = (style & win32con.WS_CAPTION) == win32con.WS_CAPTION
            has_thickframe = (style & win32con.WS_THICKFRAME) == win32con.WS_THICKFRAME
            return (not has_caption) and (not has_thickframe)
        except Exception as e:
            logger.debug(f"[BorderlessManager] Error checking borderless for hwnd {hwnd:#x}: {e}")
            return False

    def coerce_to_borderless(self, hwnd: int) -> bool:
        """Coerce a window into borderless fullscreen on its current monitor."""
        if not _WIN32_AVAILABLE:
            logger.warning("[BorderlessManager] Cannot coerce window: Win32 APIs unavailable.")
            return False

        if not win32gui.IsWindow(hwnd):
            logger.warning(f"[BorderlessManager] Invalid window handle: {hwnd}")
            return False

        try:
            # Check if already borderless
            if self.is_borderless(hwnd):
                logger.info(f"[BorderlessManager] Window {hwnd:#x} is already borderless fullscreen.")
                return True

            # Save existing styles & rect so they can be restored if needed
            style = win32gui.GetWindowLong(hwnd, win32con.GWL_STYLE)
            ex_style = win32gui.GetWindowLong(hwnd, win32con.GWL_EXSTYLE)
            rect = win32gui.GetWindowRect(hwnd)

            if hwnd not in self._saved_window_styles:
                self._saved_window_styles[hwnd] = {
                    "style": style,
                    "ex_style": ex_style,
                    "rect": rect,
                }

            # Locate monitor displaying the window
            hmon = win32api.MonitorFromWindow(hwnd, win32con.MONITOR_DEFAULTTONEAREST)
            mon_info = win32api.GetMonitorInfo(hmon)
            mon_rect: Tuple[int, int, int, int] = mon_info.get("Monitor", (0, 0, 1920, 1080))
            x = mon_rect[0]
            y = mon_rect[1]
            w = mon_rect[2] - mon_rect[0]
            h = mon_rect[3] - mon_rect[1]

            # Strip caption, thick resizing frame, system menu and buttons
            border_styles = (
                win32con.WS_CAPTION
                | win32con.WS_THICKFRAME
                | win32con.WS_MINIMIZEBOX
                | win32con.WS_MAXIMIZEBOX
                | win32con.WS_SYSMENU
            )
            new_style = (style & ~border_styles) | win32con.WS_POPUP | win32con.WS_VISIBLE

            # Strip 3D/modal frame borders from extended style
            ex_border_styles = (
                win32con.WS_EX_DLGMODALFRAME
                | win32con.WS_EX_CLIENTEDGE
                | win32con.WS_EX_STATICEDGE
                | win32con.WS_EX_WINDOWEDGE
            )
            new_ex_style = ex_style & ~ex_border_styles

            # Apply new styles
            win32gui.SetWindowLong(hwnd, win32con.GWL_STYLE, new_style)
            win32gui.SetWindowLong(hwnd, win32con.GWL_EXSTYLE, new_ex_style)

            # Re-position to cover entire monitor surface and force frame redraw
            flags = (
                win32con.SWP_FRAMECHANGED
                | win32con.SWP_NOZORDER
                | win32con.SWP_NOOWNERZORDER
                | win32con.SWP_SHOWWINDOW
            )
            win32gui.SetWindowPos(hwnd, 0, x, y, w, h, flags)
            logger.info(
                f"[BorderlessManager] Successfully converted window {hwnd:#x} to borderless ({w}x{h} at {x},{y})"
            )
            return True

        except Exception as e:
            logger.error(f"[BorderlessManager] Failed to coerce window {hwnd:#x} to borderless: {e}")
            return False

    def restore_window(self, hwnd: int) -> bool:
        """Restore a previously coerced window to its original windowed dimensions and styles."""
        if not _WIN32_AVAILABLE:
            return False

        if hwnd not in self._saved_window_styles or not win32gui.IsWindow(hwnd):
            logger.warning(f"[BorderlessManager] No saved style found for hwnd {hwnd:#x}")
            return False

        try:
            saved = self._saved_window_styles.pop(hwnd)
            win32gui.SetWindowLong(hwnd, win32con.GWL_STYLE, saved["style"])
            win32gui.SetWindowLong(hwnd, win32con.GWL_EXSTYLE, saved["ex_style"])

            rect = saved["rect"]
            w = rect[2] - rect[0]
            h = rect[3] - rect[1]

            flags = (
                win32con.SWP_FRAMECHANGED
                | win32con.SWP_NOZORDER
                | win32con.SWP_NOOWNERZORDER
                | win32con.SWP_SHOWWINDOW
            )
            win32gui.SetWindowPos(hwnd, 0, rect[0], rect[1], w, h, flags)
            logger.info(f"[BorderlessManager] Restored window {hwnd:#x} to original windowed style.")
            return True
        except Exception as e:
            logger.error(f"[BorderlessManager] Failed to restore window {hwnd:#x}: {e}")
            return False


# Singleton instance
borderless_manager = BorderlessManager()
