$ErrorActionPreference = 'Stop'

$versionFile = Get-Content 'Gaming/backend/version.json' -Raw | ConvertFrom-Json
$title = $versionFile.changelog[0].title
$version = $versionFile.changelog[0].version
$notes = ($versionFile.changelog[0].highlights | ForEach-Object { "- $_" }) -join "`n"

$tag = $env:CI_COMMIT_TAG
if (-not $tag) { $tag = "v$version" }
$semver = $tag -replace '^v', ''

$candidatePaths = @(
  'Gaming/frontend/out/make',
  'Gaming/frontend/out',
  'Gaming/frontend/out/make/zip'
)
$sourceInstaller = $null
foreach ($path in $candidatePaths) {
  if (Test-Path $path) {
    $match = Get-ChildItem -Path $path -Filter "*$semver*.exe" -Recurse -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -notlike "*__uninstaller*" -and $_.Name -notlike "*Uninstall*" } |
      Sort-Object Length -Descending |
      Select-Object -First 1
    if ($match) {
      $sourceInstaller = $match
      break
    }
  }
}
if (-not $sourceInstaller) {
  throw "Windows installer was not generated in the expected output directories (searched for *$semver*.exe)."
}

$releaseDir = 'Gaming/frontend/out/release'
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null

$targetInstaller = Join-Path $releaseDir 'MissionControl-Setup.exe'
Copy-Item $sourceInstaller.FullName $targetInstaller -Force

$hashBytes = [System.Security.Cryptography.SHA512]::Create().ComputeHash(
  [System.IO.File]::ReadAllBytes($sourceInstaller.FullName)
)
$sha512 = [System.Convert]::ToBase64String($hashBytes)
$fileSize = $sourceInstaller.Length
$releaseDate = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')

$latestYmlLines = @(
  "version: $semver",
  "files:",
  "  - url: MissionControl-Setup.exe",
  "    sha512: $sha512",
  "    size: $fileSize",
  "path: MissionControl-Setup.exe",
  "sha512: $sha512",
  "releaseDate: '$releaseDate'"
)
$latestYmlPath = Join-Path $releaseDir 'latest.yml'
($latestYmlLines -join "`n") | Set-Content $latestYmlPath -Encoding utf8

$githubToken = $env:GITHUB_TOKEN
if (-not $githubToken) {
  Write-Warning "GITHUB_TOKEN not found in environment, skipping release creation."
  exit 0
}

$repo = $env:CI_REPO
if (-not $repo) {
  Write-Warning "CI_REPO not found, cannot determine which repository to publish to."
  exit 0
}

$headers = @{
  Authorization = "Bearer $githubToken"
  Accept = "application/vnd.github.v3+json"
  "X-GitHub-Api-Version" = "2022-11-28"
}

Write-Host "Creating release $tag for $repo..."
$releaseUrl = "https://api.github.com/repos/$repo/releases"
$releaseBody = @{
  tag_name = $tag
  name = "Release ${tag}: $title"
  body = $notes
  draft = $false
  prerelease = $false
} | ConvertTo-Json

$releaseId = $null
try {
  $releaseResponse = Invoke-RestMethod -Uri $releaseUrl -Method Post -Headers $headers -Body $releaseBody -ContentType "application/json"
  $releaseId = $releaseResponse.id
} catch {
  Write-Host "Create release returned an error: $($_.Exception.Message). Checking if release already exists..."
  try {
    $existingRelease = Invoke-RestMethod -Uri "${releaseUrl}/tags/${tag}" -Method Get -Headers $headers
    $releaseId = $existingRelease.id
    Write-Host "Found existing release with ID: $releaseId"
  } catch {
    Write-Host "Could not find existing release: $($_.Exception.Message)"
    if ($_.Exception.Response) {
      $stream = $_.Exception.Response.GetResponseStream()
      $reader = New-Object System.IO.StreamReader($stream)
      Write-Host "Response body: $($reader.ReadToEnd())"
    }
    throw
  }
}

# Clean up existing conflicting assets if they exist
try {
  $assetsUrl = "https://api.github.com/repos/$repo/releases/$releaseId/assets"
  $existingAssets = Invoke-RestMethod -Uri $assetsUrl -Method Get -Headers $headers
  foreach ($asset in $existingAssets) {
    if ($asset.name -eq "MissionControl-Setup.exe" -or $asset.name -eq "latest.yml") {
      Write-Host "Deleting existing asset: $($asset.name)..."
      Invoke-RestMethod -Uri $asset.url -Method Delete -Headers $headers
    }
  }
} catch {
  Write-Warning "Could not list or clean up existing assets: $($_.Exception.Message)"
}

$uploadBase = "https://uploads.github.com/repos/$repo/releases/$releaseId/assets"

if (-not (Test-Path $targetInstaller)) {
  throw "Installer file not found at: $targetInstaller"
}

Write-Host "Uploading $targetInstaller via curl..."
$installerUrl = "${uploadBase}?name=MissionControl-Setup.exe"
$curlArgs = @(
  "-s", "-S",
  "--ssl-no-revoke",
  "-X", "POST",
  "-H", "Authorization: Bearer $githubToken",
  "-H", "Accept: application/vnd.github.v3+json",
  "-H", "Content-Type: application/octet-stream",
  "--data-binary", "@$targetInstaller",
  $installerUrl
)
& curl.exe @curlArgs
if ($LASTEXITCODE -ne 0) {
  throw "curl failed to upload installer with exit code $LASTEXITCODE"
}

Write-Host "Uploading latest.yml via curl..."
$ymlUrl = "${uploadBase}?name=latest.yml"
$curlYmlArgs = @(
  "-s", "-S",
  "--ssl-no-revoke",
  "-X", "POST",
  "-H", "Authorization: Bearer $githubToken",
  "-H", "Accept: application/vnd.github.v3+json",
  "-H", "Content-Type: application/x-yaml",
  "--data-binary", "@$latestYmlPath",
  $ymlUrl
)
& curl.exe @curlYmlArgs
if ($LASTEXITCODE -ne 0) {
  throw "curl failed to upload latest.yml with exit code $LASTEXITCODE"
}

Write-Host "Release published successfully."
