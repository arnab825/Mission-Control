"""
Hardware Requirements Checker
Validates system hardware against game requirements after a successful installation.
"""
try:
    import psutil
    _PSUTIL_AVAILABLE = True
except ImportError:
    _PSUTIL_AVAILABLE = False

import platform
import logging
import sys
import os
import subprocess
import re

# Add parent directory to path so we can import nvidia modules if run directly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from nvidia.capabilities import GPUCapabilities
from system.gpu_profiler import GPUProfiler

import socket
logger = logging.getLogger(__name__)

def check_internet(host="8.8.8.8", port=53, timeout=3):
    """
    Checks if the internet is accessible by trying to connect to a public DNS server.
    """
    try:
        socket.setdefaulttimeout(timeout)
        socket.socket(socket.AF_INET, socket.SOCK_STREAM).connect((host, port))
        return True
    except socket.error:
        return False

class HardwareChecker:
    def __init__(self, config=None):
        self.config = config or {}
        self.gpu_caps = GPUCapabilities()
        self.gpu_profiler = GPUProfiler()
        # Cache for static specs that are queried via slow PowerShell sub-processes.
        # These values do not change during a session — only populated once.
        self._cached_specs: dict = {}

    def _get_wifi_details(self):
        if hasattr(self, "_cached_wifi"):
            return self._cached_wifi
            
        if platform.system() != "Windows":
            return None
        
        try:
            # Hide the console window on Windows
            si = None
            creationflags = 0
            if platform.system() == "Windows":
                si = subprocess.STARTUPINFO()
                si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                si.wShowWindow = 0
                creationflags = 0x08000000

            output = subprocess.check_output(
                ["netsh", "wlan", "show", "interfaces"], 
                encoding="utf-8", 
                errors="ignore",
                startupinfo=si,
                creationflags=creationflags
            )
            details = {}
            for line in output.split("\n"):
                line = line.strip()
                if ":" in line:
                    key, val = line.split(":", 1)
                    details[key.strip()] = val.strip()
            
            if "SSID" in details:
                # Map radio type to WiFi Version
                radio = details.get("Radio type", "")
                wifi_ver = "WiFi 4" # Default
                if "802.11be" in radio: wifi_ver = "WiFi 7"
                elif "802.11ax" in radio: wifi_ver = "WiFi 6"
                elif "802.11ac" in radio: wifi_ver = "WiFi 5"
                elif "802.11n" in radio: wifi_ver = "WiFi 4"

                self._cached_wifi = {
                    "ssid": details.get("SSID"),
                    "signal": details.get("Signal", "0%").replace("%", ""),
                    "channel": details.get("Channel"),
                    "protocol": radio,
                    "version": wifi_ver,
                    "auth": details.get("Authentication"),
                    "adapter": details.get("Description")
                }
                return self._cached_wifi
        except Exception:
            pass
            
        self._cached_wifi = None
        return None

    def _get_os_details(self):
        """Get accurate OS details with specific check for Windows 11."""
        os_info = {
            "edition": platform.system() + " " + platform.release(),
            "version": platform.version(),
            "architecture": platform.machine()
        }
        
        if platform.system() == "Windows":
            # Native Registry Optimization (under 1ms)
            try:
                import winreg
                key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows NT\CurrentVersion")
                product_name, _ = winreg.QueryValueEx(key, "ProductName")
                display_version, _ = winreg.QueryValueEx(key, "DisplayVersion")
                build_num, _ = winreg.QueryValueEx(key, "CurrentBuild")
                
                if product_name:
                    os_info["edition"] = product_name.replace("Microsoft ", "")
                if build_num:
                    os_info["version"] = f"Build {build_num}"
                    if display_version:
                        os_info["version"] = f"{display_version} (Build {build_num})"
                    # Windows 11 check based on build number >= 22000
                    if build_num.isdigit() and int(build_num) >= 22000:
                        if "Windows 10" in os_info["edition"]:
                            os_info["edition"] = os_info["edition"].replace("Windows 10", "Windows 11")
                
                arch_key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment")
                arch, _ = winreg.QueryValueEx(arch_key, "PROCESSOR_ARCHITECTURE")
                if arch:
                    os_info["architecture"] = arch
                return os_info
            except Exception:
                pass
            
            # Fallback to slow PowerShell (1.5s)
            try:
                import json
                ps_cmd = 'powershell -Command "Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, OSArchitecture | ConvertTo-Json -Compress"'
                si = subprocess.STARTUPINFO()
                si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                raw_out = subprocess.check_output(ps_cmd, shell=True, stderr=subprocess.DEVNULL, startupinfo=si, creationflags=0x08000000).decode(errors="ignore").strip()
                
                if raw_out:
                    data = json.loads(raw_out)
                    caption = data.get("Caption", "").strip()
                    version = data.get("Version", "")
                    arch = data.get("OSArchitecture", "")
                    
                    build_str = version.split('.')[-1] if '.' in version else "0"
                    if caption.startswith("Microsoft "):
                        caption = caption[len("Microsoft "):]
                    
                    os_info["edition"] = caption if caption else os_info["edition"]
                    os_info["version"] = f"Build {build_str}" if build_str != "0" else os_info["version"]
                    os_info["architecture"] = arch if arch else os_info["architecture"]
            except Exception:
                pass
            
        return os_info

    def _get_device_specs(self):
        """Get PC device name, manufacturer, model, motherboard, and BIOS version."""
        device_name = platform.node() or "Local-PC"
        manufacturer = "PC System"
        model = "Desktop / Laptop"
        motherboard = "OEM Motherboard"
        bios_version = "UEFI BIOS"
        bios_date = ""

        if platform.system() == "Windows":
            try:
                import winreg
                key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System\BIOS")
                try:
                    mfg, _ = winreg.QueryValueEx(key, "SystemManufacturer")
                    if mfg and mfg.strip():
                        manufacturer = mfg.strip()
                except Exception:
                    pass
                try:
                    prod, _ = winreg.QueryValueEx(key, "SystemProductName")
                    if prod and prod.strip():
                        model = prod.strip()
                except Exception:
                    pass
                try:
                    bb_mfg, _ = winreg.QueryValueEx(key, "BaseBoardManufacturer")
                    bb_prod, _ = winreg.QueryValueEx(key, "BaseBoardProduct")
                    combined_bb = f"{bb_mfg or ''} {bb_prod or ''}".strip()
                    if combined_bb:
                        motherboard = combined_bb
                except Exception:
                    pass
                try:
                    bv, _ = winreg.QueryValueEx(key, "BIOSVersion")
                    if bv and bv.strip():
                        bios_version = bv.strip()
                except Exception:
                    pass
                try:
                    bd, _ = winreg.QueryValueEx(key, "BIOSReleaseDate")
                    if bd and bd.strip():
                        bios_date = bd.strip()
                except Exception:
                    pass
                winreg.CloseKey(key)
            except Exception:
                pass

        return {
            "device_name": device_name,
            "manufacturer": manufacturer,
            "model": model,
            "motherboard": motherboard,
            "bios_version": bios_version,
            "bios_date": bios_date
        }
    
    def _get_display_info(self):
        """Get display resolution from the active video controller (non-null resolution)."""
        if platform.system() != "Windows":
            return [{"resolution": "Unknown", "refresh": "---", "dpi": 96}]
            
        # Native API ctypes Optimization (under 1ms)
        try:
            import ctypes
            from ctypes import wintypes
            
            class DEVMODEW(ctypes.Structure):
                _fields_ = [
                    ('dmDeviceName', ctypes.c_wchar * 32),
                    ('dmSpecVersion', wintypes.WORD),
                    ('dmDriverVersion', wintypes.WORD),
                    ('dmSize', wintypes.WORD),
                    ('dmDriverExtra', wintypes.WORD),
                    ('dmFields', wintypes.DWORD),
                    ('dmOrientation', ctypes.c_short),
                    ('dmPaperSize', ctypes.c_short),
                    ('dmPaperLength', ctypes.c_short),
                    ('dmPaperWidth', ctypes.c_short),
                    ('dmScale', ctypes.c_short),
                    ('dmCopies', ctypes.c_short),
                    ('dmDefaultSource', ctypes.c_short),
                    ('dmPrintQuality', ctypes.c_short),
                    ('dmColor', ctypes.c_short),
                    ('dmDuplex', ctypes.c_short),
                    ('dmYResolution', ctypes.c_short),
                    ('dmTTOption', ctypes.c_short),
                    ('dmCollate', ctypes.c_short),
                    ('dmFormName', ctypes.c_wchar * 32),
                    ('dmLogPixels', wintypes.WORD),
                    ('dmBitsPerPel', wintypes.DWORD),
                    ('dmPelsWidth', wintypes.DWORD),
                    ('dmPelsHeight', wintypes.DWORD),
                    ('dmDisplayFlags', wintypes.DWORD),
                    ('dmDisplayFrequency', wintypes.DWORD),
                ]
            
            devmode = DEVMODEW()
            devmode.dmSize = ctypes.sizeof(DEVMODEW)
            
            ENUM_CURRENT_SETTINGS = -1
            if ctypes.windll.user32.EnumDisplaySettingsW(None, ENUM_CURRENT_SETTINGS, ctypes.byref(devmode)):
                w = devmode.dmPelsWidth
                h = devmode.dmPelsHeight
                hz = devmode.dmDisplayFrequency
                return [{
                    "resolution": f"{w}x{h}",
                    "refresh": f"{hz}Hz" if hz else "---",
                    "dpi": 96
                }]
        except Exception as e:
            logger.debug(f"Failed to get display info natively: {e}")
            
        # Fallback to slow PowerShell (1.2s)
        try:
            import json
            ps_cmd = 'powershell -Command "Get-CimInstance Win32_VideoController | Select-Object CurrentHorizontalResolution, CurrentVerticalResolution, CurrentRefreshRate, Name | ConvertTo-Json -Compress"'
            si = subprocess.STARTUPINFO()
            si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            raw_out = subprocess.check_output(ps_cmd, shell=True, stderr=subprocess.DEVNULL, startupinfo=si, creationflags=0x08000000).decode(errors="ignore").strip()
            
            if raw_out:
                data = json.loads(raw_out)
                if isinstance(data, dict):
                    data = [data]
                    
                for d in data:
                    h = d.get("CurrentHorizontalResolution")
                    v = d.get("CurrentVerticalResolution")
                    hz = d.get("CurrentRefreshRate")
                    if h is not None and v is not None and h > 0 and v > 0:
                        return [{
                            "resolution": f"{h}x{v}",
                            "refresh": f"{hz}Hz" if hz else "---",
                            "dpi": 96
                        }]
        except Exception:
            pass
        return [{"resolution": "1920x1080", "refresh": "60Hz", "dpi": 96}]




    def _parse_usb_devices(self, data):
        if not data:
            return []
        if isinstance(data, dict):
            data = [data]
            
        peripherals = []
        seen = set()
        for d in data:
            name = d.get("FriendlyName", "").strip()
            if not name or name in seen:
                continue
            
            seen.add(name)
            peripherals.append({
                "name": name,
                "type": "USB",
                "status": "connected" if d.get("Status") == "OK" else d.get("Status", "unknown").lower()
            })
            if len(peripherals) > 12: break
        return peripherals

    def _get_usb_devices(self):
        """List connected USB peripherals via PowerShell with better filtering."""
        if platform.system() != "Windows":
            return []
            
        try:
            # Filter out hubs and controllers, keep actual peripherals
            ps_cmd = "powershell -Command \"Get-PnpDevice -PresentOnly | Where-Object { $_.Class -match 'Mouse|Keyboard|USB|HIDClass' -and $_.FriendlyName -notmatch 'Hub|Controller|Root|Generic|Enumerator|Host' } | Select-Object FriendlyName, Status | ConvertTo-Json -Compress\""
            si = subprocess.STARTUPINFO()
            si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            raw_out = subprocess.check_output(ps_cmd, shell=True, stderr=subprocess.DEVNULL, startupinfo=si, creationflags=0x08000000).decode(errors="ignore").strip()
            
            if not raw_out:
                return []
                
            import json
            return self._parse_usb_devices(json.loads(raw_out))
        except Exception:
            return []

    # SMBIOS Memory Type code to human-readable DDR string mapping
    _SMBIOS_MEM_TYPE_MAP = {
        1: "Other", 2: "DRAM", 3: "Synchronous DRAM",
        4: "Cache DRAM", 5: "EDO", 6: "EDRAM", 7: "VRAM",
        8: "SRAM", 9: "RAM", 10: "ROM", 11: "Flash",
        12: "EEPROM", 13: "FEPROM", 14: "EPROM", 15: "CDRAM",
        16: "3DRAM", 17: "SDRAM", 18: "SGRAM",
        20: "DDR", 21: "DDR2", 22: "DDR2 FB-DIMM",
        24: "DDR3", 26: "DDR4", 30: "LPDDR4",
        34: "DDR5", 35: "LPDDR5",
    }

    def _parse_ram_details(self, data):
        if not data:
            return []
        if isinstance(data, dict):
            data = [data]
            
        ram_sticks = []
        for item in data:
            capacity_bytes = item.get("Capacity", 0)
            cap_gb = round(capacity_bytes / (1024 ** 3)) if capacity_bytes else 0
            speed = item.get("Speed", 0)
            manufacturer = item.get("Manufacturer", "Generic").strip()
            part_num = item.get("PartNumber", "---").strip()
            locator = item.get("DeviceLocator", "Slot").strip()
            voltage = item.get("ConfiguredVoltage", 0)
            smbios_type = item.get("SMBIOSMemoryType", 0)
            
            # Resolve SMBIOS memory type code to DDR string
            mem_type = self._SMBIOS_MEM_TYPE_MAP.get(smbios_type, "Unknown")
            if mem_type == "Unknown" and speed:
                if speed >= 4800:
                    mem_type = "DDR5"
                elif speed >= 2133:
                    mem_type = "DDR4"
                elif speed >= 800:
                    mem_type = "DDR3"
            
            # Format voltage
            voltage_str = "---"
            if voltage:
                if voltage > 100: # millivolts
                    voltage_str = f"{voltage / 1000:.2f}V"
                else:
                    voltage_str = f"{voltage:.2f}V"
            
            ram_sticks.append({
                "slot": locator,
                "size": f"{cap_gb} GB" if cap_gb else "Unknown",
                "type": mem_type,
                "speed": f"{speed} MHz" if speed else "---",
                "manufacturer": manufacturer if manufacturer else "Generic",
                "partNumber": part_num if part_num else "---",
                "voltage": voltage_str
            })
        return ram_sticks

    def _get_ram_details(self):
        if platform.system() != "Windows":
            return []
        try:
            import json
            ps_cmd = 'powershell -Command "Get-CimInstance Win32_PhysicalMemory | Select-Object DeviceLocator, Capacity, Speed, Manufacturer, PartNumber, ConfiguredVoltage, SMBIOSMemoryType | ConvertTo-Json -Compress"'
            si = subprocess.STARTUPINFO()
            si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            raw_out = subprocess.check_output(ps_cmd, shell=True, stderr=subprocess.DEVNULL, startupinfo=si, creationflags=0x08000000).decode(errors="ignore").strip()
            
            if not raw_out:
                return []
                
            return self._parse_ram_details(json.loads(raw_out))
        except Exception:
            return []

    def _parse_storage_details(self, disk_data, partitions, pagefiles):
        if not disk_data:
            return []
        if isinstance(disk_data, dict):
            disk_data = [disk_data]
            
        if isinstance(partitions, dict):
            partitions = [partitions]
        elif not partitions:
            partitions = []
            
        pf_drives = set()
        if pagefiles:
            if isinstance(pagefiles, dict):
                pagefiles = [pagefiles]
            for pf in pagefiles:
                name = pf.get("Name", "")
                if name and ":" in name:
                    pf_drives.add(name.split(":")[0].upper())
                    
        disks = []
        for item in disk_data:
            disk_num = item.get("Number", 0)
            size_bytes = item.get("Size", 0)
            size_gb = round(size_bytes / (1024 ** 3)) if size_bytes else 0
            name = item.get("FriendlyName", "Unknown Drive").strip()
            media_type = item.get("MediaType", "SSD")
            bus_type = item.get("BusType", "SATA")
            
            # Find drive letters associated with this physical disk
            drive_letters = []
            disk_is_system = item.get("IsSystem", False)
            disk_is_boot = item.get("IsBoot", False)
            
            for part in partitions:
                if part.get("DiskNumber") == disk_num:
                    letter = part.get("DriveLetter")
                    if letter:
                        drive_letters.append(f"{letter}:")
                        if part.get("IsSystem"):
                            disk_is_system = True
                        if part.get("IsBoot"):
                            disk_is_boot = True
            
            # Determine paging file presence
            has_pagefile = False
            for letter in drive_letters:
                clean_letter = letter.replace(":", "").upper()
                if clean_letter in pf_drives:
                    has_pagefile = True
                    break
            
            # Format partitions string (e.g. "C: E: D:")
            partitions_str = " ".join(drive_letters) if drive_letters else "---"
            
            # Format media type and bus type nicely
            media_type_str = "SSD"
            if isinstance(media_type, int):
                if media_type == 4:
                    media_type_str = "HDD"
            elif isinstance(media_type, str):
                if media_type.upper() == "HDD":
                    media_type_str = "HDD"
                    
            bus_type_str = "SATA"
            if isinstance(bus_type, int):
                if bus_type == 17:
                    bus_type_str = "NVMe"
            elif isinstance(bus_type, str):
                bus_type_str = bus_type
                
            # Intelligent Hardware Signature Lookup & Spec Generation
            name_upper = name.upper()
            generation = "SATA III (6 Gb/s)"
            form_factor = "2.5\" SSD Bay"
            read_speed = "560 MB/s"
            write_speed = "520 MB/s"
            
            if media_type_str == "HDD":
                generation = "SATA III (3 Gb/s)"
                form_factor = "3.5\" HDD Bay"
                read_speed = "150 MB/s"
                write_speed = "140 MB/s"
            elif bus_type_str.upper() == "NVME" or "NVME" in name_upper:
                form_factor = "M.2 (2280) Slot"
                if any(x in name_upper for x in ["T700", "T705", "GEN5", "MP700", "APEX5"]):
                    generation = "PCIe Gen 5.0 x4"
                    read_speed = "12,400 MB/s"
                    write_speed = "11,800 MB/s"
                elif any(x in name_upper for x in ["990 PRO", "980 PRO", "PM9A1", "MZVL2", "SN850X", "SN850", "KC3000", "RENEGADE", "P5 PLUS", "MP600 PRO", "S70 BLADE", "GAMMIX S70"]):
                    generation = "PCIe Gen 4.0 x4"
                    read_speed = "7,000 MB/s"
                    write_speed = "5,100 MB/s"
                elif any(x in name_upper for x in ["SN770", "SN580", "T500", "P3 PLUS", "NV2", "MP600 CORE"]):
                    generation = "PCIe Gen 4.0 x4"
                    read_speed = "5,000 MB/s"
                    write_speed = "4,200 MB/s"
                elif any(x in name_upper for x in ["970 EVO", "970 PRO", "960 EVO", "MZVLB", "PM981", "SN750", "SN570", "SN550", "P5", "P3", "P2", "ROCKET", "SX8200", "MP510"]):
                    generation = "PCIe Gen 3.0 x4"
                    read_speed = "3,500 MB/s"
                    write_speed = "3,000 MB/s"
                else:
                    generation = "PCIe Gen 4.0 x4"
                    read_speed = "5,000 MB/s"
                    write_speed = "4,200 MB/s"
            
            disks.append({
                "number": disk_num,
                "name": name,
                "type": media_type_str,
                "interface": bus_type_str if bus_type_str else "SATA",
                "size": f"{size_gb} GB" if size_gb < 1000 else f"{round(size_gb / 1024, 2)} TB",
                "serialNumber": item.get("SerialNumber", "---").strip(),
                "generation": generation,
                "formFactor": form_factor,
                "readSpeed": read_speed,
                "writeSpeed": write_speed,
                "partitions": partitions_str,
                "systemDisk": "Yes" if disk_is_system or disk_is_boot or disk_num == 0 else "No",
                "pageFile": "Yes" if has_pagefile or (disk_is_system and len(pf_drives) > 0) else "No"
            })
        return disks

    def _get_storage_details(self):
        if platform.system() != "Windows":
            return []
        try:
            import json
            # Get physical disks from Get-Disk (has Number, FriendlyName, SerialNumber, MediaType, BusType, Size, IsSystem, IsBoot)
            ps_cmd = 'powershell -Command "Get-Disk | Select-Object Number, FriendlyName, MediaType, BusType, Size, SerialNumber, IsSystem, IsBoot | ConvertTo-Json -Compress"'
            si = subprocess.STARTUPINFO()
            si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            raw_out = subprocess.check_output(ps_cmd, shell=True, stderr=subprocess.DEVNULL, startupinfo=si, creationflags=0x08000000).decode(errors="ignore").strip()
            
            if not raw_out:
                return []
                
            disk_data = json.loads(raw_out)
            
            # Get partition drive letter mapping
            part_cmd = 'powershell -Command "Get-Partition | Where-Object { $_.DriveLetter } | Select-Object DiskNumber, DriveLetter, IsSystem, IsBoot | ConvertTo-Json -Compress"'
            part_raw = subprocess.check_output(part_cmd, shell=True, stderr=subprocess.DEVNULL, startupinfo=si, creationflags=0x08000000).decode(errors="ignore").strip()
            partitions = []
            if part_raw:
                partitions = json.loads(part_raw)
                    
            # Get Pagefile locations to map paging file drives
            pf_cmd = 'powershell -Command "Get-CimInstance Win32_PageFileUsage | Select-Object Name | ConvertTo-Json -Compress"'
            pf_raw = subprocess.check_output(pf_cmd, shell=True, stderr=subprocess.DEVNULL, startupinfo=si, creationflags=0x08000000).decode(errors="ignore").strip()
            pagefiles = []
            if pf_raw:
                pagefiles = json.loads(pf_raw)
                
            return self._parse_storage_details(disk_data, partitions, pagefiles)
        except Exception as e:
            logger.error(f"Error getting storage details: {e}")
            return []

    def _get_consolidated_windows_specs(self):
        """Query all Windows specs in a single PowerShell command to prevent CPU core/thread spikes and lag on startup."""
        if platform.system() != "Windows":
            return None
        try:
            import json
            import subprocess
            
            ps_cmd = (
                'powershell -NoProfile -Command "'
                '$disks = Get-Disk | Select-Object Number, FriendlyName, MediaType, BusType, Size, SerialNumber, IsSystem, IsBoot; '
                '$partitions = Get-Partition | Where-Object { $_.DriveLetter } | Select-Object DiskNumber, DriveLetter, IsSystem, IsBoot; '
                '$pagefiles = Get-CimInstance Win32_PageFileUsage -ErrorAction SilentlyContinue | Select-Object Name; '
                '$ram = Get-CimInstance Win32_PhysicalMemory -ErrorAction SilentlyContinue | Select-Object DeviceLocator, Capacity, Speed, Manufacturer, PartNumber, ConfiguredVoltage, SMBIOSMemoryType; '
                '$usb = Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object { $_.Class -match \'Mouse|Keyboard|USB|HIDClass\' -and $_.FriendlyName -notmatch \'Hub|Controller|Root|Generic|Enumerator|Host\' } | Select-Object FriendlyName, Status; '
                '@{disks=$disks; partitions=$partitions; pagefiles=$pagefiles; ram=$ram; usb=$usb} | ConvertTo-Json -Compress"'
            )
            si = subprocess.STARTUPINFO()
            si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            raw_out = subprocess.check_output(ps_cmd, shell=True, stderr=subprocess.DEVNULL, startupinfo=si, creationflags=0x08000000).decode(errors="ignore").strip()
            if raw_out:
                return json.loads(raw_out)
        except Exception as e:
            logger.warning(f"Consolidated Windows spec query failed: {e}. Falling back.")
        return None

    def _detect_oem_software(self, manufacturer="", model="", gpus=None):
        """Detects OEM gaming software suites (OMEN, Armoury Crate, Lenovo Vantage, AWCC, MSI, etc.) and GPU vendor tools."""
        if gpus is None:
            gpus = []

        protocols = set()
        if platform.system() == "Windows":
            try:
                import winreg
                for root in [winreg.HKEY_CURRENT_USER, winreg.HKEY_LOCAL_MACHINE]:
                    try:
                        with winreg.OpenKey(root, r"Software\Classes") as k:
                            n_sub, _, _ = winreg.QueryInfoKey(k)
                            for i in range(n_sub):
                                sub = winreg.EnumKey(k, i)
                                try:
                                    with winreg.OpenKey(k, sub) as sk:
                                        winreg.QueryValueEx(sk, "URL Protocol")
                                        protocols.add(sub.lower())
                                except Exception:
                                    pass
                    except Exception:
                        pass
            except Exception as e:
                logger.debug(f"Protocol enumeration error: {e}")

        known_suites = [
            {
                "id": "hp_omen",
                "name": "HP OMEN Gaming Hub",
                "brand": "HP",
                "category": "oem_suite",
                "protocol": "omencommandcenter:",
                "protocols": ["omencommandcenter", "omenapplication", "omen"],
                "reg_keys": [r"Software\HP\OMEN Gaming Hub"],
                "modes": {
                    "discrete": "OMEN Discrete Mode",
                    "hybrid": "OMEN Hybrid Mode",
                    "igpu_only": "OMEN Eco Mode",
                    "auto": "OMEN Auto Switch"
                }
            },
            {
                "id": "asus_armoury_crate",
                "name": "ASUS Armoury Crate",
                "brand": "ASUS",
                "category": "oem_suite",
                "protocol": "armoury-crate:",
                "protocols": ["armoury-crate", "asus-armourycrate", "armourycrate"],
                "reg_keys": [r"Software\ASUS\Armoury Crate"],
                "modes": {
                    "discrete": "Ultimate Mode (Direct MUX)",
                    "hybrid": "Standard Mode (Optimus)",
                    "igpu_only": "Eco Mode (dGPU Off)",
                    "auto": "Optimized Mode"
                }
            },
            {
                "id": "asus_ghelper",
                "name": "G-Helper",
                "brand": "ASUS",
                "category": "oem_suite",
                "protocol": "ghelper:",
                "protocols": ["ghelper"],
                "reg_keys": [],
                "modes": {
                    "discrete": "Ultimate (dGPU Direct)",
                    "hybrid": "Standard (Hybrid)",
                    "igpu_only": "Eco (iGPU Only)",
                    "auto": "Optimized (Auto)"
                }
            },
            {
                "id": "lenovo_vantage",
                "name": "Lenovo Vantage / Legion Zone",
                "brand": "Lenovo",
                "category": "oem_suite",
                "protocol": "lenovovantage:",
                "protocols": ["lenovovantage", "vantage", "lenovolegion"],
                "reg_keys": [r"Software\Lenovo\Vantage"],
                "modes": {
                    "discrete": "dGPU Mode (Discrete Only)",
                    "hybrid": "Hybrid Mode (Dynamic)",
                    "igpu_only": "Hybrid-iGPU Mode (Eco)",
                    "auto": "Hybrid-Auto Mode"
                }
            },
            {
                "id": "lenovo_legion_toolkit",
                "name": "Lenovo Legion Toolkit",
                "brand": "Lenovo",
                "category": "oem_suite",
                "protocol": "legiontoolkit:",
                "protocols": ["legiontoolkit"],
                "reg_keys": [],
                "modes": {
                    "discrete": "dGPU Mode",
                    "hybrid": "Hybrid Mode",
                    "igpu_only": "Hybrid-iGPU Mode",
                    "auto": "Hybrid-Auto Mode"
                }
            },
            {
                "id": "alienware_awcc",
                "name": "Alienware Command Center",
                "brand": "Alienware",
                "category": "oem_suite",
                "protocol": "awcc:",
                "protocols": ["awcc", "alienware-command-center"],
                "reg_keys": [r"Software\Alienware\Alienware Command Center"],
                "modes": {
                    "discrete": "Direct dGPU Display Mode",
                    "hybrid": "NVIDIA Advanced Optimus",
                    "igpu_only": "Integrated Graphics Only",
                    "auto": "Dynamic Display Switching (DDS)"
                }
            },
            {
                "id": "msi_center",
                "name": "MSI Center",
                "brand": "MSI",
                "category": "oem_suite",
                "protocol": "msi-center:",
                "protocols": ["msi-center", "dragon-center", "msicenter"],
                "reg_keys": [r"Software\MSI\MSI Center"],
                "modes": {
                    "discrete": "Discrete Graphics Mode",
                    "hybrid": "MSHybrid Graphics Mode",
                    "igpu_only": "Integrated Graphics Mode",
                    "auto": "Auto MSHybrid"
                }
            },
            {
                "id": "acer_predator_sense",
                "name": "Acer PredatorSense",
                "brand": "Acer",
                "category": "oem_suite",
                "protocol": "predatorsense:",
                "protocols": ["predatorsense", "nitrosense"],
                "reg_keys": [r"Software\Acer\PredatorSense", r"Software\Acer\NitroSense"],
                "modes": {
                    "discrete": "Discrete GPU Only",
                    "hybrid": "Optimus Mode",
                    "igpu_only": "Integrated Only",
                    "auto": "Dynamic Switching"
                }
            },
            {
                "id": "razer_synapse",
                "name": "Razer Synapse",
                "brand": "Razer",
                "category": "oem_suite",
                "protocol": "razer:",
                "protocols": ["razer", "synapse"],
                "reg_keys": [r"Software\Razer\Synapse3"],
                "modes": {
                    "discrete": "Dedicated GPU Only",
                    "hybrid": "NVIDIA Optimus",
                    "igpu_only": "Integrated Only",
                    "auto": "Dynamic Display"
                }
            },
            {
                "id": "gigabyte_gcc",
                "name": "Gigabyte Control Center",
                "brand": "Gigabyte",
                "category": "oem_suite",
                "protocol": "gcc:",
                "protocols": ["gcc", "gigabytecontrolcenter", "aorus"],
                "reg_keys": [r"Software\GIGABYTE\GigabyteControlCenter"],
                "modes": {
                    "discrete": "dGPU Direct Mode",
                    "hybrid": "Dynamic Switch (Optimus)",
                    "igpu_only": "iGPU Only Mode",
                    "auto": "Smart Switch"
                }
            },
            {
                "id": "nvidia_app",
                "name": "NVIDIA App",
                "brand": "NVIDIA",
                "category": "gpu_vendor",
                "protocol": "nvidiaapp:",
                "protocols": ["nvidiaapp", "nvidia"],
                "reg_keys": [r"Software\NVIDIA Corporation\Global\NVTweak"],
                "modes": {
                    "discrete": "NVIDIA GPU Only (Direct MUX)",
                    "hybrid": "Optimus (Standard Display)",
                    "igpu_only": "Integrated Graphics",
                    "auto": "Automatic Select (Advanced Optimus)"
                }
            },
            {
                "id": "amd_adrenalin",
                "name": "AMD Software: Adrenalin Edition",
                "brand": "AMD",
                "category": "gpu_vendor",
                "protocol": "amd:",
                "protocols": ["amd", "amdradeon"],
                "reg_keys": [r"Software\AMD\CN"],
                "modes": {
                    "discrete": "Discrete GPU Direct",
                    "hybrid": "AMD SmartAccess Graphics",
                    "igpu_only": "Power Saving iGPU",
                    "auto": "Dynamic Switchable Graphics"
                }
            },
            {
                "id": "intel_gcc",
                "name": "Intel Graphics Command Center",
                "brand": "Intel",
                "category": "gpu_vendor",
                "protocol": "igcc:",
                "protocols": ["igcc", "arc-control"],
                "reg_keys": [r"Software\Intel\IGCC"],
                "modes": {
                    "discrete": "Direct Arc Display Link",
                    "hybrid": "Hybrid Display Buffer",
                    "igpu_only": "Intel UHD / Iris Xe Only",
                    "auto": "Dynamic Switch"
                }
            }
        ]

        installed_suites = []
        if platform.system() == "Windows":
            try:
                import winreg
                for suite in known_suites:
                    is_installed = False
                    active_protocol = suite["protocol"]
                    for p in suite["protocols"]:
                        if p in protocols:
                            is_installed = True
                            active_protocol = f"{p}:"
                            break

                    if not is_installed:
                        for rk in suite["reg_keys"]:
                            for root in [winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER]:
                                try:
                                    with winreg.OpenKey(root, rk):
                                        is_installed = True
                                        break
                                except Exception:
                                    pass
                            if is_installed:
                                break

                    if is_installed:
                        suite_copy = {
                            "id": suite["id"],
                            "name": suite["name"],
                            "brand": suite["brand"],
                            "category": suite["category"],
                            "protocol": active_protocol,
                            "modes": suite.get("modes", {})
                        }
                        installed_suites.append(suite_copy)
            except Exception as e:
                logger.debug(f"OEM suite inspection error: {e}")

        # Pick primary OEM suite matching PC manufacturer
        mfg_upper = (manufacturer or "").upper()
        primary_oem = None

        # 1. Match hardware manufacturer
        for s in installed_suites:
            if s["category"] == "oem_suite" and s["brand"].upper() in mfg_upper:
                primary_oem = s
                break

        # 2. If no suite matched the manufacturer, but manufacturer is a known laptop brand,
        # do not let a different OEM brand's suite hijack this laptop's profile
        known_laptop_brands = ["ASUS", "ASUSTEK", "LENOVO", "HP", "HEWLETT-PACKARD", "DELL", "ALIENWARE", "MSI", "MICRO-STAR", "ACER", "RAZER", "GIGABYTE"]
        has_known_mfg = any(b in mfg_upper for b in known_laptop_brands)

        # 3. Only fallback to another installed OEM suite if manufacturer is generic (e.g. custom desktop)
        if not primary_oem and not has_known_mfg:
            for s in installed_suites:
                if s["category"] == "oem_suite":
                    primary_oem = s
                    break

        # 4. Fallback to GPU vendor suite (NVIDIA App, AMD Adrenalin, Intel GCC)
        if not primary_oem:
            for s in installed_suites:
                if s["category"] == "gpu_vendor":
                    primary_oem = s
                    break

        # Brand vocabulary for GPU working modes
        brand_vocabulary = {
            "discrete": "Discrete Direct (Direct MUX Link)",
            "hybrid": "Hybrid Optimus (PCIe Buffer)",
            "igpu_only": "iGPU Eco Mode (Power Saving)",
            "auto": "Dynamic Auto Switching"
        }

        if primary_oem and primary_oem.get("modes") and primary_oem.get("brand", "").upper() in mfg_upper:
            brand_vocabulary = primary_oem["modes"]
        elif "ASUS" in mfg_upper:
            brand_vocabulary = {
                "discrete": "Ultimate Mode (Direct MUX Link)",
                "hybrid": "Standard Mode (Optimus PCIe Buffer)",
                "igpu_only": "Eco Mode (dGPU Powered Down)",
                "auto": "Optimized Mode (Smart Dynamic)"
            }
        elif "LENOVO" in mfg_upper:
            brand_vocabulary = {
                "discrete": "dGPU Mode (Discrete Only)",
                "hybrid": "Hybrid Mode (Dynamic Optimus)",
                "igpu_only": "Hybrid-iGPU Mode (Eco)",
                "auto": "Hybrid-Auto Mode"
            }
        elif "HP" in mfg_upper:
            brand_vocabulary = {
                "discrete": "OMEN Discrete Mode",
                "hybrid": "OMEN Hybrid Mode",
                "igpu_only": "OMEN Eco Mode",
                "auto": "OMEN Auto Switch"
            }
        elif "MSI" in mfg_upper or "MICRO-STAR" in mfg_upper:
            brand_vocabulary = {
                "discrete": "Discrete Graphics Mode (MUX Direct)",
                "hybrid": "MSHybrid Graphics Mode (Optimus)",
                "igpu_only": "Integrated Graphics Mode",
                "auto": "Auto MSHybrid"
            }
        elif "DELL" in mfg_upper or "ALIENWARE" in mfg_upper:
            brand_vocabulary = {
                "discrete": "Direct dGPU Display Mode",
                "hybrid": "NVIDIA Advanced Optimus",
                "igpu_only": "Integrated Graphics Only",
                "auto": "Dynamic Display Switching (DDS)"
            }
        elif "ACER" in mfg_upper:
            brand_vocabulary = {
                "discrete": "Discrete GPU Only",
                "hybrid": "Optimus Mode",
                "igpu_only": "Integrated Only",
                "auto": "Dynamic Switching"
            }
        elif "RAZER" in mfg_upper:
            brand_vocabulary = {
                "discrete": "Dedicated GPU Only",
                "hybrid": "NVIDIA Optimus",
                "igpu_only": "Integrated Only",
                "auto": "Dynamic Display"
            }
        elif "GIGABYTE" in mfg_upper:
            brand_vocabulary = {
                "discrete": "dGPU Direct Mode",
                "hybrid": "Dynamic Switch (Optimus)",
                "igpu_only": "iGPU Only Mode",
                "auto": "Smart Switch"
            }
        elif primary_oem and primary_oem.get("modes"):
            brand_vocabulary = primary_oem["modes"]

        return primary_oem, installed_suites, brand_vocabulary

    def _get_gpu_architecture_and_mux(self, manufacturer="", model=""):
        """Discovers discrete and integrated GPUs, active display routing, and MUX switch capability."""
        if platform.system() != "Windows":
            return [], {
                "has_mux": False,
                "current_mode": "auto",
                "user_preferred_mode": self.config.get("gpu_working_mode", "auto"),
                "display_routing": "Standard Display Pipeline",
                "latency_mode": "standard_hybrid",
                "active_display_gpu": "Default Display",
                "dgpu_name": "",
                "igpu_name": "",
                "supports_advanced_optimus": False,
                "form_factor": "desktop",
                "architecture_type": "desktop_direct",
                "primary_oem": None,
                "installed_oem_suites": [],
                "brand_vocabulary": {}
            }

        # 1. Enumerate active display attachments via EnumDisplayDevicesW
        active_displays_by_gpu = {}
        primary_display_gpu = ""
        try:
            import ctypes
            from ctypes import wintypes

            class DISPLAY_DEVICEW(ctypes.Structure):
                _fields_ = [
                    ('cb', wintypes.DWORD),
                    ('DeviceName', ctypes.c_wchar * 32),
                    ('DeviceString', ctypes.c_wchar * 128),
                    ('StateFlags', wintypes.DWORD),
                    ('DeviceID', ctypes.c_wchar * 128),
                    ('DeviceKey', ctypes.c_wchar * 128),
                ]

            DISPLAY_DEVICE_ATTACHED_TO_DESKTOP = 0x00000001
            DISPLAY_DEVICE_PRIMARY_DEVICE      = 0x00000004

            idx = 0
            while True:
                dev = DISPLAY_DEVICEW()
                dev.cb = ctypes.sizeof(DISPLAY_DEVICEW)
                if not ctypes.windll.user32.EnumDisplayDevicesW(None, idx, ctypes.byref(dev), 0):
                    break
                attached = bool(dev.StateFlags & DISPLAY_DEVICE_ATTACHED_TO_DESKTOP)
                primary = bool(dev.StateFlags & DISPLAY_DEVICE_PRIMARY_DEVICE)
                gpu_str = dev.DeviceString.strip()
                if attached and gpu_str:
                    active_displays_by_gpu.setdefault(gpu_str, []).append({
                        "display": dev.DeviceName,
                        "primary": primary
                    })
                    if primary:
                        primary_display_gpu = gpu_str
                idx += 1
        except Exception as e:
            logger.debug(f"EnumDisplayDevicesW error: {e}")

        # 2. Enumerate installed video controllers via Windows Registry
        def parse_vram(val):
            if isinstance(val, bytes):
                return int.from_bytes(val, 'little')
            elif isinstance(val, int):
                return val
            return 0

        gpus = []
        key_path = r"SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}"
        try:
            import winreg
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path) as base_key:
                i = 0
                while True:
                    try:
                        sub_name = winreg.EnumKey(base_key, i)
                        i += 1
                        if not sub_name.isdigit():
                            continue
                        with winreg.OpenKey(base_key, sub_name) as sub_key:
                            try:
                                desc, _ = winreg.QueryValueEx(sub_key, "DriverDesc")
                                mfg = "Unknown"
                                ver = "---"
                                try:
                                    mfg, _ = winreg.QueryValueEx(sub_key, "ProviderName")
                                except Exception:
                                    pass
                                try:
                                    ver, _ = winreg.QueryValueEx(sub_key, "DriverVersion")
                                except Exception:
                                    pass

                                vram = 0
                                for vk in ["HardwareInformation.qwMemorySize", "HardwareInformation.MemorySize"]:
                                    try:
                                        vram_raw, _ = winreg.QueryValueEx(sub_key, vk)
                                        vram = parse_vram(vram_raw)
                                        if vram > 0:
                                            break
                                    except Exception:
                                        pass

                                desc_lower = desc.lower()
                                mfg_lower = mfg.lower()

                                # Categorize vendor
                                if "nvidia" in desc_lower or "nvidia" in mfg_lower:
                                    vendor = "NVIDIA"
                                elif "intel" in desc_lower or "intel" in mfg_lower:
                                    vendor = "Intel"
                                elif "amd" in desc_lower or "ati" in desc_lower or "advanced micro devices" in mfg_lower or "amd" in mfg_lower:
                                    vendor = "AMD"
                                else:
                                    vendor = "Other"

                                # Categorize discrete vs integrated
                                is_integrated = (
                                    "uhd" in desc_lower or "iris" in desc_lower or "hd graphics" in desc_lower or
                                    "vega" in desc_lower or ("radeon(tm) graphics" in desc_lower and vram < 4 * (1024**3)) or
                                    (vendor == "Intel" and "arc" not in desc_lower)
                                )
                                gpu_type = "integrated" if is_integrated else "discrete"

                                # Check active display attachment
                                attached_list = active_displays_by_gpu.get(desc, [])
                                is_display_active = len(attached_list) > 0
                                is_primary = any(d.get("primary") for d in attached_list) or (desc == primary_display_gpu)

                                gpus.append({
                                    "index": sub_name,
                                    "name": desc,
                                    "vendor": vendor,
                                    "type": gpu_type,
                                    "driver_version": ver,
                                    "vram_mb": round(vram / (1024**2)),
                                    "vram_gb": round(vram / (1024**3), 1),
                                    "is_primary": is_primary,
                                    "is_display_active": is_display_active,
                                    "active_displays": [d["display"] for d in attached_list]
                                })
                            except Exception:
                                pass
                    except OSError:
                        break
        except Exception as e:
            logger.debug(f"Registry GPU query error: {e}")

        # 3. Compute MUX Switch and Display Routing
        dgpus = [g for g in gpus if g.get("type") == "discrete"]
        igpus = [g for g in gpus if g.get("type") == "integrated"]

        dgpu_name = dgpus[0]["name"] if dgpus else ""
        igpu_name = igpus[0]["name"] if igpus else ""
        has_mux = (len(dgpus) > 0 and len(igpus) > 0)

        # 3. Determine form factor and architecture topology
        is_battery = False
        if _PSUTIL_AVAILABLE:
            try:
                is_battery = (psutil.sensors_battery() is not None)
            except Exception:
                pass

        model_lower = (model or "").lower()
        is_handheld = any(kw in model_lower for kw in ["ally", "legion go", "steam deck", "claw", "ayaneo", "gpd", "onexplayer", "aokzoe"])

        current_mode = "auto"
        display_routing = "Internal Display"
        latency_mode = "standard_hybrid"
        active_display_gpu = primary_display_gpu or (igpus[0]["name"] if igpus else (dgpus[0]["name"] if dgpus else "Default"))

        if is_handheld:
            form_factor = "handheld_apu"
            architecture_type = "apu_unified"
            latency_mode = "zero_latency_direct"
            display_routing = f"Internal Display -> {igpu_name or (dgpus[0]['name'] if dgpus else 'SoC APU')} (Unified UMA Architecture)"
            current_mode = "auto"
        elif not is_battery:
            form_factor = "desktop"
            if dgpus:
                architecture_type = "desktop_direct"
                latency_mode = "zero_latency_direct"
                display_routing = f"Dedicated DisplayPort / HDMI -> {dgpu_name} (Direct PCIe Video Bus)"
                current_mode = "discrete"
            else:
                architecture_type = "integrated_only"
                display_routing = f"Motherboard Video Output -> {igpu_name or 'Integrated GPU'}"
                current_mode = "igpu_only"
        else:
            form_factor = "laptop"
            if has_mux:
                architecture_type = "hybrid_mux"
                dgpu_active = any(g.get("is_display_active") for g in dgpus)
                igpu_active = any(g.get("is_display_active") for g in igpus)

                if dgpu_active and not igpu_active:
                    current_mode = "discrete"
                    display_routing = f"Internal Panel -> {dgpu_name} (Direct MUX Link)"
                    latency_mode = "zero_latency_direct"
                elif igpu_active:
                    current_mode = "hybrid"
                    display_routing = f"Internal Panel -> {igpu_name} (Optimus PCIe pass-through buffer)"
                    latency_mode = "standard_hybrid"
                else:
                    current_mode = "hybrid"
                    display_routing = f"Internal Panel -> {igpu_name} (Hybrid Route)"
            elif dgpus and igpus:
                architecture_type = "hybrid_optimus"
                current_mode = "hybrid"
                display_routing = f"Internal Panel -> {igpu_name} (Optimus PCIe pass-through buffer)"
                latency_mode = "standard_hybrid"
            elif dgpus:
                architecture_type = "desktop_direct"
                current_mode = "discrete"
                display_routing = f"Display -> {dgpu_name} (Direct Video Bus)"
                latency_mode = "zero_latency_direct"
            else:
                architecture_type = "integrated_only"
                current_mode = "igpu_only"
                fallback_name = igpu_name or "Integrated GPU"
                display_routing = f"Display -> {fallback_name} (Direct Video Bus)"

        user_pref = self.config.get("gpu_working_mode") or current_mode

        # 4. Detect OEM gaming software suites & brand vocabulary
        primary_oem, installed_suites, brand_vocabulary = self._detect_oem_software(
            manufacturer=manufacturer,
            model=model,
            gpus=gpus
        )

        mux_switch = {
            "has_mux": has_mux,
            "current_mode": current_mode,
            "user_preferred_mode": user_pref,
            "display_routing": display_routing,
            "latency_mode": latency_mode,
            "active_display_gpu": active_display_gpu,
            "dgpu_name": dgpu_name,
            "igpu_name": igpu_name,
            "supports_advanced_optimus": has_mux,
            "form_factor": form_factor,
            "architecture_type": architecture_type,
            "primary_oem": primary_oem,
            "installed_oem_suites": installed_suites,
            "brand_vocabulary": brand_vocabulary
        }

        return gpus, mux_switch

    def get_basic_specs(self):
        """Fetches basic hardware specs synchronously and instantly (under 10ms)."""
        ram_gb = 0
        if _PSUTIL_AVAILABLE:
            ram_gb = round(psutil.virtual_memory().total / (1024 ** 3), 0)
        
        cpu_name = ""
        if platform.system() == "Windows":
            try:
                import winreg
                key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
                cpu_name, _ = winreg.QueryValueEx(key, "ProcessorNameString")
                winreg.CloseKey(key)
                cpu_name = cpu_name.strip()
            except Exception:
                pass
        
        if not cpu_name:
            cpu_name = platform.processor() or "Unknown CPU"

        os_edition = platform.system() + " " + platform.release()
        device_specs = self._get_device_specs()
        mfg = (device_specs or {}).get("manufacturer", "")
        model_name = (device_specs or {}).get("model", "")
        gpus, mux_switch = self._get_gpu_architecture_and_mux(manufacturer=mfg, model=model_name)
        primary_gpu = "Detecting..."
        if gpus:
            dgpus = [g for g in gpus if g.get("type") == "discrete"]
            primary_gpu = dgpus[0]["name"] if dgpus else gpus[0]["name"]
        
        return {
            "device_specs": device_specs,
            "hardware": {
                "cpu": cpu_name,
                "cores": psutil.cpu_count(logical=False) if _PSUTIL_AVAILABLE else 0,
                "threads": psutil.cpu_count(logical=True) if _PSUTIL_AVAILABLE else 0,
                "gpu": primary_gpu,
                "gpus": gpus,
                "mux_switch": mux_switch,
                "ram": f"{int(ram_gb)}GB" if ram_gb else "---",
                "storage": "Detecting...",
                "ram_details": [],
                "storage_details": []
            },
            "gpus": gpus,
            "mux_switch": mux_switch,
            "network": None,
            "wifi": None,
            "os_details": {
                "edition": os_edition,
                "version": platform.version(),
                "architecture": platform.machine()
            },
            "vram_gb": 0,
            "displays": [],
            "peripherals": []
        }

    def get_system_specs(self):
        # Memory in GB
        ram_gb = 0
        if _PSUTIL_AVAILABLE:
            ram_gb = round(psutil.virtual_memory().total / (1024 ** 3), 0)
        
        # CPU Info
        cpu_name = ""
        if platform.system() == "Windows":
            try:
                import winreg
                key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
                cpu_name, _ = winreg.QueryValueEx(key, "ProcessorNameString")
                winreg.CloseKey(key)
                cpu_name = cpu_name.strip()
            except Exception:
                pass
        
        if not cpu_name:
            cpu_name = platform.processor()
            
        # Storage (Primary Drive) - Will be populated below using high-fidelity storage_details mapping
        storage_info = "Unknown"

        # Network Info
        network_info = None
        if _PSUTIL_AVAILABLE:
            try:
                addrs = psutil.net_if_addrs()
                stats = psutil.net_if_stats()
                for iface, iface_stats in stats.items():
                    if iface_stats.isup and not iface.startswith('Loopback'):
                        network_info = {
                            "name": iface,
                            "speed": f"{iface_stats.speed}Mbps" if iface_stats.speed > 0 else "Active"
                        }
                        break
            except: pass

        # CPU Cores/Threads
        cores = psutil.cpu_count(logical=False) if _PSUTIL_AVAILABLE else 0
        threads = psutil.cpu_count(logical=True) if _PSUTIL_AVAILABLE else 0
        
        gpu_name = self.gpu_caps.gpu_name
        vram_gb = round(self.gpu_caps.vram_mb / 1024, 1)
        
        # Fallback to WMI/CIM if Nvidia GPU not detected or returns Unknown (e.g. AMD/Intel setup)
        if (not gpu_name or gpu_name == "Unknown") and platform.system() == "Windows":
            try:
                import json
                ps_cmd = 'powershell -Command "Get-CimInstance Win32_VideoController | Select-Object Name, AdapterRAM | ConvertTo-Json -Compress"'
                si = subprocess.STARTUPINFO()
                si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                raw_out = subprocess.check_output(ps_cmd, shell=True, stderr=subprocess.DEVNULL, startupinfo=si, creationflags=0x08000000).decode(errors="ignore").strip()
                if raw_out:
                    data = json.loads(raw_out)
                    if isinstance(data, dict):
                        data = [data]
                    valid_gpus = [g for g in data if g.get("AdapterRAM")]
                    if valid_gpus:
                        main_gpu = max(valid_gpus, key=lambda g: g.get("AdapterRAM", 0))
                        gpu_name = main_gpu.get("Name", "Unknown GPU")
                        vram_bytes = main_gpu.get("AdapterRAM", 0)
                        if vram_bytes > 0:
                            vram_gb = round(vram_bytes / (1024 ** 3), 1)
            except Exception:
                pass

        # High-fidelity multi-GPU & MUX switch discovery
        current_device_specs = (self._cached_specs.get("device_specs") if self._cached_specs else None) or self._get_device_specs()
        mfg = (current_device_specs or {}).get("manufacturer", "")
        model_name = (current_device_specs or {}).get("model", "")
        gpus, mux_switch = self._get_gpu_architecture_and_mux(manufacturer=mfg, model=model_name)
        if gpus:
            dgpus = [g for g in gpus if g.get("type") == "discrete"]
            if not gpu_name or gpu_name == "Unknown":
                gpu_name = dgpus[0]["name"] if dgpus else gpus[0]["name"]
                if dgpus and dgpus[0].get("vram_gb"):
                    vram_gb = dgpus[0]["vram_gb"]
                elif gpus[0].get("vram_gb"):
                    vram_gb = gpus[0]["vram_gb"]
        
        wifi = self._get_wifi_details()  # Dynamic — always refresh (signal changes)

        # Static sections: only gather once and re-use from cache
        if not self._cached_specs:
            os_details = None
            peripherals = None
            displays = None
            ram_details = None
            storage_details = None
            
            # Attempt consolidated Windows spec query first
            consolidated = self._get_consolidated_windows_specs()
            if consolidated:
                try:
                    peripherals = self._parse_usb_devices(consolidated.get("usb"))
                    ram_details = self._parse_ram_details(consolidated.get("ram"))
                    storage_details = self._parse_storage_details(
                        consolidated.get("disks"),
                        consolidated.get("partitions"),
                        consolidated.get("pagefiles")
                    )
                    # os and display are extremely fast natively (under 1ms), run them sequentially
                    os_details = self._get_os_details()
                    displays = self._get_display_info()
                    logger.info("Static hardware specs discovered via consolidated Windows query.")
                except Exception as parse_err:
                    logger.warning(f"Failed parsing consolidated specs: {parse_err}. Falling back to individual queries.")
                    consolidated = None
                    
            if not consolidated:
                from concurrent.futures import ThreadPoolExecutor
                try:
                    with ThreadPoolExecutor(max_workers=5) as executor:
                        future_os = executor.submit(self._get_os_details)
                        future_peripherals = executor.submit(self._get_usb_devices)
                        future_displays = executor.submit(self._get_display_info)
                        future_ram = executor.submit(self._get_ram_details)
                        future_storage = executor.submit(self._get_storage_details)
                        
                        os_details = future_os.result()
                        peripherals = future_peripherals.result()
                        displays = future_displays.result()
                        ram_details = future_ram.result()
                        storage_details = future_storage.result()
                except Exception as e:
                    logger.warning(f"Concurrent hardware discovery failed: {e}. Falling back to sequential.")
                    os_details      = self._get_os_details()
                    peripherals     = self._get_usb_devices()
                    displays        = self._get_display_info()
                    ram_details     = self._get_ram_details()
                    storage_details = self._get_storage_details()

            device_specs = self._get_device_specs()

            self._cached_specs = {
                "os_details":      os_details,
                "device_specs":    device_specs,
                "peripherals":     peripherals,
                "displays":        displays,
                "ram_details":     ram_details,
                "storage_details": storage_details,
            }
            logger.info("Static hardware specs cached successfully.")
        else:
            os_details      = self._cached_specs["os_details"]
            device_specs    = self._cached_specs.get("device_specs") or self._get_device_specs()
            peripherals     = self._cached_specs["peripherals"]
            displays        = self._cached_specs["displays"]
            ram_details     = self._cached_specs["ram_details"]
            storage_details = self._cached_specs["storage_details"]
        
        # Determine high-fidelity storage info from storage details (detect partitions e.g. C: E: D:)
        try:
            if storage_details:
                # Find primary or system disk
                sys_disks = [d for d in storage_details if d.get("systemDisk") == "Yes"]
                primary_disk = sys_disks[0] if sys_disks else storage_details[0]
                
                parts = primary_disk.get("partitions", "")
                parts_str = f" ({parts})" if parts and parts != "---" else ""
                storage_info = f"{primary_disk.get('name', 'Disk')} {primary_disk.get('size')}{parts_str}"
        except Exception:
            pass

        if storage_info == "Unknown" and _PSUTIL_AVAILABLE:
            try:
                partitions = psutil.disk_partitions()
                for partition in partitions:
                    if partition.mountpoint == 'C:\\' or partition.mountpoint == '/':
                        usage = psutil.disk_usage(partition.mountpoint)
                        storage_info = f"{round(usage.total / (1024 ** 3), 0)}GB {partition.fstype}"
                        break
            except: pass

        gpu_caps_profile = self.gpu_profiler.profile_gpu(gpu_name, self.config)

        return {
            "device_specs": device_specs,
            "hardware": {
                "cpu": cpu_name,
                "cores": cores,
                "threads": threads,
                "gpu": gpu_name,
                "gpus": gpus,
                "mux_switch": mux_switch,
                "gpu_capabilities": gpu_caps_profile,
                "ram": f"{int(ram_gb)}GB",
                "storage": storage_info,
                "ram_details": ram_details,
                "storage_details": storage_details
            },
            "gpus": gpus,
            "mux_switch": mux_switch,
            "network": network_info,
            "wifi": wifi,
            "os_details": os_details,
            "vram_gb": vram_gb,
            "displays": displays,
            "peripherals": peripherals
        }



    def check_game_requirements(self, game_name, min_requirements):
        """
        min_requirements: dict like {"ram_gb": 16, "vram_gb": 8}
        """
        sys_specs = self.get_system_specs()
        
        os_details = sys_specs.get("os_details", {})
        os_name = os_details.get("edition", "Unknown OS")
        
        hardware = sys_specs.get("hardware", {})
        cpu_name = hardware.get("cpu", "Unknown CPU")
        cores = hardware.get("cores", 0)
        threads = hardware.get("threads", 0)
        gpu_name = hardware.get("gpu", "Unknown GPU")
        vram_gb = sys_specs.get("vram_gb", 0)
        
        ram_str = hardware.get("ram", "0GB")
        ram_gb = 0
        try:
            ram_gb = int(re.sub(r"[^\d]", "", ram_str))
        except Exception:
            pass
            
        report = []
        report.append(f"--- Hardware Check for {game_name} ---")
        report.append(f"OS: {os_name}")
        report.append(f"CPU: {cpu_name} ({cores} Cores / {threads} Threads)")
        report.append(f"GPU: {gpu_name} ({vram_gb} GB VRAM)")
        report.append(f"RAM: {ram_gb} GB")
        report.append("--------------------------------------")
        
        passed = True
        if ram_gb < min_requirements.get('ram_gb', 0):
            report.append(f"[FAIL] RAM: Needs {min_requirements['ram_gb']}GB, but you have {ram_gb}GB.")
            passed = False
        else:
            report.append(f"[PASS] RAM: Sufficient ({ram_gb}GB >= {min_requirements.get('ram_gb', 0)}GB)")
            
        if vram_gb < min_requirements.get('vram_gb', 0):
            report.append(f"[FAIL] VRAM: Needs {min_requirements['vram_gb']}GB, but you have {vram_gb}GB.")
            passed = False
        else:
            report.append(f"[PASS] VRAM: Sufficient ({vram_gb}GB >= {min_requirements.get('vram_gb', 0)}GB)")
            
        if passed:
            report.append(f"\n[SUCCESS] Your system meets the requirements for {game_name}!")
        else:
            report.append(f"\n[WARNING] Your system is below the minimum requirements. Expect performance issues.")
            
        return "\n".join(report)

if __name__ == "__main__":
    checker = HardwareChecker()
    example_reqs = {"ram_gb": 16, "vram_gb": 8}
    print(checker.check_game_requirements("Cyberpunk 2077", example_reqs))
