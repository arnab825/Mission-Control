"""Alienware Command Center (AWCC) detection and compatibility layer.

Task 9 — AWCC Detection
-----------------------

AWCC (Alienware Command Center / Alienware Command Center Centrality) manages
Alienware-specific hardware features: thermal profiles, RGB lighting, fan
curves, and power/voltage delivery on supported Dell/Alienware systems.

Mission Control's optimizer can conflict with AWCC in the following areas:
  - Thermal/cooling preset changes (both may write to the same EC registers)
  - GPU power limits (both may use MSI Afterburner API or NVML)
  - CPU power limits on Alienware laptops (AWCC controls via EC firmware)

This module:
  1. Detects AWCC presence via registry, process, service, or install path.
  2. Returns a capability map indicating which Mission Control features should
     be disabled or restricted when AWCC is active.
  3. Is read-only — it never interacts with AWCC or modifies its settings.

Usage:
    from system.awcc_detector import AWCCDetector
    detector = AWCCDetector()
    status = detector.detect()
    # status.detected → True/False
    # status.restricted_features → list of feature IDs to disable
"""
from __future__ import annotations

import logging
import os
import subprocess
import sys
from dataclasses import dataclass, field
from typing import List, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class AWCCStatus:
    """Result of AWCC detection.

    Attributes:
        detected:            True if AWCC is installed and/or running.
        version:             AWCC version string from registry (or None).
        is_running:          True if an AWCC process is currently alive.
        service_running:     True if the AWCCSrv Windows service is active.
        detection_method:    Which detection method succeeded first.
        restricted_features: List of Mission Control feature IDs that should
                             be disabled or shown with a warning badge when
                             AWCC is active.
        warning_message:     Human-readable message for the UI status badge.
    """
    detected: bool = False
    version: Optional[str] = None
    is_running: bool = False
    service_running: bool = False
    detection_method: Optional[str] = None
    restricted_features: List[str] = field(default_factory=list)
    warning_message: str = ""

    def to_dict(self) -> dict:
        return {
            "detected": self.detected,
            "version": self.version,
            "is_running": self.is_running,
            "service_running": self.service_running,
            "detection_method": self.detection_method,
            "restricted_features": self.restricted_features,
            "warning_message": self.warning_message,
        }


# Feature IDs that Mission Control should restrict when AWCC is active.
# These correspond to keys/actions in the optimizer and pipeline host.
_AWCC_RESTRICTED_FEATURES = [
    "thermal_preset",       # CPU/GPU thermal profile switching
    "cpu_power_limit",      # CPU TDP / power limit adjustments
    "gpu_power_limit",      # GPU TDP / power limit adjustments
    "fan_curve",            # Fan curve manipulation
    "ec_direct_write",      # Direct Embedded Controller writes
]


# ---------------------------------------------------------------------------
# AWCC Detector
# ---------------------------------------------------------------------------

