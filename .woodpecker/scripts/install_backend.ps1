$ErrorActionPreference = 'Stop'

Set-Location "Gaming/backend"

# Strip GPU-only/native packages that can't be installed on the CI runner
$strip = @('ultralytics', 'tensorrt', 'cuda-python')
$content = Get-Content requirements.txt
foreach ($pkg in $strip) {
  $content = $content -replace "(?i)^$pkg(\s*#.*)?$", ''
}
$content | Set-Content requirements.txt

# Create isolated virtual environment
uv venv

# Install dependencies inside the venv
uv pip install --link-mode=copy pyinstaller
uv pip install --link-mode=copy -r requirements.txt
