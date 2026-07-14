$ErrorActionPreference = 'Stop'

# Store caller's directory and switch to script root to ensure paths resolve correctly
Push-Location $PSScriptRoot

# Ensure Woodpecker CLI is downloaded
$cliDir = Join-Path $PSScriptRoot ".woodpecker/bin"
$cliPath = Join-Path $cliDir "woodpecker-cli.exe"

if (-not (Test-Path $cliPath)) {
  Write-Host "Woodpecker CLI not found. Downloading v3.16.0..."
  New-Item -ItemType Directory -Force -Path $cliDir | Out-Null
  
  $url = "https://github.com/woodpecker-ci/woodpecker/releases/download/v3.16.0/woodpecker-cli_windows_amd64.zip"
  $zipPath = Join-Path $cliDir "woodpecker-cli.zip"
  
  Invoke-WebRequest -Uri $url -OutFile $zipPath
  Expand-Archive -Path $zipPath -DestinationPath $cliDir -Force
  Remove-Item $zipPath
  
  # Find the extracted executable and rename it to woodpecker-cli.exe if needed
  $extractedFile = Get-ChildItem $cliDir -Filter "*.exe" | Select-Object -First 1
  if ($extractedFile -and $extractedFile.Name -ne "woodpecker-cli.exe") {
    Rename-Item $extractedFile.FullName "woodpecker-cli.exe"
  }
}

# Ensure GITHUB_TOKEN is available
if (-not $env:GITHUB_TOKEN) {
  $envFiles = @(
    (Join-Path $PSScriptRoot "Gaming\publisher-gui\.env"),
    (Join-Path $PSScriptRoot "Gaming\backend\.env"),
    (Join-Path $PSScriptRoot "Gaming\frontend\.env")
  )
  foreach ($file in $envFiles) {
    if (Test-Path $file) {
      $match = Get-Content $file | Select-String -Pattern '^GITHUB_TOKEN=(.*)$'
      if ($match) {
        $env:GITHUB_TOKEN = $match.Matches.Groups[1].Value.Trim()
        Write-Host "Auto-loaded GITHUB_TOKEN from $file" -ForegroundColor Cyan
        break
      }
    }
  }
}

$githubToken = $env:GITHUB_TOKEN
if (-not $githubToken) {
  $githubToken = Read-Host -Prompt "Enter your GitHub Personal Access Token (GITHUB_TOKEN)"
  if (-not $githubToken) {
    Write-Error "GITHUB_TOKEN is required to release to GitHub."
  }
  $env:GITHUB_TOKEN = $githubToken
}

# Ensure CI_REPO is set
$env:CI_REPO = "arnab825/Mission-Control"

# Auto-detect the tag version from version.json
$tag = $env:CI_COMMIT_TAG
if (-not $tag) {
  $versionPath = Join-Path $PSScriptRoot "Gaming\backend\version.json"
  if (Test-Path $versionPath) {
      $versionData = Get-Content $versionPath | ConvertFrom-Json
      $tag = "v" + $versionData.version
      Write-Host "Auto-detected version tag from version.json: $tag" -ForegroundColor Cyan
  } else {
      $tag = Read-Host -Prompt "Enter the version tag to build (e.g., v1.0.0)"
  }
  
  if (-not $tag) {
    Write-Error "A version tag (e.g. v1.0.0) is required."
  }
  $env:CI_COMMIT_TAG = $tag
}

Write-Host "Running Woodpecker CI pipeline locally using local backend..."
# Run woodpecker-cli exec with correct local engine parameters, event type, git ref, and secrets mapping
try {
  & $cliPath exec --backend-engine local --local --pipeline-event tag --commit-ref "refs/tags/$tag" --secrets github_token="$env:GITHUB_TOKEN" .woodpecker/release.yml
} finally {
  # Clear the commit tag environment variable so subsequent runs in the same PowerShell session will prompt again
  $env:CI_COMMIT_TAG = $null
  Pop-Location
}
