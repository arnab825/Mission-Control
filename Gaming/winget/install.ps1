param (
    [ValidateSet('Validate', 'Install', 'UpdateHash', 'Help')]
    [string]$Action = 'Validate',

    [string]$Version = '3.7.9'
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RootDir = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$MultiManifestDir = Join-Path $ScriptDir "manifests\a\arnab825\MissionControl\$Version"
$SingletonManifest = Join-Path $ScriptDir "arnab825.MissionControl.singleton.yaml"
$SetupExe = Join-Path $RootDir "Gaming\frontend\out\dist\MissionControl-Setup.exe"

function Check-Winget {
    $winget = Get-Command "winget" -ErrorAction SilentlyContinue
    if (-not $winget) {
        Write-Error "Winget (Windows Package Manager) is not installed or not in PATH."
    }
    $ver = & winget --version
    Write-Host "[OK] Winget detected: $ver" -ForegroundColor Green
}

function Test-Manifests {
    Check-Winget
    Write-Host ""
    Write-Host "=== Validating Multi-Manifest Directory ===" -ForegroundColor Cyan
    Write-Host "Target: $MultiManifestDir" -ForegroundColor Gray
    if (Test-Path $MultiManifestDir) {
        & winget validate --manifest $MultiManifestDir
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Multi-Manifest passed validation!" -ForegroundColor Green
        } else {
            Write-Warning "Multi-Manifest validation reported issues."
        }
    } else {
        Write-Warning "Multi-Manifest directory not found for version $Version."
    }

    Write-Host ""
    Write-Host "=== Validating Standalone Singleton Manifest ===" -ForegroundColor Cyan
    Write-Host "Target: $SingletonManifest" -ForegroundColor Gray
    if (Test-Path $SingletonManifest) {
        & winget validate --manifest $SingletonManifest
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Singleton Manifest passed validation!" -ForegroundColor Green
        } else {
            Write-Warning "Singleton Manifest validation reported issues."
        }
    }
}

function Install-App {
    Check-Winget
    Write-Host ""
    Write-Host "=== Installing Mission Control via Winget Manifest ===" -ForegroundColor Cyan
    $target = if (Test-Path $MultiManifestDir) { $MultiManifestDir } else { $SingletonManifest }
    Write-Host "Using manifest: $target" -ForegroundColor Yellow
    & winget install --manifest $target --accept-package-agreements --accept-source-agreements --force
}

function Update-Hash {
    if (-not (Test-Path $SetupExe)) {
        Write-Error "Setup executable not found at: $SetupExe. Please build with npm run make:win first."
    }

    Write-Host ""
    Write-Host "=== Computing SHA256 for MissionControl-Setup.exe ===" -ForegroundColor Cyan
    $hash = (Get-FileHash -Path $SetupExe -Algorithm SHA256).Hash.ToUpper()
    Write-Host "Binary: $SetupExe" -ForegroundColor Gray
    Write-Host "SHA256: $hash" -ForegroundColor Green

    # Update Multi-Manifest Installer YAML
    $installerYaml = Join-Path $MultiManifestDir "arnab825.MissionControl.installer.yaml"
    if (Test-Path $installerYaml) {
        $content = Get-Content -Path $installerYaml -Raw
        $content = $content -replace "InstallerSha256:\s*[A-Fa-f0-9]{64}", "InstallerSha256: $hash"
        Set-Content -Path $installerYaml -Value $content -NoNewline
        Write-Host "Updated SHA256 in $installerYaml" -ForegroundColor Green
    }

    # Update Singleton Manifest YAML
    if (Test-Path $SingletonManifest) {
        $content = Get-Content -Path $SingletonManifest -Raw
        $content = $content -replace "InstallerSha256:\s*[A-Fa-f0-9]{64}", "InstallerSha256: $hash"
        Set-Content -Path $SingletonManifest -Value $content -NoNewline
        Write-Host "Updated SHA256 in $SingletonManifest" -ForegroundColor Green
    }
}

switch ($Action) {
    'Validate'   { Test-Manifests }
    'Install'    { Install-App }
    'UpdateHash' { Update-Hash }
    'Help'       {
        Write-Host "Mission Control Winget Setup Utilities:"
        Write-Host "  .\install.ps1 -Action Validate    - Validates Winget manifests using Microsoft Winget schema validator"
        Write-Host "  .\install.ps1 -Action Install     - Installs Mission Control locally using winget install --manifest"
        Write-Host "  .\install.ps1 -Action UpdateHash  - Re-computes SHA256 of frontend/out/dist/MissionControl-Setup.exe and writes to manifests"
        Write-Host ""
        Write-Host "To submit to the official Windows Package Manager Community Repository (microsoft/winget-pkgs):"
        Write-Host "  1. Install wingetcreate: winget install Microsoft.WingetCreate"
        Write-Host "  2. Submit release: wingetcreate submit https://github.com/arnab825/Mission-Control/releases/download/v$($Version)/MissionControl-Setup.exe"
    }
}
