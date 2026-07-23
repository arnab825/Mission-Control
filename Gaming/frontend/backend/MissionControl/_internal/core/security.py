import os
import sys
import base64
import logging

logger = logging.getLogger(__name__)

def xor_encrypt_decrypt(data: str, key: bytes) -> str:
    if not data:
        return ""
    key_len = len(key)
    data_bytes = data.encode('utf-8')
    cipher_bytes = bytes([b ^ key[i % key_len] for i, b in enumerate(data_bytes)])
    return base64.b64encode(cipher_bytes).decode('utf-8')

def xor_decrypt(cipher_b64: str, key: bytes) -> str:
    if not cipher_b64:
        return ""
    key_len = len(key)
    try:
        cipher_bytes = base64.b64decode(cipher_b64.encode('utf-8'))
        data_bytes = bytes([b ^ key[i % key_len] for i, b in enumerate(cipher_bytes)])
        return data_bytes.decode('utf-8')
    except Exception as e:
        logger.error(f"[Security] Sandbox decryption failed: {e}")
        return ""

class SecureSandbox:
    """
    Volatile in-memory secure storage container.
    Encrypts string values in local RAM using a transient key.
    """
    def __init__(self, key: bytes = None):
        self._key = key or os.urandom(32)
        self._data = {}

    def set(self, name: str, value: str) -> None:
        if value is None:
            self._data[name] = None
        else:
            self._data[name] = xor_encrypt_decrypt(value, self._key)

    def get(self, name: str) -> str:
        cipher = self._data.get(name)
        if cipher is None:
            return ""
        return xor_decrypt(cipher, self._key)

    def rotate_key(self, new_key: bytes) -> None:
        """Decrypt all values using the old key, and re-encrypt with the new key."""
        temp_decrypted = {}
        for k, v in list(self._data.items()):
            if v is not None:
                temp_decrypted[k] = xor_decrypt(v, self._key)
            else:
                temp_decrypted[k] = None

        self._key = new_key
        for k, v in temp_decrypted.items():
            if v is None:
                self._data[k] = None
            else:
                self._data[k] = xor_encrypt_decrypt(v, self._key)


def get_motherboard_uuid() -> str:
    """Query motherboard UUID using multiple fallbacks (COM, WMI, Powershell)."""
    uuid_str = None
    if sys.platform == "win32":
        # Fallback 1: COM swbemlocator
        try:
            import win32com.client
            objWMIService = win32com.client.Dispatch("WbemScripting.SWbemLocator")
            objWMIService = objWMIService.ConnectServer(".", "root\\cimv2")
            colItems = objWMIService.ExecQuery("Select UUID from Win32_ComputerSystemProduct")
            for objItem in colItems:
                uuid_str = objItem.UUID
                if uuid_str:
                    break
        except Exception:
            pass

        # Fallback 2: wmi package
        if not uuid_str:
            try:
                import wmi
                c = wmi.WMI()
                for system in c.Win32_ComputerSystemProduct():
                    uuid_str = system.UUID
                    if uuid_str:
                        break
            except Exception:
                pass

        # Fallback 3: Powershell Command
        if not uuid_str:
            import subprocess
            try:
                cmd = "powershell -Command \"(Get-CimInstance Win32_ComputerSystemProduct).UUID\""
                # Hide the console window on Windows
                si = None
                creationflags = 0
                if sys.platform == "win32":
                    si = subprocess.STARTUPINFO()
                    si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                    si.wShowWindow = 0
                    creationflags = 0x08000000
                uuid_str = subprocess.check_output(
                    cmd, 
                    shell=True,
                    startupinfo=si,
                    creationflags=creationflags
                ).decode().strip()
            except Exception:
                pass

    if not uuid_str:
        # For non-windows/fallback systems
        uuid_str = "SYSTEM-FALLBACK-UUID-DEFAULT-KEY"

    return uuid_str.strip()


def verify_uuid_lock(config: dict) -> bool:
    """
    Verify motherboard UUID signature matches locked configuration.
    If the lock file does not exist, binds to current motherboard.
    """
    privacy_cfg = config.get("privacy", {})
    if not privacy_cfg.get("uuid_lock", False):
        return True  # Lock not active

    from core.config_loader import get_app_data_path
    app_path = get_app_data_path()
    config_dir = app_path if app_path else "config"
    lock_file = os.path.join(config_dir, ".uuid_lock")

    current_uuid = get_motherboard_uuid()

    if not os.path.exists(lock_file):
        try:
            os.makedirs(os.path.dirname(lock_file), exist_ok=True)
            with open(lock_file, "w", encoding="utf-8") as f:
                f.write(current_uuid)
            logger.info(f"[Security] UUID Lock initialized: Bound installation to motherboard signature {current_uuid[:12]}...")
            return True
        except Exception as e:
            logger.error(f"[Security] Failed to write UUID Lock file: {e}")
            return True # Don't block if we can't write, but log error

    try:
        with open(lock_file, "r", encoding="utf-8") as f:
            locked_uuid = f.read().strip()

        if current_uuid != locked_uuid:
            logger.critical(f"[Security] MOTHERBOARD UUID MISMATCH! Current: {current_uuid[:12]}... Expected: {locked_uuid[:12]}...")
            return False

        logger.info(f"[Security] Motherboard UUID signature verified successfully.")
        return True
    except Exception as e:
        logger.error(f"[Security] Error reading UUID lock file: {e}")
        return True
