$ErrorActionPreference = 'Stop'

function Upload-FileWithProgress {
  param (
    [string]$Uri,
    [string]$FilePath,
    [hashtable]$Headers,
    [string]$ContentType
  )

  $fileInfo = Get-Item $FilePath
  $totalBytes = $fileInfo.Length
  $fileStream = [System.IO.File]::OpenRead($FilePath)
  
  $request = [System.Net.HttpWebRequest]::Create($Uri)
  $request.Method = "POST"
  $request.Timeout = 7200000 # 2 hours in ms
  $request.ReadWriteTimeout = 7200000
  $request.ContentLength = $totalBytes
  $request.ContentType = $ContentType
  $request.KeepAlive = $true
  
  foreach ($key in $Headers.Keys) {
    if ($key -eq "Content-Type") { continue }
    if ($key -eq "Accept") {
      $request.Accept = $Headers[$key]
      continue
    }
    $request.Headers.Add($key, $Headers[$key])
  }

  $requestStream = $request.GetRequestStream()
  $buffer = New-Object byte[] 1048576 # 1MB buffer
  $bytesRead = 0
  $totalBytesSent = 0
  $lastReportedPercent = 0

  Write-Host "Starting upload of $($fileInfo.Name) ($([math]::round($totalBytes/1MB, 2)) MB)..."

  $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

  try {
    while (($bytesRead = $fileStream.Read($buffer, 0, $buffer.Length)) -gt 0) {
      $requestStream.Write($buffer, 0, $bytesRead)
      $totalBytesSent += $bytesRead
      
      $percent = [math]::floor(($totalBytesSent / $totalBytes) * 100)
      if ($percent -ge ($lastReportedPercent + 5)) {
        $lastReportedPercent = $percent
        $elapsedSec = $stopwatch.Elapsed.TotalSeconds
        $speedMBs = if ($elapsedSec -gt 0) { ([math]::round(($totalBytesSent / 1MB) / $elapsedSec, 2)) } else { 0 }
        Write-Host "Uploaded: $percent% ($([math]::round($totalBytesSent/1MB, 2)) / $([math]::round($totalBytes/1MB, 2)) MB) | Speed: $speedMBs MB/s"
      }
    }
  } finally {
    $fileStream.Close()
    $requestStream.Close()
  }

  $response = $request.GetResponse()
  $responseStream = $response.GetResponseStream()
  $reader = New-Object System.IO.StreamReader($responseStream)
  $responseBody = $reader.ReadToEnd()
  
  $reader.Close()
  $responseStream.Close()
  $response.Close()
  
  return $responseBody
}


$versionFile = Get-Content 'Gaming/backend/version.json' -Raw | ConvertFrom-Json
$title = $versionFile.changelog[0].title
$version = $versionFile.changelog[0].version
$notes = ($versionFile.changelog[0].highlights | ForEach-Object { "- $_" }) -join "`n"

$tag = $env:CI_COMMIT_TAG
if (-not $tag) { $tag = "v$version" }
$semver = $tag -replace '^v', ''

$releaseDir = 'Gaming/frontend/out/release'
if (Test-Path $releaseDir) {
  Remove-Item -Recurse -Force $releaseDir -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null

$candidatePaths = @(
  'Gaming/frontend/out/make',
  'Gaming/frontend/dist'
)
$sourceInstaller = $null
foreach ($path in $candidatePaths) {
  if (Test-Path $path) {
    $match = Get-ChildItem -Path $path -Filter "*.exe" -Recurse -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -notlike "*out/release*" -and $_.FullName -notlike "*out\release*" -and $_.Name -notlike "*__uninstaller*" -and $_.Name -notlike "*Uninstall*" -and $_.Name -notlike "*builder*" } |
      Sort-Object Length -Descending |
      Select-Object -First 1
    if ($match) {
      $sourceInstaller = $match
      break
    }
  }
}
if (-not $sourceInstaller) {
  throw "Windows installer was not generated in the expected output directories."
}

$targetInstaller = Join-Path $releaseDir 'MissionControl-Setup.exe'
if ((Resolve-Path $sourceInstaller.FullName).Path -ne (Resolve-Path $targetInstaller -ErrorAction SilentlyContinue).Path) {
  Copy-Item $sourceInstaller.FullName $targetInstaller -Force
}

# Check for generated MSI installer
$sourceMsi = Get-ChildItem -Path "Gaming/frontend/out/make", "Gaming/frontend/dist" -Filter "*.msi" -Recurse -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notlike "*out/release*" -and $_.FullName -notlike "*out\release*" } |
  Select-Object -First 1
