# Ensure TLS 1.2 / 1.3 is enabled and configure ServicePointManager connection defaults
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 -bor [System.Net.SecurityProtocolType]::Tls13
[System.Net.ServicePointManager]::Expect100Continue = $false
[System.Net.ServicePointManager]::DefaultConnectionLimit = 20

function Remove-AssetByName {
  param(
    [string]$Repo,
    [string]$ReleaseId,
    [string]$AssetName,
    [hashtable]$Headers
  )
  try {
    $assetsUrl = "https://api.github.com/repos/$Repo/releases/$ReleaseId/assets"
    $existingAssets = Invoke-RestMethod -Uri $assetsUrl -Method Get -Headers $Headers -ErrorAction SilentlyContinue
    if ($existingAssets) {
      foreach ($asset in $existingAssets) {
        if ($asset.name -eq $AssetName) {
          Write-Host "Cleaning up existing/incomplete asset record: $($asset.name) (ID: $($asset.id))..." -ForegroundColor DarkYellow
          Invoke-RestMethod -Uri $asset.url -Method Delete -Headers $Headers -ErrorAction SilentlyContinue
          Start-Sleep -Milliseconds 500
        }
      }
    }
  } catch {
    Write-Warning "Could not check/remove asset ${AssetName}: $($_.Exception.Message)"
  }
}

function Upload-FileWithCurl {
  param (
    [string]$Uri,
    [string]$FilePath,
    [string]$Token,
    [string]$ContentType
  )
  $curlExe = Get-Command curl.exe -ErrorAction SilentlyContinue
  if (-not $curlExe) { return $null }

  $fileInfo = Get-Item $FilePath
  $totalBytes = $fileInfo.Length
  $mb = [math]::round($totalBytes / 1MB, 2)
  Write-Host "Starting upload of $($fileInfo.Name) ($mb MB) via curl.exe (libcurl stream)..."

  $outputFile = [System.IO.Path]::GetTempFileName()
  try {
    $curlArgs = @(
      "-#",
      "-X", "POST",
      $Uri,
      "-H", "Authorization: Bearer $Token",
      "-H", "Content-Type: $ContentType",
      "-H", "Accept: application/vnd.github.v3+json",
      "-H", "X-GitHub-Api-Version: 2022-11-28",
      "--data-binary", "@$FilePath",
      "--retry", "3",
      "--retry-delay", "5",
      "--retry-all-errors",
      "--connect-timeout", "60",
      "--max-time", "7200",
      "--write-out", "`n%{http_code}",
      "-o", $outputFile
    )
    $output = & curl.exe @curlArgs 2>&1
    $httpCode = 0
    if ($output) {
      $lines = ($output | Out-String).Trim() -split "`r?`n"
      $codeStr = $lines[-1].Trim()
      [int]::TryParse($codeStr, [ref]$httpCode) | Out-Null
    }
    $responseBody = if (Test-Path $outputFile) { Get-Content $outputFile -Raw } else { "" }
    
    if ($httpCode -ge 200 -and $httpCode -lt 300) {
      Write-Host "Upload of $($fileInfo.Name) completed successfully (HTTP $httpCode)." -ForegroundColor Green
      return $responseBody
    } else {
      throw "curl.exe upload failed with HTTP status ${httpCode} - $responseBody"
    }
  } finally {
    if (Test-Path $outputFile) { Remove-Item -Force $outputFile -ErrorAction SilentlyContinue }
  }
}

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
  $request.KeepAlive = $false
  $request.AllowWriteStreamBuffering = $false
  
  foreach ($key in $Headers.Keys) {
    if ($key -eq "Content-Type") { continue }
    if ($key -eq "Accept") {
      $request.Accept = $Headers[$key]
      continue
    }
    $request.Headers.Add($key, $Headers[$key])
  }

  $requestStream = $request.GetRequestStream()
  $buffer = New-Object byte[] 4194304 # 4MB buffer
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
      if ($percent -ge ($lastReportedPercent + 10)) {
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

function Upload-AssetWithRetry {
  param (
    [string]$UploadBaseUrl,
    [string]$AssetName,
    [string]$FilePath,
    [hashtable]$Headers,
    [string]$ContentType,
    [string]$Repo,
    [string]$ReleaseId,
    [string]$Token,
    [int]$MaxRetries = 4
  )

  for ($attempt = 1; $attempt -le $MaxRetries; $attempt++) {
    try {
      # Always clean up any existing or partial asset before uploading to avoid 422 or connection drops
      Remove-AssetByName -Repo $Repo -ReleaseId $ReleaseId -AssetName $AssetName -Headers $Headers
      if ($attempt -gt 1) {
        $backoff = $attempt * 5
        Write-Host "Retry attempt $attempt of $MaxRetries for $AssetName (waiting ${backoff}s)..." -ForegroundColor Yellow
        Start-Sleep -Seconds $backoff
      }

      $url = "${UploadBaseUrl}?name=${AssetName}"
      
      # Try .NET HttpWebRequest first with active chunked progress logs (keeps CI runner alive)
      try {
        $response = Upload-FileWithProgress -Uri $url -FilePath $FilePath -Headers $Headers -ContentType $ContentType
        if ($response) {
          Write-Host "$AssetName uploaded successfully." -ForegroundColor Green
          return $response
        }
      } catch {
        Write-Warning "Upload-FileWithProgress failed ($($_.Exception.Message)). Trying curl.exe fallback..."
      }

      # Fallback to curl.exe with progress bar
      if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
        $authToken = if ($Token) { $Token } else { $Headers["Authorization"] -replace '^Bearer\s+', '' }
        $response = Upload-FileWithCurl -Uri $url -FilePath $FilePath -Token $authToken -ContentType $ContentType
        if ($response) {
          Write-Host "$AssetName uploaded successfully." -ForegroundColor Green
          return $response
        }
      }
    } catch {
      Write-Warning "Attempt $attempt failed uploading ${AssetName}: $($_.Exception.Message)"
      if ($attempt -eq $MaxRetries) {
        throw $_
      }
    }
  }
}


