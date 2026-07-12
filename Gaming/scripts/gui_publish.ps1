Write-Host "Launching Publisher GUI..." -ForegroundColor Cyan

$publisherDir = Join-Path $PSScriptRoot "..\publisher-gui"

Push-Location $publisherDir
try {
    # Run the dev script which boots Vite and Electron via concurrently
    npm run dev
} finally {
    Pop-Location
}