$targetMsi = $null
if ($sourceMsi) {
  $targetMsi = Join-Path $releaseDir 'MissionControl-Setup.msi'
  if ((Resolve-Path $sourceMsi.FullName).Path -ne (Resolve-Path $targetMsi -ErrorAction SilentlyContinue).Path) {
    Copy-Item $sourceMsi.FullName $targetMsi -Force
  }
  Write-Host "Prepared MSI installer at: $targetMsi"
}

# Check for generated ZIP archive
$sourceZip = Get-ChildItem -Path "Gaming/frontend/out/make", "Gaming/frontend/dist" -Filter "*.zip" -Recurse -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notlike "*out/release*" -and $_.FullName -notlike "*out\release*" } |
  Select-Object -First 1
$targetZip = $null
if ($sourceZip) {
  $targetZip = Join-Path $releaseDir 'MissionControl-Portable.zip'
  if ((Resolve-Path $sourceZip.FullName).Path -ne (Resolve-Path $targetZip -ErrorAction SilentlyContinue).Path) {
    Copy-Item $sourceZip.FullName $targetZip -Force
  }
  Write-Host "Prepared Portable ZIP archive at: $targetZip"
}

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
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($latestYmlPath, ($latestYmlLines -join "`r`n"), $utf8NoBom)

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
    if ($asset.name -like "MissionControl*" -or $asset.name -eq "latest.yml") {
      Write-Host "Deleting existing asset: $($asset.name)..."
      Invoke-RestMethod -Uri $asset.url -Method Delete -Headers $headers
    }
  }
} catch {
  Write-Warning "Could not list or clean up existing assets: $($_.Exception.Message)"
}

$uploadBase = "https://uploads.github.com/repos/$repo/releases/$releaseId/assets"
$uploadHeaders = @{
  Authorization = "Bearer $githubToken"
  Accept = "application/vnd.github.v3+json"
  "X-GitHub-Api-Version" = "2022-11-28"
}

if (-not (Test-Path $targetInstaller)) {
  throw "Installer file not found at: $targetInstaller"
}

Write-Host "Uploading $targetInstaller via Upload-FileWithProgress..."
$installerUrl = "${uploadBase}?name=MissionControl-Setup.exe"
try {
  $uploadResponse = Upload-FileWithProgress -Uri $installerUrl -FilePath $targetInstaller -Headers $uploadHeaders -ContentType "application/octet-stream"
  Write-Host "NSIS Installer uploaded successfully."
} catch {
  Write-Error "Failed to upload NSIS installer: $($_.Exception.Message)"
}

if ($targetMsi -and (Test-Path $targetMsi)) {
  Write-Host "Uploading $targetMsi via Upload-FileWithProgress..."
  $msiUrl = "${uploadBase}?name=MissionControl-Setup.msi"
  try {
    $uploadMsiResponse = Upload-FileWithProgress -Uri $msiUrl -FilePath $targetMsi -Headers $uploadHeaders -ContentType "application/x-msi"
    Write-Host "MSI installer uploaded successfully."
  } catch {
    Write-Warning "Failed to upload MSI installer: $($_.Exception.Message)"
  }
}

if ($targetZip -and (Test-Path $targetZip)) {
  Write-Host "Uploading $targetZip via Upload-FileWithProgress..."
  $zipUrl = "${uploadBase}?name=MissionControl-Portable.zip"
  try {
    $uploadZipResponse = Upload-FileWithProgress -Uri $zipUrl -FilePath $targetZip -Headers $uploadHeaders -ContentType "application/zip"
    Write-Host "Portable ZIP archive uploaded successfully (MissionControl-Portable.zip)."
  } catch {
    Write-Warning "Failed to upload ZIP archive: $($_.Exception.Message)"
  }
}

Write-Host "Uploading latest.yml via Invoke-RestMethod..."
$ymlUrl = "${uploadBase}?name=latest.yml"
try {
  $uploadYmlResponse = Invoke-RestMethod -Uri $ymlUrl -Method Post -Headers $uploadHeaders -InFile $latestYmlPath -ContentType "application/x-yaml"
  Write-Host "latest.yml uploaded successfully."
} catch {
  Write-Error "Failed to upload latest.yml: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Response body: $($reader.ReadToEnd())"
  }
  throw
}

Write-Host "Release published successfully."