$versionFile = Get-Content 'Gaming/backend/version.json' -Raw | ConvertFrom-Json
$title = $versionFile.changelog[0].title
$version = $versionFile.changelog[0].version
$notes = ($versionFile.changelog[0].highlights | ForEach-Object { "- $_" }) -join "`n"

$tag = $env:CI_COMMIT_TAG
if (-not $tag) { $tag = "v$version" }
$semver = $tag -replace '^v', ''

$releaseDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../../Gaming/frontend/out/release"))
if (Test-Path $releaseDir) {
  try {
    taskkill /f /im MissionControl-Setup.exe 2>&1 | Out-Null
    taskkill /f /im MissionControl-Setup.msi 2>&1 | Out-Null
  } catch {}
  
  $success = $false
  for ($i = 1; $i -le 5; $i++) {
    try {
      Remove-Item -Recurse -Force $releaseDir -ErrorAction Stop
      $success = $true
      break
    } catch {
      Write-Warning "Attempt $i to remove release folder failed: $_. Retrying in 1 second..."
      Start-Sleep -Seconds 1
    }
  }
  if (-not $success) {
    try {
      $destLeaf = Split-Path $releaseDir -Leaf
      $tempRenameName = "$destLeaf-old-$([guid]::NewGuid())"
      Rename-Item -Path $releaseDir -NewName $tempRenameName -Force -ErrorAction Stop
      $parentDir = Split-Path $releaseDir
      Remove-Item (Join-Path $parentDir $tempRenameName) -Recurse -Force -ErrorAction SilentlyContinue
    } catch {
      Write-Warning "Failed to delete releaseDir fallback rename: $_"
    }
  }
}
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null

