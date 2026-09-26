"""
Mission Control — Process Guard & System Lifecycle Utilities
Manages single-instance locking, process priority tuning, orphan monitoring, and admin elevation.
"""
import logging
import os
import sys
import threading
import time

logger = logging.getLogger("process_guard")

try:
    import psutil
    _PSUTIL_AVAILABLE = True
except ImportError:
    _PSUTIL_AVAILABLE = False


def lower_process_priority() -> None:
    """Lower process priority to BELOW_NORMAL so the backend never competes with active games."""
    try:
        if _PSUTIL_AVAILABLE:
            import psutil as _psutil
            proc = _psutil.Process(os.getpid())
            if os.name == "nt":
                proc.nice(_psutil.BELOW_NORMAL_PRIORITY_CLASS)
            else:
                proc.nice(10)  # Unix nice value: 10 = noticeably lower priority
            logger.info("[Perf] Backend process priority set to BELOW_NORMAL — game performance protected.")
        elif os.name == "nt":
            import ctypes as _ctypes
            below_normal = 0x00004000
            _ctypes.windll.kernel32.SetPriorityClass(
                _ctypes.windll.kernel32.GetCurrentProcess(),
                below_normal
            )
            logger.info("[Perf] Backend process priority set to BELOW_NORMAL via WinAPI.")
    except Exception as prio_err:
        logger.debug("[Perf] Could not lower process priority: %s", prio_err)


def start_orphan_monitor(parent_pid: int) -> None:
    """Start background monitor thread to terminate gracefully if the parent UI process dies."""
    if parent_pid <= 1:
        return

    def _monitor():
        import ctypes
        while True:
            time.sleep(3)
            try:
                if os.name == "nt":
                    process_query = 0x0400
                    synchronize = 0x00100000
                    handle = ctypes.windll.kernel32.OpenProcess(
                        process_query | synchronize, False, parent_pid
                    )
                    if handle == 0:
                        os._exit(0)
                    exit_code = ctypes.c_ulong()
                    ctypes.windll.kernel32.GetExitCodeProcess(handle, ctypes.byref(exit_code))
                    still_active = 259
                    if exit_code.value != still_active:
                        os._exit(0)
                    ctypes.windll.kernel32.CloseHandle(handle)
                elif os.getppid() != parent_pid:
                    os._exit(0)
            except Exception:
                pass

    threading.Thread(target=_monitor, daemon=True, name="OrphanMonitor").start()


def acquire_instance_lock(lock_path: str) -> int | None:
    """Acquires a single-instance file lock with stale-PID recovery. Returns file descriptor or None."""
    try:
        os.makedirs(os.path.dirname(lock_path), exist_ok=True)
    except Exception:
        pass

    try:
        fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_RDWR)
        os.write(fd, str(os.getpid()).encode())
        return fd
    except FileExistsError:
        pid = None
        try:
            with open(lock_path, "r", encoding="utf-8") as f:
                txt = f.read().strip()
                pid = int(txt) if txt else None
        except Exception:
            pid = None

        if pid and _PSUTIL_AVAILABLE:
            try:
                if psutil.pid_exists(pid):
                    proc = psutil.Process(pid)
                    curr_proc = psutil.Process(os.getpid())

                    proc_name = proc.name().lower()
                    curr_name = curr_proc.name().lower()

                    is_same_app = False
                    if "python" in proc_name and "python" in curr_name:
                        proc_cmd = proc.cmdline()
                        curr_cmd = curr_proc.cmdline()
                        proc_main = any("main.py" in arg for arg in proc_cmd)
                        curr_main = any("main.py" in arg for arg in curr_cmd)
                        if proc_main and curr_main:
                            is_same_app = True
                    elif proc_name == curr_name:
                        is_same_app = True
                    elif "missioncontrol" in proc_name and "missioncontrol" in curr_name:
                        is_same_app = True

                    if is_same_app:
                        try:
                            proc.kill()
                            proc.wait(timeout=3)
                        except Exception:
                            pass
                else:
                    logger.warning("[Lock] Stale lock found (PID %s is dead). Removing.", pid)
                    try:
                        os.remove(lock_path)
                    except Exception as rm_err:
                        logger.error("[Lock] Could not remove stale lock at %s: %s", lock_path, rm_err)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
            except Exception:
                pass
        elif not _PSUTIL_AVAILABLE:
            try:
                os.remove(lock_path)
            except Exception:
                pass

        for attempt in range(10):
            try:
                try:
                    os.remove(lock_path)
                except FileNotFoundError:
                    pass
                except Exception:
                    pass

                fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_RDWR)
                os.write(fd, str(os.getpid()).encode())
                return fd
            except Exception:
                if attempt < 9:
                    time.sleep(0.5)
        return None


def release_instance_lock(lock_fd: int | None, lock_path: str) -> None:
    """Closes the lock file descriptor and deletes the lock file."""
    if lock_fd:
        try:
            os.close(lock_fd)
        except Exception:
            pass
        if os.path.exists(lock_path):
            try:
                os.remove(lock_path)
            except Exception:
                pass


def request_admin_elevation(argv: list[str] | None = None) -> bool:
    """Checks if running as Administrator on Windows. If not and neither --no-admin nor --dev is passed,
    requests elevation via ShellExecuteW and exits the current process.
    """
    if argv is None:
        argv = sys.argv
    if sys.platform != "win32" or "--no-admin" in argv or "--dev" in argv:
        return True
    try:
        import ctypes
        if not ctypes.windll.shell32.IsUserAnAdmin():
            params = " ".join([f'"{arg}"' for arg in argv[1:]])
            logger.info("Requesting Administrator privileges for native ETW hooks...")
            ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, f'"{argv[0]}" {params}'.strip(), os.getcwd(), 1)
            sys.exit(0)
    except Exception as e:
        logger.warning("Failed to elevate to Administrator: %s", e)
        return False
    return True

