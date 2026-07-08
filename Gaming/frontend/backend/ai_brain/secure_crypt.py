import hashlib
import os
import sys
import secrets
import logging

logger = logging.getLogger(__name__)

_cached_system_token = None
_cached_fallback_tokens = None

def get_system_token() -> str:
    """Generate a stable, unique system token for key derivation using hardware specs."""
    global _cached_system_token
    if _cached_system_token is not None:
        return _cached_system_token

    parts = []
    
    # Use fast COM API on Windows to retrieve motherboard/BIOS UUID
    if sys.platform == "win32":
        # 1. Try win32com.client (very fast COM client, ~0.12s)
        try:
            import win32com.client
            objWMIService = win32com.client.Dispatch("WbemScripting.SWbemLocator")
            objWMIService = objWMIService.ConnectServer(".", "root\\cimv2")
            colItems = objWMIService.ExecQuery("Select UUID from Win32_ComputerSystemProduct")
            for objItem in colItems:
                uuid_str = objItem.UUID
                if uuid_str:
                    parts.append(uuid_str)
                    break
        except Exception as e:
            logger.debug(f"Failed to get system UUID via win32com: {e}")

        # 2. Try wmi library (~0.24s) if win32com failed
        if not parts:
            try:
                import wmi
                c = wmi.WMI()
                for system in c.Win32_ComputerSystemProduct():
                    uuid_str = system.UUID
                    if uuid_str:
                        parts.append(uuid_str)
                        break
            except Exception as e:
                logger.debug(f"Failed to get system UUID via wmi package: {e}")

        # 3. Fallback to Powershell (slow, ~1.4s) as last resort
        if not parts:
            import subprocess
            try:
                cmd = "(Get-CimInstance -Class Win32_ComputerSystemProduct).UUID"
                res = subprocess.run(["powershell", "-Command", cmd], capture_output=True, text=True, creationflags=0x08000000)
                if res.returncode == 0:
                    uuid_str = res.stdout.strip()
                    if uuid_str:
                        parts.append(uuid_str)
            except Exception as e:
                logger.warning(f"Failed to get stable system UUID via powershell fallback: {e}")
            
    # Fallback to uuid node if absolutely necessary
    if not parts:
        import uuid
        try:
            parts.append(str(uuid.getnode()))
        except Exception:
            pass

    seed = "|".join(parts) or "MissionControl_Default_System_Secret_Seed_2026"
    _cached_system_token = hashlib.sha256(seed.encode()).hexdigest()
    return _cached_system_token

def get_fallback_tokens() -> list:
    """
    Generate a list of legacy tokens using all available MAC addresses.
    Used for decrypting old messages when the active network interface changes.
    """
    global _cached_fallback_tokens
    if _cached_fallback_tokens is not None:
        return _cached_fallback_tokens

    import uuid
    import subprocess
    seeds = []
    
    # 1. Current uuid.getnode()
    try:
        seeds.append(str(uuid.getnode()))
    except Exception:
        pass
        
    # 2. Get all MAC addresses using fast psutil if available (~0.01s)
    try:
        import psutil
        for interface, addrs in psutil.net_if_addrs().items():
            for addr in addrs:
                # Under Windows/Linux/OSX, MAC address is usually AF_LINK
                # Also include addresses containing hyphens or colons as backup heuristic
                is_link = getattr(addr, 'family', None) == psutil.AF_LINK or (hasattr(psutil, 'AF_LINK') and addr.family == psutil.AF_LINK)
                has_mac_format = addr.address and ('-' in addr.address or ':' in addr.address)
                if is_link or has_mac_format:
                    mac_clean = addr.address.replace("-", "").replace(":", "")
                    if len(mac_clean) == 12:
                        try:
                            mac_int = int(mac_clean, 16)
                            seeds.append(str(mac_int))
                        except ValueError:
                            pass
    except Exception as e:
        logger.debug(f"Failed to retrieve MACs via psutil: {e}")

    # 3. Fallback to getmac command (slow, ~1.28s) if psutil failed or returned no other MACs
    if len(seeds) <= 1:
        if sys.platform == "win32":
            try:
                res = subprocess.run(["getmac", "/fo", "csv", "/nh"], capture_output=True, text=True, creationflags=0x08000000)
                if res.returncode == 0:
                    for line in res.stdout.splitlines():
                        if line.strip():
                            parts = line.split(",")
                            if len(parts) >= 1:
                                mac_str = parts[0].replace('"', '').strip()
                                if "-" in mac_str:
                                    try:
                                        mac_int = int(mac_str.replace("-", ""), 16)
                                        seeds.append(str(mac_int))
                                    except ValueError:
                                        pass
            except Exception:
                pass

    # Unique fallback tokens
    tokens = []
    for seed in set(seeds):
        tokens.append(hashlib.sha256(seed.encode()).hexdigest())
    
    # Also add the default seed just in case
    tokens.append(hashlib.sha256(b"MissionControl_Default_System_Secret_Seed_2026").hexdigest())
    
    _cached_fallback_tokens = list(set(tokens))
    return _cached_fallback_tokens


def encrypt_data(plaintext: str, key_hex: str) -> str:
    """Encrypt plaintext using SHA-256 keystream with a random IV and HMAC."""
    import base64
    
    key = bytes.fromhex(key_hex)
    iv = secrets.token_bytes(16)
    plain_bytes = plaintext.encode("utf-8")
    
    # Generate Keystream (Conceptually equivalent to AES-CTR)
    cipher_bytes = bytearray()
    block_size = 32  # SHA-256 outputs 32 bytes
    for i in range(0, len(plain_bytes), block_size):
        block_idx = (i // block_size).to_bytes(4, byteorder="big")
        h = hashlib.sha256(key + iv + block_idx).digest()
        chunk = plain_bytes[i:i+block_size]
        for b_idx, b in enumerate(chunk):
            cipher_bytes.append(b ^ h[b_idx])
            
    # Calculate HMAC over (IV + Ciphertext) to prevent tampering
    hmac = hashlib.sha256(key + iv + cipher_bytes).digest()
    
    # Output format: base64(IV + HMAC + Ciphertext)
    combined = iv + hmac + cipher_bytes
    return base64.b64encode(combined).decode("utf-8")

def decrypt_data(ciphertext_b64: str, key_hex: str) -> str:
    """Decrypt ciphertext and verify HMAC integrity."""
    import base64
    
    key = bytes.fromhex(key_hex)
    try:
        combined = base64.b64decode(ciphertext_b64.encode("utf-8"))
        if len(combined) < 16 + 32:  # IV (16) + HMAC (32)
            raise ValueError("Ciphertext too short.")
            
        iv = combined[:16]
        expected_hmac = combined[16:48]
        cipher_bytes = combined[48:]
        
        # Verify HMAC first to verify data integrity
        actual_hmac = hashlib.sha256(key + iv + cipher_bytes).digest()
        if not secrets.compare_digest(actual_hmac, expected_hmac):
            raise ValueError("Integrity check failed: Data tampered or wrong key (system key may have changed).")
            
        # Decrypt Keystream
        plain_bytes = bytearray()
        block_size = 32
        for i in range(0, len(cipher_bytes), block_size):
            block_idx = (i // block_size).to_bytes(4, byteorder="big")
            h = hashlib.sha256(key + iv + block_idx).digest()
            chunk = cipher_bytes[i:i+block_size]
            for b_idx, b in enumerate(chunk):
                plain_bytes.append(b ^ h[b_idx])
                
        return plain_bytes.decode("utf-8")
    except Exception as e:
        logger.debug(f"Decryption failed: {e}")
        raise e
