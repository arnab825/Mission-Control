$ErrorActionPreference = 'Stop'

$outDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../../Gaming/frontend/out/Mission Control-win32-x64"))

try {
  taskkill /f /im "Mission Control.exe" 2>&1 | Out-Null
  taskkill /f /im "MissionControlBackend.exe" 2>&1 | Out-Null
  taskkill /f /im "MissionControl.exe" 2>&1 | Out-Null
  taskkill /f /im "python.exe" 2>&1 | Out-Null
  taskkill /f /im "py.exe" 2>&1 | Out-Null
  taskkill /f /im "7za.exe" 2>&1 | Out-Null
} catch {}

if (Test-Path $outDir) {
  Write-Host "Cleaning up previous package output directory: $outDir..."
  $success = $false
  for ($i = 1; $i -le 5; $i++) {
    try {
      Remove-Item $outDir -Recurse -Force -ErrorAction Stop
      $success = $true
      break
    } catch {
      Write-Warning "Attempt $i to remove output folder failed: $_. Retrying in 1 second..."
      Start-Sleep -Seconds 1
    }
  }
  if (-not $success) {
    try {
      $parentDir = Split-Path $outDir
      $leaf = Split-Path $outDir -Leaf
      $tempRenameName = "$leaf-old-$([guid]::NewGuid())"
      Rename-Item -Path $outDir -NewName $tempRenameName -Force -ErrorAction Stop
      $tempRenameFullPath = Join-Path $parentDir $tempRenameName
      Remove-Item $tempRenameFullPath -Recurse -Force -ErrorAction SilentlyContinue
      Write-Host "Successfully unblocked build by renaming locked folder to $tempRenameName."
    } catch {
      Write-Warning "Failed fallback rename of locked folder: $_"
    }
  }
}

exit 0