$candidatePaths = @(
  [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../../Gaming/frontend/out/dist")),
  [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../../Gaming/frontend/out/make")),
  [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../../Gaming/frontend/dist")),
  [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../../Gaming/frontend/out"))
)
$sourceInstaller = $null
foreach ($path in $candidatePaths) {
  if (Test-Path $path) {
    $match = Get-ChildItem -Path $path -Filter "*.exe" -Recurse -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -notlike "*out/release*" -and $_.FullName -notlike "*out\release*" -and $_.Name -notlike "*__uninstaller*" -and $_.Name -notlike "*Uninstall*" -and $_.Name -notlike "*builder*" } |
      Sort-Object LastWriteTime -Descending |
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
$sourceMsi = Get-ChildItem -Path $candidatePaths -Filter "*.msi" -Recurse -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notlike "*out/release*" -and $_.FullName -notlike "*out\release*" } |
  Sort-Object LastWriteTime -Descending |
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
$sourceZip = Get-ChildItem -Path $candidatePaths -Filter "*.zip" -Recurse -ErrorAction SilentlyContinue |
  Where-Object { 
    $_.FullName -notlike "*out/release*" -and 
    $_.FullName -notlike "*out\release*" -and 
    $_.FullName -notlike "*_internal*" -and 
    $_.FullName -notlike "*win-unpacked*" -and 
    $_.Name -ne "base_library.zip" 
  } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
$targetZip = $null
if ($sourceZip) {
  $targetZip = Join-Path $releaseDir 'MissionControl-Portable.zip'
  if ((Resolve-Path $sourceZip.FullName).Path -ne (Resolve-Path $targetZip -ErrorAction SilentlyContinue).Path) {
    Copy-Item $sourceZip.FullName $targetZip -Force
  }
  Write-Host "Prepared Portable ZIP archive at: $targetZip"
}

# Check for generated Linux Debian (.deb) package
$sourceDeb = Get-ChildItem -Path $candidatePaths -Filter "*.deb" -Recurse -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notlike "*out/release*" -and $_.FullName -notlike "*out\release*" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
$targetDeb = $null
if ($sourceDeb) {
  $targetDeb = Join-Path $releaseDir "MissionControl-Linux-$semver.deb"
  if ((Resolve-Path $sourceDeb.FullName).Path -ne (Resolve-Path $targetDeb -ErrorAction SilentlyContinue).Path) {
    Copy-Item $sourceDeb.FullName $targetDeb -Force
  }
  Write-Host "Prepared Linux Debian (.deb) package at: $targetDeb"
}

# Check for generated Linux AppImage
$sourceAppImage = Get-ChildItem -Path $candidatePaths -Filter "*.AppImage" -Recurse -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notlike "*out/release*" -and $_.FullName -notlike "*out\release*" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
$targetAppImage = $null
if ($sourceAppImage) {
  $targetAppImage = Join-Path $releaseDir "MissionControl-Linux-$semver.AppImage"
  if ((Resolve-Path $sourceAppImage.FullName).Path -ne (Resolve-Path $targetAppImage -ErrorAction SilentlyContinue).Path) {
    Copy-Item $sourceAppImage.FullName $targetAppImage -Force
  }
  Write-Host "Prepared Linux AppImage at: $targetAppImage"
}

# Check for generated Linux RPM package
$sourceRpm = Get-ChildItem -Path $candidatePaths -Filter "*.rpm" -Recurse -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notlike "*out/release*" -and $_.FullName -notlike "*out\release*" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
$targetRpm = $null
if ($sourceRpm) {
  $targetRpm = Join-Path $releaseDir "MissionControl-Linux-$semver.rpm"
  if ((Resolve-Path $sourceRpm.FullName).Path -ne (Resolve-Path $targetRpm -ErrorAction SilentlyContinue).Path) {
    Copy-Item $sourceRpm.FullName $targetRpm -Force
  }
  Write-Host "Prepared Linux RPM package at: $targetRpm"
}

# Check for generated Linux Standalone Tarball (.tar.gz)
$sourceLinuxTar = Get-ChildItem -Path $candidatePaths -Filter "*.tar.gz" -Recurse -ErrorAction SilentlyContinue |
  Where-Object { 
    $_.FullName -notlike "*out/release*" -and 
    $_.FullName -notlike "*out\release*" -and 
    $_.FullName -notlike "*node_modules*"
  } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
$targetLinuxTar = $null
if ($sourceLinuxTar) {
  $targetLinuxTar = Join-Path $releaseDir "MissionControl-Linux-$semver.tar.gz"
  if ((Resolve-Path $sourceLinuxTar.FullName).Path -ne (Resolve-Path $targetLinuxTar -ErrorAction SilentlyContinue).Path) {
    Copy-Item $sourceLinuxTar.FullName $targetLinuxTar -Force
  }
  Write-Host "Prepared Linux standalone tarball at: $targetLinuxTar"
}

# Check for generated latest-linux.yml
$sourceLinuxYml = Get-ChildItem -Path $candidatePaths -Filter "latest-linux.yml" -Recurse -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notlike "*out/release*" -and $_.FullName -notlike "*out\release*" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
$targetLinuxYml = $null
if ($sourceLinuxYml) {
  $targetLinuxYml = Join-Path $releaseDir "latest-linux.yml"
  if ((Resolve-Path $sourceLinuxYml.FullName).Path -ne (Resolve-Path $targetLinuxYml -ErrorAction SilentlyContinue).Path) {
    Copy-Item $sourceLinuxYml.FullName $targetLinuxYml -Force
  }
  Write-Host "Prepared latest-linux.yml at: $targetLinuxYml"
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

$releaseBodyMarkdown = @"
$notes

### 📦 Available Downloads & Formats
- **Linux (.deb - Debian / Ubuntu / Mint)**: [MissionControl-Linux-${semver}.deb](https://github.com/${repo}/releases/download/${tag}/MissionControl-Linux-${semver}.deb)
- **Linux (.AppImage - Universal Linux)**: [MissionControl-Linux-${semver}.AppImage](https://github.com/${repo}/releases/download/${tag}/MissionControl-Linux-${semver}.AppImage)
- **Linux (.rpm - Fedora / RHEL / openSUSE)**: [MissionControl-Linux-${semver}.rpm](https://github.com/${repo}/releases/download/${tag}/MissionControl-Linux-${semver}.rpm)
- **Linux (.tar.gz - Standalone Linux Archive)**: [MissionControl-Linux-${semver}.tar.gz](https://github.com/${repo}/releases/download/${tag}/MissionControl-Linux-${semver}.tar.gz)
- **Windows (.exe - Setup Installer)**: [MissionControl-Setup.exe](https://github.com/${repo}/releases/download/${tag}/MissionControl-Setup.exe)
- **Windows (.msi - Enterprise Installer)**: [MissionControl-Setup.msi](https://github.com/${repo}/releases/download/${tag}/MissionControl-Setup.msi)
- **Windows (.zip - Portable Windows Archive)**: [MissionControl-Portable.zip](https://github.com/${repo}/releases/download/${tag}/MissionControl-Portable.zip)
"@

Write-Host "Creating release $tag for $repo..."
$releaseUrl = "https://api.github.com/repos/$repo/releases"
$releaseBodyJson = @{
  tag_name = $tag
  name = "Release ${tag}: $title"
  body = $releaseBodyMarkdown
  draft = $false
  prerelease = $false
} | ConvertTo-Json -Depth 10

$releaseBodyBytes = [System.Text.Encoding]::UTF8.GetBytes($releaseBodyJson)

$releaseId = $null
try {
  $releaseResponse = Invoke-RestMethod -Uri $releaseUrl -Method Post -Headers $headers -Body $releaseBodyBytes -ContentType "application/json; charset=utf-8"
  $releaseId = $releaseResponse.id
} catch {
  Write-Host "Create release returned an error: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "POST Response body: $($reader.ReadToEnd())"
  }
  Write-Host "Checking if release already exists..."
  try {
    $existingRelease = Invoke-RestMethod -Uri "${releaseUrl}/tags/${tag}" -Method Get -Headers $headers
    $releaseId = $existingRelease.id
    Write-Host "Found existing release with ID: $releaseId"
    # Update release body
    $updateData = @{ body = $releaseBodyMarkdown; name = "Release ${tag}: $title"; draft = $false } | ConvertTo-Json -Depth 10
    $updateBytes = [System.Text.Encoding]::UTF8.GetBytes($updateData)
    Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/$releaseId" -Method Patch -Headers $headers -Body $updateBytes -ContentType "application/json; charset=utf-8" | Out-Null
  } catch {
    Write-Host "Could not find existing release: $($_.Exception.Message)"
    if ($_.Exception.Response) {
      $stream = $_.Exception.Response.GetResponseStream()
      $reader = New-Object System.IO.StreamReader($stream)
      Write-Host "GET Response body: $($reader.ReadToEnd())"
    }
    throw
  }
}

# Clean up existing conflicting assets if they exist
try {
  $assetsUrl = "https://api.github.com/repos/$repo/releases/$releaseId/assets"
  $existingAssets = Invoke-RestMethod -Uri $assetsUrl -Method Get -Headers $headers
  foreach ($asset in $existingAssets) {
    if ($asset.name -like "MissionControl*" -or $asset.name -like "*latest*.yml") {
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

# 1. Windows Installer (.exe)
Write-Host "Uploading $targetInstaller via Upload-AssetWithRetry..."
try {
  $uploadResponse = Upload-AssetWithRetry -UploadBaseUrl $uploadBase -AssetName "MissionControl-Setup.exe" -FilePath $targetInstaller -Headers $uploadHeaders -ContentType "application/octet-stream" -Repo $repo -ReleaseId $releaseId -Token $githubToken
} catch {
  Write-Error "Failed to upload NSIS installer: $($_.Exception.Message)"
}

# 2. Windows MSI (.msi)
if ($targetMsi -and (Test-Path $targetMsi)) {
  Write-Host "Uploading $targetMsi via Upload-AssetWithRetry..."
  try {
    $uploadMsiResponse = Upload-AssetWithRetry -UploadBaseUrl $uploadBase -AssetName "MissionControl-Setup.msi" -FilePath $targetMsi -Headers $uploadHeaders -ContentType "application/x-msi" -Repo $repo -ReleaseId $releaseId -Token $githubToken
  } catch {
    Write-Warning "Failed to upload MSI installer: $($_.Exception.Message)"
  }
}

# 3. Windows Portable ZIP (.zip)
if ($targetZip -and (Test-Path $targetZip)) {
  Write-Host "Uploading $targetZip via Upload-AssetWithRetry..."
  try {
    $uploadZipResponse = Upload-AssetWithRetry -UploadBaseUrl $uploadBase -AssetName "MissionControl-Portable.zip" -FilePath $targetZip -Headers $uploadHeaders -ContentType "application/zip" -Repo $repo -ReleaseId $releaseId -Token $githubToken
  } catch {
    Write-Warning "Failed to upload ZIP archive: $($_.Exception.Message)"
  }
}

# 4. Linux Debian (.deb)
if ($targetDeb -and (Test-Path $targetDeb)) {
  Write-Host "Uploading $targetDeb via Upload-AssetWithRetry..."
  try {
    $uploadDebResponse = Upload-AssetWithRetry -UploadBaseUrl $uploadBase -AssetName "MissionControl-Linux-$semver.deb" -FilePath $targetDeb -Headers $uploadHeaders -ContentType "application/vnd.debian.binary-package" -Repo $repo -ReleaseId $releaseId -Token $githubToken
  } catch {
    Write-Warning "Failed to upload Debian package: $($_.Exception.Message)"
  }
}

# 5. Linux AppImage (.AppImage)
if ($targetAppImage -and (Test-Path $targetAppImage)) {
  Write-Host "Uploading $targetAppImage via Upload-AssetWithRetry..."
  try {
    $uploadAppImageResponse = Upload-AssetWithRetry -UploadBaseUrl $uploadBase -AssetName "MissionControl-Linux-$semver.AppImage" -FilePath $targetAppImage -Headers $uploadHeaders -ContentType "application/octet-stream" -Repo $repo -ReleaseId $releaseId -Token $githubToken
  } catch {
    Write-Warning "Failed to upload AppImage: $($_.Exception.Message)"
  }
}

# 6. Linux RPM (.rpm)
if ($targetRpm -and (Test-Path $targetRpm)) {
  Write-Host "Uploading $targetRpm via Upload-AssetWithRetry..."
  try {
    $uploadRpmResponse = Upload-AssetWithRetry -UploadBaseUrl $uploadBase -AssetName "MissionControl-Linux-$semver.rpm" -FilePath $targetRpm -Headers $uploadHeaders -ContentType "application/x-rpm" -Repo $repo -ReleaseId $releaseId -Token $githubToken
  } catch {
    Write-Warning "Failed to upload RPM package: $($_.Exception.Message)"
  }
}

# 7. Linux Standalone Tarball (.tar.gz)
if ($targetLinuxTar -and (Test-Path $targetLinuxTar)) {
  Write-Host "Uploading $targetLinuxTar via Upload-AssetWithRetry..."
  try {
    $uploadTarResponse = Upload-AssetWithRetry -UploadBaseUrl $uploadBase -AssetName "MissionControl-Linux-$semver.tar.gz" -FilePath $targetLinuxTar -Headers $uploadHeaders -ContentType "application/gzip" -Repo $repo -ReleaseId $releaseId -Token $githubToken
  } catch {
    Write-Warning "Failed to upload Linux tar.gz: $($_.Exception.Message)"
  }
}

# 8. Windows Auto-Update metadata (latest.yml)
Write-Host "Uploading latest.yml via Upload-AssetWithRetry..."
try {
  $uploadYmlResponse = Upload-AssetWithRetry -UploadBaseUrl $uploadBase -AssetName "latest.yml" -FilePath $latestYmlPath -Headers $uploadHeaders -ContentType "application/x-yaml" -Repo $repo -ReleaseId $releaseId -Token $githubToken
} catch {
  Write-Error "Failed to upload latest.yml: $($_.Exception.Message)"
  throw
}

# 9. Linux Auto-Update metadata (latest-linux.yml)
if ($targetLinuxYml -and (Test-Path $targetLinuxYml)) {
  Write-Host "Uploading latest-linux.yml via Upload-AssetWithRetry..."
  try {
    $uploadLinuxYmlResponse = Upload-AssetWithRetry -UploadBaseUrl $uploadBase -AssetName "latest-linux.yml" -FilePath $targetLinuxYml -Headers $uploadHeaders -ContentType "application/x-yaml" -Repo $repo -ReleaseId $releaseId -Token $githubToken
  } catch {
    Write-Warning "Failed to upload latest-linux.yml: $($_.Exception.Message)"
  }
}

Write-Host "Release published successfully with all multiplatform assets."


