$ErrorActionPreference = 'Stop'
$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
$env:DEBUG = 'electron-builder'

$prepackaged = Get-ChildItem -Path "Gaming/frontend/out" -Directory -Filter "*-win32-x64" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $prepackaged) {
  throw "No prepackaged app folder found under Gaming/frontend/out. Contents: $(Get-ChildItem -Path 'Gaming/frontend/out' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name)"
}
Write-Host "Using prepackaged folder: $($prepackaged.FullName)"

Set-Location Gaming/frontend
npx electron-builder --prepackaged "$($prepackaged.FullName)" --win nsis msi zip --publish never
