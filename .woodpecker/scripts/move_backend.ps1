$ErrorActionPreference = 'Stop'

$src  = "Gaming/backend/dist/MissionControlBackend"
$dest = "Gaming/frontend/backend/MissionControlBackend"

if (Test-Path $dest) {
  # Terminate any orphaned Python, backend, or .NET compiler processes locking assembly DLLs
  try {
    taskkill /f /im MissionControlBackend.exe 2>&1 | Out-Null
    taskkill /f /im python.exe 2>&1 | Out-Null
    taskkill /f /im VBCSCompiler.exe 2>&1 | Out-Null
    taskkill /f /im dotnet.exe 2>&1 | Out-Null
    taskkill /f /im MSBuild.exe 2>&1 | Out-Null
  } catch {}

  # Retry Remove-Item up to 5 times with delay to handle transient filesystem/antivirus locks
  $success = $false
  for ($i = 1; $i -le 5; $i++) {
    try {
      Remove-Item $dest -Recurse -Force -ErrorAction Stop
      $success = $true
      break
    } catch {
      Write-Warning "Attempt $i to remove destination folder failed: $_. Retrying in 1 second..."
      Start-Sleep -Seconds 1
    }
  }
  if (-not $success) {
    # If standard Remove-Item fails, try renaming the folder first (standard Windows lock workaround), then deleting it
    try {
      $destLeaf = Split-Path $dest -Leaf
      $tempRenameName = "$destLeaf-old-$([guid]::NewGuid())"
      Rename-Item -Path $dest -NewName $tempRenameName -Force -ErrorAction Stop
      
      $parentDir = Split-Path $dest
      $tempRenameFullPath = Join-Path $parentDir $tempRenameName
      Remove-Item $tempRenameFullPath -Recurse -Force -ErrorAction SilentlyContinue
    } catch {
      throw "Failed to remove destination folder $dest after multiple retries: $_"
    }
  }
}
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null

$roboOutput = robocopy $src $dest /E /NFL /NDL /NJH /nc /ns /np
if ($LASTEXITCODE -ge 8) {
  throw "robocopy failed with exit code $LASTEXITCODE"
}

# Copy developer's local .env file (if present) to the packaged backend folder so it gets bundled
$localEnv = "Gaming/backend/.env"
if (Test-Path $localEnv) {
  Write-Host "Bundling developer's local .env file..."
  New-Item -ItemType Directory -Force -Path "Gaming/backend/dist/MissionControlBackend" | Out-Null
  New-Item -ItemType Directory -Force -Path "Gaming/frontend/backend/MissionControlBackend" | Out-Null
  Copy-Item $localEnv "Gaming/backend/dist/MissionControlBackend/.env" -Force
  Copy-Item $localEnv "Gaming/frontend/backend/MissionControlBackend/.env" -Force
}

# Bundle issues.json as local fallback for offline telemetry checks
$issuesSrc = "Gaming/website/data/issues.json"
$issuesDest = "Gaming/frontend/backend/MissionControlBackend/data/issues.json"
if (Test-Path $issuesSrc) {
  Write-Host "Bundling issues.json database fallback..."
  New-Item -ItemType Directory -Force -Path (Split-Path $issuesDest) | Out-Null
  Copy-Item $issuesSrc $issuesDest -Force
}

Write-Host "Backend bundled successfully."
exit 0
