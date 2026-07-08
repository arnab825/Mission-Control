# Mission Control - Build Script
# This script bundles the application into a standalone executable with full branding.

$projectName = "MissionControl"
$mainScript = "main.py"
$backendDir = Resolve-Path "$PSScriptRoot\..\backend"
$iconPath = "logo.ico"

Write-Host "[BUILD] Starting packaging for $projectName..." -ForegroundColor Cyan

# Push location to backend directory to run context-sensitively
Push-Location $backendDir

try {
    # Generate logo.ico from frontend logo if missing
    if (-not (Test-Path $iconPath)) {
        Write-Host "[INFO] Generating logo.ico from frontend logo..." -ForegroundColor Yellow
        $pngPath = Resolve-Path "..\frontend\public\logo.png" -ErrorAction SilentlyContinue
        if ($pngPath) {
            # Use Pillow to convert logo.png to logo.ico
            uv run python -c "from PIL import Image; img = Image.open('$($pngPath.Path.Replace('\', '/'))'); img.save('logo.ico', format='ICO', sizes=[(16,16), (32,32), (48,48), (64,64), (128,128), (256,256)])"
        } else {
            Write-Host "[WARNING] Frontend logo.png not found. Packaging without a custom icon." -ForegroundColor Yellow
            $iconPath = $null
        }
    }

    # Install PyInstaller if not present in the uv environment
    $hasPyInstaller = $false
    try {
        $check = uv run pyinstaller --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $hasPyInstaller = $true
        }
    } catch {
        $hasPyInstaller = $false
    }

    if (-not $hasPyInstaller) {
        Write-Host "[INFO] Installing PyInstaller..." -ForegroundColor Cyan
        uv pip install pyinstaller
    }

    Write-Host "[BUILD] Running PyInstaller..." -ForegroundColor Yellow

    $specFile = "MissionControl.spec"
    if (Test-Path $specFile) {
        Write-Host "[BUILD] Using spec file: $specFile (excluding heavy libraries like torch/cuda)..." -ForegroundColor Cyan
        uv run pyinstaller --noconfirm --clean $specFile
    } else {
        # Fallback to default args if spec file is missing
        Write-Host "[WARNING] Spec file not found. Falling back to default PyInstaller args..." -ForegroundColor Yellow
        $pyinstallerArgs = @(
            "--noconsole",
            "--onefile",
            "--clean",
            "--add-data", "version.json;.",
            "--name", $projectName
        )
        if ($iconPath -and (Test-Path $iconPath)) {
            $pyinstallerArgs += @("--icon", $iconPath)
        }
        $pyinstallerArgs += $mainScript
        uv run pyinstaller @pyinstallerArgs
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] PyInstaller build complete!" -ForegroundColor Green
        
        # Check if directory mode (dist/MissionControl) was used
        $distFolder = "dist\MissionControl"
        if (Test-Path $distFolder) {
            $frontendDest = "$PSScriptRoot\..\frontend\backend\MissionControl"
            Write-Host "[SYNC] Copying compiled backend to frontend resources: $frontendDest" -ForegroundColor Cyan
            
            # Clean destination first
            if (Test-Path $frontendDest) {
                Remove-Item $frontendDest -Recurse -Force -ErrorAction SilentlyContinue
            }
            New-Item -ItemType Directory -Force -Path $frontendDest | Out-Null
            
            # Copy all files recursively
            Copy-Item -Path "$distFolder\*" -Destination $frontendDest -Recurse -Force
            Write-Host "[SUCCESS] Compiled backend copied successfully!" -ForegroundColor Green
        } else {
            Write-Host "[INFO] Standalone file mode used. No automatic copy performed." -ForegroundColor Yellow
        }
    } else {
        Write-Host "[FAILURE] Build failed. Check errors above." -ForegroundColor Red
    }
}
finally {
    Pop-Location
}
