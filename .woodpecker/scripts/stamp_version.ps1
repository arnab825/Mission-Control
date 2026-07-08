$ErrorActionPreference = 'Stop'

$tag = $env:CI_COMMIT_TAG
if (-not $tag) {
  Write-Host "CI_COMMIT_TAG not set, skipping version stamp."
  exit 0
}
$version = $tag -replace '^v', ''
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

# 1. Stamp package.json
$pkgPath = 'Gaming/frontend/package.json'
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
$pkg.version = $version
[System.IO.File]::WriteAllText((Resolve-Path $pkgPath).Path, ($pkg | ConvertTo-Json -Depth 10), $utf8NoBom)
Write-Host "Set package.json version to $version"

# 2. Stamp backend/version.json
$versionPath = 'Gaming/backend/version.json'
if (Test-Path $versionPath) {
  $verJson = Get-Content $versionPath -Raw | ConvertFrom-Json
  $verJson.version = $version
  if ($verJson.changelog -and $verJson.changelog.Count -gt 0) {
    $verJson.changelog[0].version = $version
  }
  [System.IO.File]::WriteAllText((Resolve-Path $versionPath).Path, ($verJson | ConvertTo-Json -Depth 10), $utf8NoBom)
  Write-Host "Set version.json version to $version"
}