class AWCCDetector:
    """Detects Alienware Command Center using multiple read-only methods.

    Methods are tried in order from fastest/cheapest to slowest:
      1. Registry key lookup (instant, no subprocess)
      2. Install directory existence (instant, no subprocess)
      3. Process list scan via psutil (fast)
      4. Windows service query via sc.exe (subprocess, cached)
    """

    # Known AWCC registry locations (both old AWCC and new AWCC Centrality)
    _REGISTRY_KEYS = [
        r"SOFTWARE\Alienware\AWCC",
        r"SOFTWARE\WOW6432Node\Alienware\AWCC",
        r"SOFTWARE\Dell\AlienwareCentrality",
        r"SOFTWARE\WOW6432Node\Dell\AlienwareCentrality",
        r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\AWCC",
        r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\AWCC",
    ]

    # Known AWCC process names
    _PROCESS_NAMES = {
        "awcc.exe",
        "alienwarece.exe",
        "alienwarecentrality.exe",
        "awcchelperapplication.exe",
        "awccrplugin.exe",
        "aliencommandcenter.exe",
    }

    # Known install paths
    _INSTALL_PATHS = [
        r"C:\Program Files\Alienware\AWCC",
        r"C:\Program Files (x86)\Alienware\AWCC",
        r"C:\Program Files\Dell\AlienwareCentrality",
        r"C:\Program Files (x86)\Dell\AlienwareCentrality",
    ]

    # Windows service names
    _SERVICE_NAMES = ["AWCCSrv", "AlienwareCentrality", "AWCC"]

    def __init__(self) -> None:
        self._cached_result: Optional[AWCCStatus] = None

    def detect(self, force: bool = False) -> AWCCStatus:
        """Run detection and return an AWCCStatus.

        Results are cached after the first successful detection to avoid
        repeated subprocess overhead. Pass force=True to re-detect.
        """
        if self._cached_result is not None and not force:
            return self._cached_result

        if sys.platform != "win32":
            self._cached_result = AWCCStatus(detected=False)
            return self._cached_result

        status = AWCCStatus()

        # --- Method 1: Registry ---
        reg_version = self._check_registry()
        if reg_version is not None:
            status.detected = True
            status.version = reg_version
            status.detection_method = "registry"
            logger.info("[AWCC] Detected via registry. Version: %s", reg_version)

        # --- Method 2: Install directory ---
        if not status.detected:
            install_path = self._check_install_paths()
            if install_path:
                status.detected = True
                status.detection_method = "install_path"
                logger.info("[AWCC] Detected via install path: %s", install_path)

        # --- Method 3: Process scan ---
        is_running = self._check_processes()
        if is_running:
            status.is_running = True
            if not status.detected:
                status.detected = True
                status.detection_method = "process"
                logger.info("[AWCC] Detected via running process.")

        # --- Method 4: Service query (only if other methods found nothing) ---
        if not status.detected:
            svc_running = self._check_service()
            if svc_running:
                status.detected = True
                status.service_running = True
                status.detection_method = "service"
                logger.info("[AWCC] Detected via Windows service.")

        if status.detected:
            status.restricted_features = list(_AWCC_RESTRICTED_FEATURES)
            status.warning_message = (
                "Alienware Command Center (AWCC) is installed. "
                "Thermal preset and power limit controls are disabled to prevent conflicts."
            )
            logger.warning(
                "[AWCC] AWCC detected (%s). Restricting features: %s",
                status.detection_method, status.restricted_features,
            )
        else:
            logger.debug("[AWCC] AWCC not detected. All features available.")

        self._cached_result = status
        return status

    # ------------------------------------------------------------------
    # Detection methods (all read-only)
    # ------------------------------------------------------------------

    def _check_registry(self) -> Optional[str]:
        """Check HKLM registry for AWCC installation keys. Returns version or None."""
        try:
            import winreg  # type: ignore[reportMissingImports]
        except ImportError:
            return None

        for key_path in self._REGISTRY_KEYS:
            for hive in (winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER):
                try:
                    with winreg.OpenKey(hive, key_path, 0, winreg.KEY_READ) as key:
                        # Try to read a version value; any key existence is enough
                        try:
                            version, _ = winreg.QueryValueEx(key, "DisplayVersion")
                            return str(version)
                        except FileNotFoundError:
                            # Key exists but no DisplayVersion — still detected
                            return "unknown"
                except (FileNotFoundError, PermissionError, OSError):
                    continue
        return None

    def _check_install_paths(self) -> Optional[str]:
        """Check known AWCC install directories. Returns the found path or None."""
        for path in self._INSTALL_PATHS:
            if os.path.isdir(path):
                return path
        return None

    def _check_processes(self) -> bool:
        """Scan running processes for known AWCC process names using psutil."""
        try:
            import psutil  # type: ignore[reportMissingImports]
            for proc in psutil.process_iter(["name"]):
                try:
                    name = (proc.info.get("name") or "").lower()
                    if name in self._PROCESS_NAMES:
                        return True
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except Exception as e:
            logger.debug("[AWCC] Process scan failed: %s", e)
        return False

    def _check_service(self) -> bool:
        """Query Windows service state via sc.exe (slow, cached). Returns True if running."""
        try:
            si = subprocess.STARTUPINFO()
            si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            si.wShowWindow = 0

            for svc in self._SERVICE_NAMES:
                result = subprocess.run(
                    ["sc", "query", svc],
                    capture_output=True,
                    text=True,
                    timeout=3,
                    startupinfo=si,
                    creationflags=0x08000000,  # CREATE_NO_WINDOW
                )
                if result.returncode == 0 and "RUNNING" in result.stdout:
                    return True
        except Exception as e:
            logger.debug("[AWCC] Service check failed: %s", e)
        return False


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

_detector: Optional[AWCCDetector] = None


def get_awcc_status(force: bool = False) -> AWCCStatus:
    """Return the cached AWCC detection result (module-level singleton)."""
    global _detector
    if _detector is None:
        _detector = AWCCDetector()
    return _detector.detect(force=force)


def is_feature_restricted(feature_id: str) -> bool:
    """Return True if `feature_id` should be disabled due to AWCC conflict."""
    status = get_awcc_status()
    return status.detected and feature_id in status.restricted_features
