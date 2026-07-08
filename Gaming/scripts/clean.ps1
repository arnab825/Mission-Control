# Aero AI Cleanup & Refresh Script
# Use this to resolve build conflicts and clear temp files

Write-Host "🧹 Starting Aero AI Cleanup..." -ForegroundColor Cyan

# 1. Clear Python Caches
Write-Host "  -> Clearing __pycache__ folders..."
Get-ChildItem -Path . -Filter "__pycache__" -Recurse | Remove-Item -Force -Recurse

# 2. Clear Build/Temp artifacts
Write-Host "  -> Clearing temporary session data..."
if (Test-Path "./data/temp_audio") { Remove-Item "./data/temp_audio/*" -Force }
if (Test-Path "./overlay_pos.json") { Remove-Item "./overlay_pos.json" -Force }

# 3. Clear UV Cache (Optional, use only if dependencies are corrupted)
# Write-Host "  -> Clearing UV cache..."
# uv cache clean

# 4. Refresh Virtual Environment (Optional)
# Write-Host "  -> Syncing dependencies..."
# uv sync

Write-Host "✅ Cleanup Complete! You can now run: uv run python main.py --dev" -ForegroundColor Green
