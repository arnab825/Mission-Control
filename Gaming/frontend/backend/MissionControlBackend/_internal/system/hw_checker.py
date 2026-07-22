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
                'powershell -Command "'
                '$disks = Get-Disk | Select-Object Number, FriendlyName, MediaType, BusType, Size, SerialNumber, IsSystem, IsBoot; '
                '$partitions = Get-Partition | Where-Object { $_.DriveLetter } | Select-Object DiskNumber, DriveLetter, IsSystem, IsBoot; '
                '$pagefiles = Get-CimInstance Win32_PageFileUsage | Select-Object Name; '
                '$ram = Get-CimInstance Win32_PhysicalMemory | Select-Object DeviceLocator, Capacity, Speed, Manufacturer, PartNumber, ConfiguredVoltage, SMBIOSMemoryType; '
                '$usb = Get-PnpDevice -PresentOnly | Where-Object { $_.Class -match \'Mouse|Keyboard|USB|HIDClass\' -and $_.FriendlyName -notmatch \'Hub|Controller|Root|Generic|Enumerator|Host\' } | Select-Object FriendlyName, Status; '
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
        
        return {
            "hardware": {
                "cpu": cpu_name,
                "cores": psutil.cpu_count(logical=False) if _PSUTIL_AVAILABLE else 0,
                "threads": psutil.cpu_count(logical=True) if _PSUTIL_AVAILABLE else 0,
                "gpu": "Detecting...",
                "ram": f"{int(ram_gb)}GB" if ram_gb else "---",
                "storage": "Detecting...",
                "ram_details": [],
                "storage_details": []
            },
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

            self._cached_specs = {
                "os_details":      os_details,
                "peripherals":     peripherals,
                "displays":        displays,
                "ram_details":     ram_details,
                "storage_details": storage_details,
            }
            logger.info("Static hardware specs cached successfully.")
        else:
            os_details      = self._cached_specs["os_details"]
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
            "hardware": {
                "cpu": cpu_name,
                "cores": cores,
                "threads": threads,
                "gpu": gpu_name,
                "gpu_capabilities": gpu_caps_profile,
                "ram": f"{int(ram_gb)}GB",
                "storage": storage_info,
                "ram_details": ram_details,
                "storage_details": storage_details
            },
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
