$ErrorActionPreference = 'Stop'
$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
$env:DEBUG = 'electron-builder'

$prepackaged = Get-ChildItem -Path "Gaming/frontend/out" -Directory -Filter "*-win32-x64" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $prepackaged) {
  throw "No prepackaged app folder found under Gaming/frontend/out. Contents: $(Get-ChildItem -Path 'Gaming/frontend/out' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name)"
}
Write-Host "Using prepackaged folder: $($prepackaged.FullName)"

# Explicitly synchronize the full backend distribution into the prepackaged resources directory
$backendDist = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../../Gaming/backend/dist/MissionControlBackend"))
$targetBackend = Join-Path $prepackaged.FullName "resources/MissionControlBackend"
if (Test-Path $backendDist) {
  Write-Host "Synchronizing full backend distribution to $targetBackend..."
  New-Item -ItemType Directory -Force -Path $targetBackend | Out-Null
  robocopy $backendDist $targetBackend /E /NFL /NDL /NJH /nc /ns /np | Out-Null
  if ($LASTEXITCODE -ge 8) {
    Write-Warning "robocopy backend to prepackaged returned exit code $LASTEXITCODE"
  }
}

Set-Location Gaming/frontend
npx electron-builder --prepackaged "$($prepackaged.FullName)" --win nsis msi zip --publish never
