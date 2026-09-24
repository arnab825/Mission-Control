# Aero AI Cleanup & Refresh Script
# Use this to resolve build conflicts and clear temp files

Write-Host "[CLEANUP] Starting Aero AI Cleanup..." -ForegroundColor Cyan

# 1. Clear Python Caches
Write-Host "  -> Clearing __pycache__ folders..."
Get-ChildItem -Path . -Filter "__pycache__" -Recurse | Remove-Item -Force -Recurse

# 2. Clear Build/Temp artifacts
Write-Host "  -> Clearing temporary session data..."
if (Test-Path "./data/temp_audio") { Remove-Item "./data/temp_audio/*" -Force }
if (Test-Path "./overlay_pos.json") { Remove-Item "./overlay_pos.json" -Force }

# 3. Clear Frontend build outputs (out/ directory)
$frontendOut = Join-Path $PSScriptRoot "../frontend/out"
if (Test-Path $frontendOut) {
    Write-Host "  -> Clearing frontend build artifacts in frontend/out..."
    Remove-Item $frontendOut -Recurse -Force -ErrorAction SilentlyContinue
}

# 4. Clear Backend build outputs
$backendDist = Join-Path $PSScriptRoot "../backend/dist"
if (Test-Path $backendDist) {
    Write-Host "  -> Clearing backend build artifacts in backend/dist..."
    Remove-Item $backendDist -Recurse -Force -ErrorAction SilentlyContinue
}

$backendBuild = Join-Path $PSScriptRoot "../backend/build"
if (Test-Path $backendBuild) {
    Write-Host "  -> Clearing backend build artifacts in backend/build..."
    Remove-Item $backendBuild -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "[OK] Cleanup Complete! You can now run: uv run python main.py --dev" -ForegroundColor Green
