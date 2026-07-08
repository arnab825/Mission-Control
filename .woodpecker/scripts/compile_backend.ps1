$ErrorActionPreference = 'Stop'

Set-Location "Gaming/backend"
.venv/Scripts/pyinstaller MissionControl.spec --distpath dist --workpath build --noconfirm
