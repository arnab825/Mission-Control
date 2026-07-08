$ErrorActionPreference = 'Stop'

$src  = "Gaming/backend/dist/MissionControl"
$dest = "Gaming/frontend/backend/MissionControl"
if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null

$roboOutput = robocopy $src $dest /E /NFL /NDL /NJH /nc /ns /np
if ($LASTEXITCODE -ge 8) {
  throw "robocopy failed with exit code $LASTEXITCODE"
}

# Copy developer's local .env file (if present) to the packaged backend folder so it gets bundled
$localEnv = "Gaming/backend/.env"
$packagedEnv = "Gaming/frontend/backend/.env"
if (Test-Path $localEnv) {
  Write-Host "Bundling developer's local .env file..."
  Copy-Item $localEnv $packagedEnv -Force
}

# Bundle issues.json as local fallback for offline telemetry checks
$issuesSrc = "Gaming/website/data/issues.json"
$issuesDest = "Gaming/frontend/backend/MissionControl/data/issues.json"
if (Test-Path $issuesSrc) {
  Write-Host "Bundling issues.json database fallback..."
  New-Item -ItemType Directory -Force -Path (Split-Path $issuesDest) | Out-Null
  Copy-Item $issuesSrc $issuesDest -Force
}

Write-Host "Backend bundled successfully."
exit 0
