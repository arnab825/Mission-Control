$ErrorActionPreference = 'Stop'

Write-Host "Compiling C# LibreHardwareMonitor telemetry helper..."
Push-Location "Gaming/backend/system/hardware_monitor"
dotnet build -c Release
Pop-Location

Set-Location "Gaming/backend"
.venv/Scripts/pyinstaller MissionControl.spec --distpath dist --workpath build --noconfirm

